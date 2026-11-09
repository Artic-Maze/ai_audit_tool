"use client";

import { useEffect, useRef } from "react";
import styles from "./climbing-robot.module.css";

/*
 * A small robot mascot hanging from a rope in the right margin of every
 * page, drawn with Three.js (components/robot-model.js, loaded on demand).
 *
 * - Scrolling down, it climbs down hand under hand; scrolling fast, it
 *   slides, with sparks and speed lines. Scrolling up, it climbs back up.
 * - When the page stops, it holds on, looks around, blinks and swings a
 *   leg now and then. Hovering over it (or clicking it) makes it wave.
 * - At the bottom of the page it sits on the floor by the rope and waves.
 *
 * It's rendered once, in the root layout, and covers its nearest positioned
 * ancestor (<body>), so that has to span the whole page. Every pose value
 * eases toward the current mode's target, so changes of mode never jump,
 * and the loop sleeps between idle moments.
 */

// Where the robot hangs at the top of the page, and how far above the bottom
// of the page it stops. The position is the anchor: the point on the rope
// level with the centre of the head.
const START_TOP = 90;
const END_GAP = 320;
// At the very bottom it sits on the floor: the hips are PELVIS px below the
// anchor, and the floor is FLOOR px above the bottom of the page.
const PELVIS = 87;
const FLOOR = 26;
// Climbing speed in px per frame, down and up. When the page runs more than
// SLIDE_GAP px ahead of the robot (a fast scroll down), it slides to catch
// up instead, until it's within SLIDE_END px.
const CLIMB_DOWN = 4;
const CLIMB_UP = 5;
const SLIDE_GAP = 220;
const SLIDE_END = 40;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

// The resting pose: the high hand grips the rope beside the head (hiY) and
// the other grips it at chest height (loY), feet A and B wrap the rope.
// Angles in degrees, positions in px from the anchor (y up).
const REST = {
  hiY: 2,
  loY: -46,
  bob: 0,
  swing: 0,
  yaw: 22,
  headYaw: -10,
  headPitch: 0,
  headRoll: 0,
  eyes: 1,
  fAx: -4,
  fAy: -126,
  fAz: 12,
  fBx: -12,
  fBy: -134,
  fBz: -6,
  sit: 0,
  rest: 0,
  wave: 0,
  fly: 0,
  thrust: 0,
};

// The pose a mode aims for. `phase` grows with the distance travelled and
// drives the climbing cycle; `look` and `kick` are the seconds and progress
// (0 to 1) of an idle look around and leg swing, or null; `caught` is the
// seconds since it grabbed the rope after flying, or null.
function poseFor({ mode, phase, vel, waving, look, kick, blink, caught }) {
  const t = { ...REST, eyes: blink ? 0.15 : 1 };

  if (mode === "up" || mode === "down") {
    // Hand over hand, feet stepping in turn. Climbing down runs the same
    // cycle the other way.
    const c = mode === "up" ? Math.sin(phase) : -Math.sin(phase);
    Object.assign(t, {
      hiY: 2 + 10 * c,
      loY: -46 - 10 * c,
      bob: 2 * Math.abs(c),
      swing: clamp(-vel * 0.6, -4, 4),
      fAy: -128 + 12 * c,
      fAz: 12 + 8 * Math.max(0, c),
      fBy: -132 - 12 * c,
      fBz: -6 + 8 * Math.max(0, -c),
      headPitch: mode === "up" ? 10 : -10,
    });
  } else if (mode === "fly") {
    // Jetpack on, hands off the rope, looking up where it's going.
    Object.assign(t, { fly: 1, thrust: 1, yaw: 10, headPitch: 14 });
  } else if (mode === "slide") {
    Object.assign(t, {
      hiY: 12,
      loY: -10,
      swing: clamp(-vel * 0.3, -4, 4),
      yaw: 14,
      fAx: -3,
      fAy: -136,
      fAz: 6,
      fBx: -8,
      fBy: -138,
      fBz: -4,
      headPitch: -8,
    });
  } else if (mode === "sit") {
    // On the floor, knees up, one hand still on the rope.
    const dangle = kick === null ? 0 : 6 * Math.sin(2 * Math.PI * kick);
    Object.assign(t, {
      hiY: -18,
      yaw: 10,
      sit: 1,
      rest: 1,
      fAx: -20,
      fAy: -81,
      fAz: 30 + dangle,
      fBx: -46,
      fBy: -81,
      fBz: 34 - dangle,
      headRoll: 6,
    });
  } else {
    // Idle: look one way, then the other, then back; swing a leg.
    if (look !== null) t.headYaw = look < 1 ? -40 : look < 2 ? 22 : -10;
    if (kick !== null) {
      t.fBz += 18 * Math.sin(Math.PI * kick);
      t.fBy += 8 * Math.sin(Math.PI * kick);
    }
  }

  // Just grabbed the rope after flying: a little dangle that dies away.
  if (caught !== null) {
    t.swing += 7 * Math.exp(-3 * caught) * Math.sin(9 * caught);
  }

  if (waving) {
    // Let go with the lower hand and wave it, facing the visitor.
    t.wave = 1;
    t.rest = 0;
    t.yaw = mode === "sit" ? 10 : 12;
    t.headYaw = -t.yaw;
    t.headPitch = 4;
    t.headRoll = 6;
  }
  return t;
}

// How fast each value eases toward its target, per second.
const RATE = {
  eyes: 30,
  headYaw: 6,
  headPitch: 6,
  headRoll: 6,
  sit: 5,
  fly: 8,
  thrust: 10,
};

// The drones: glossy silver orbs with a visor and glowing blue eyes. One has
// a ring of light around it, the other a glowing band. Each is drawn on a
// 44 × 44 box centred on its position.
function OrbDefs({ id }) {
  return (
    <defs>
      <radialGradient id={`${id}-shell`} cx="0.36" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#c9d2de" />
        <stop offset="0.8" stopColor="#5d6878" />
        <stop offset="1" stopColor="#2b323d" />
      </radialGradient>
      <clipPath id={`${id}-clip`}>
        <ellipse cx="22" cy="23" rx="13" ry="15" />
      </clipPath>
    </defs>
  );
}

function Visor() {
  return (
    <>
      <rect x="13" y="12" width="18" height="8" rx="4" fill="#0b1018" />
      <rect x="15.5" y="14" width="4.5" height="3.2" rx="1.6" fill="#7cc8ff" />
      <rect x="24" y="14" width="4.5" height="3.2" rx="1.6" fill="#7cc8ff" />
    </>
  );
}

function RingDrone() {
  return (
    <svg viewBox="0 0 44 44" width="44" height="44">
      <OrbDefs id="ring-drone" />
      <path
        d="M2 25a20 5 0 0 1 40 0"
        fill="none"
        stroke="#9fe0ff"
        strokeWidth="1.4"
        opacity="0.7"
      />
      <ellipse cx="22" cy="23" rx="13" ry="15" fill="url(#ring-drone-shell)" />
      <g clipPath="url(#ring-drone-clip)" fill="#1d232c" opacity="0.85">
        <rect x="8" y="24" width="28" height="2.6" />
        <rect x="8" y="29" width="28" height="2.6" />
        <rect x="8" y="34" width="28" height="2.6" />
      </g>
      <Visor />
      <path
        className={styles.glow}
        d="M42 25a20 5 0 0 1 -40 0"
        fill="none"
        stroke="#c4efff"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BandDrone() {
  return (
    <svg viewBox="0 0 44 44" width="44" height="44">
      <OrbDefs id="band-drone" />
      <ellipse cx="22" cy="23" rx="13" ry="15" fill="url(#band-drone-shell)" />
      <g clipPath="url(#band-drone-clip)">
        <rect x="8" y="33" width="28" height="2.4" fill="#1d232c" />
        <rect
          className={styles.glow}
          x="8"
          y="24.5"
          width="28"
          height="3"
          fill="#c4efff"
        />
      </g>
      <Visor />
    </svg>
  );
}

export function ClimbingRobot() {
  const laneRef = useRef(null);
  const canvasRef = useRef(null);
  const hitRef = useRef(null);
  const dronesRef = useRef([]);

  useEffect(() => {
    const lane = laneRef.current;
    const canvas = canvasRef.current;
    const hit = hitRef.current;
    if (!lane || !canvas || !hit) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const value = { ...REST };
    let robot = null;
    let loading = false;
    let disposed = false;
    let scale = 1;
    let current = null;
    let vel = 0;
    let sliding = false;
    let flying = false;
    let catchAt = -Infinity;
    let phase = 0;
    let mode = "idle";
    let still = 0;
    let last = null;
    let frame = 0;
    let timer = 0;
    let hover = false;
    let waveUntil = 0;
    let look = null;
    let nextLook = 0;
    let kick = null;
    let nextKick = 0;
    let blinkUntil = 0;
    let nextBlink = 0;
    let lastScroll = performance.now() / 1000; // start docked by the robot
    let lastTop = "";
    let drawn = false;

    // Two drones keep the robot company: they hover by its head, and when
    // the page has been still for a moment they roam the window, racing back
    // as soon as it scrolls again. Positions are in viewport px.
    const drones = dronesRef.current.map((el, i) => ({
      el,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      tx: 0,
      ty: 0,
      until: 0,
      placed: false,
      home: i === 0 ? { x: -114, y: -58 } : { x: 38, y: -70 },
      phase: i * 2.1,
    }));

    function flyDrones(time, dt, roam, anchorY, ropeX) {
      let busy = roam;
      for (const d of drones) {
        const wobble = reduce ? 0 : 1;
        const hx =
          ropeX +
          d.home.x * scale +
          wobble * 6 * Math.sin(time * 1.3 + d.phase);
        const hy =
          anchorY +
          d.home.y * scale +
          wobble * 4 * Math.cos(time * 1.7 + d.phase);
        if (!d.placed || reduce) {
          Object.assign(d, { x: hx, y: hy, vx: 0, vy: 0, placed: true });
        }
        let gx = hx;
        let gy = hy;
        let speed = 700;
        if (roam) {
          if (time > d.until || Math.hypot(d.tx - d.x, d.ty - d.y) < 30) {
            d.tx = 50 + Math.random() * (window.innerWidth - 100);
            d.ty = 60 + Math.random() * (window.innerHeight - 120);
            d.until = time + 3 + Math.random() * 3;
          }
          [gx, gy, speed] = [d.tx, d.ty, 220];
        }
        if (!reduce) {
          // Steer toward the goal, easing off on arrival.
          const dx = gx - d.x;
          const dy = gy - d.y;
          const dist = Math.hypot(dx, dy);
          const want =
            dist > 0.01 ? (speed * Math.min(1, dist / 120)) / dist : 0;
          const k = 1 - Math.exp(-4 * dt);
          d.vx += (dx * want - d.vx) * k;
          d.vy += (dy * want - d.vy) * k;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          if (dist > 1 || Math.hypot(d.vx, d.vy) > 2) busy = true;
        }
        const tilt = clamp(d.vx / 25, -25, 25);
        d.el.style.transform = `translate3d(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg)`;
      }
      return busy;
    }

    // Slides from START_TOP at the top of the page to END_GAP above the
    // bottom, in step with the scroll; at the very bottom, down to the floor.
    function target() {
      const page = document.scrollingElement ?? document.documentElement;
      const maxScroll = page.scrollHeight - window.innerHeight;
      if (maxScroll > 1 && page.scrollTop >= maxScroll - 2) {
        const y = page.scrollHeight - FLOOR - PELVIS * scale;
        return { y, atBottom: true };
      }
      const progress = clamp(page.scrollTop / Math.max(1, maxScroll), 0, 1);
      const travel = Math.max(0, page.scrollHeight - START_TOP - END_GAP);
      return { y: START_TOP + progress * travel, atBottom: false };
    }

    // Three.js only loads once the robot is actually shown (wide screens).
    function load() {
      loading = true;
      import("./robot-model")
        .then(({ createRobot }) => {
          if (disposed) return;
          robot = createRobot(canvas);
          schedule();
        })
        .catch(() => {
          // No WebGL: the robot simply stays hidden.
        });
    }

    function step(ms) {
      frame = 0;
      // Hidden on narrow screens: do nothing, and jump into place once shown.
      if (!lane.offsetParent) {
        current = null;
        return;
      }
      if (!robot) {
        if (!loading) load();
        return;
      }
      const ropeX = lane.getBoundingClientRect().left;
      scale =
        parseFloat(getComputedStyle(lane).getPropertyValue("--robot-scale")) ||
        1;
      const time = ms / 1000;
      const dt = last === null ? 1 / 60 : clamp(time - last, 0.001, 0.05);
      last = time;

      const goal = target();
      if (current === null) {
        current = goal.y;
        nextLook = time + 2 + Math.random() * 3;
        nextKick = time + 4 + Math.random() * 3;
        nextBlink = time + 1.5 + Math.random() * 2;
      }
      const gap = goal.y - current;
      if (!sliding && gap > SLIDE_GAP) sliding = true;
      else if (sliding && gap < SLIDE_END) sliding = false;
      // A fast scroll up: fire the jetpack and fly, then grab the rope again.
      if (!flying && gap < -SLIDE_GAP) flying = true;
      else if (flying && gap > -SLIDE_END) flying = false;
      const previous = current;
      if (reduce) current = goal.y;
      else if (sliding || flying) current += gap * 0.12;
      else current += clamp(gap * 0.1, -CLIMB_UP, CLIMB_DOWN);
      const moved = current - previous;
      vel = vel * 0.8 + moved * 0.2;
      // About one climbing cycle per 100px, never faster than a natural pace.
      phase += Math.min(Math.abs(moved), 3) / 16;

      const moving =
        !reduce && (Math.abs(goal.y - current) > 0.4 || Math.abs(vel) > 0.08);
      still = moving ? 0 : still + dt;
      const was = mode;
      if (moving) {
        const down = (Math.abs(vel) > 0.08 ? vel : gap) > 0;
        mode = sliding ? "slide" : flying ? "fly" : down ? "down" : "up";
      } else if (still > 0.15 || reduce) {
        mode = goal.atBottom ? "sit" : "idle";
      }
      if (mode !== was) {
        look = null;
        kick = null;
        if (was === "fly") catchAt = time;
        if (mode === "sit" && !reduce) waveUntil = time + 3.2;
        if (mode === "idle") nextLook = time + 1.5 + Math.random() * 2;
      }

      const calm = mode === "idle" || mode === "sit";
      const waving = calm && (hover || time < waveUntil);
      if (!reduce) {
        if (mode === "idle" && !waving && look === null && time >= nextLook)
          look = time;
        if (look !== null && time - look > 2.6) {
          look = null;
          nextLook = time + 3.5 + Math.random() * 3;
        }
        if (calm && kick === null && time >= nextKick) kick = time;
        if (kick !== null && time - kick > 1.8) {
          kick = null;
          nextKick = time + 4 + Math.random() * 4;
        }
        if (time >= nextBlink) {
          blinkUntil = time + 0.14;
          nextBlink = time + 2.5 + Math.random() * 3;
        }
      }

      const goalPose = poseFor({
        mode,
        phase,
        vel,
        waving,
        look: look === null ? null : time - look,
        kick: kick === null ? null : (time - kick) / 1.8,
        blink: time < blinkUntil,
        caught: time - catchAt < 1.2 ? time - catchAt : null,
      });
      let pending = 0;
      for (const [key, to] of Object.entries(goalPose)) {
        const rate = RATE[key] ?? 12;
        value[key] = reduce
          ? to
          : value[key] + (to - value[key]) * (1 - Math.exp(-rate * dt));
        pending = Math.max(pending, Math.abs(to - value[key]));
      }
      const top = `${current.toFixed(1)}px`;
      if (top !== lastTop) {
        lane.style.setProperty("--robot-top", top);
        lastTop = top;
      }
      lane.dataset.mode = mode;
      lane.dataset.ready = "true";
      // Only redraw the robot while it's actually changing.
      const busy =
        moving ||
        pending > 0.02 ||
        (waving && !reduce) ||
        look !== null ||
        kick !== null ||
        time < blinkUntil ||
        time - catchAt < 1.2;
      if (busy || !drawn) {
        robot.update(value, reduce ? 0 : time, current);
        drawn = true;
      }
      // The drones set off once the page has been still for 5 seconds.
      const roam = !reduce && calm && time - lastScroll > 5;
      const dronesBusy = flyDrones(
        time,
        dt,
        roam,
        current - window.scrollY,
        ropeX,
      );

      if (busy || dronesBusy) {
        schedule();
      } else if (!reduce) {
        // Asleep until the next blink, look around or leg swing.
        const next = Math.min(
          nextBlink,
          calm ? nextKick : Infinity,
          mode === "idle" ? nextLook : Infinity,
        );
        timer = setTimeout(schedule, Math.max(0, next - time) * 1000);
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (!frame) frame = requestAnimationFrame(step);
    }

    const onEnter = () => {
      hover = true;
      schedule();
    };
    const onLeave = () => {
      hover = false;
      schedule();
    };
    const onClick = () => {
      waveUntil = performance.now() / 1000 + 2.4;
      schedule();
    };

    const onScroll = () => {
      lastScroll = performance.now() / 1000;
      schedule();
    };
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", schedule);
    // Pages also change height without scrolling: a report finishing or
    // unlocking, or a client-side navigation to another page.
    const heightWatcher = new ResizeObserver(schedule);
    heightWatcher.observe(document.body);
    hit.addEventListener("pointerenter", onEnter);
    hit.addEventListener("pointerleave", onLeave);
    hit.addEventListener("click", onClick);
    schedule();

    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", schedule);
      heightWatcher.disconnect();
      hit.removeEventListener("pointerenter", onEnter);
      hit.removeEventListener("pointerleave", onLeave);
      hit.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      robot?.dispose();
    };
  }, []);

  return (
    <div className={styles.layer} aria-hidden="true">
      <div
        ref={laneRef}
        className={styles.lane}
        style={{ "--robot-top": `${START_TOP}px` }}
      >
        <div className={styles.bracket}>
          <span className={styles.screw} />
          <span className={styles.screw} />
        </div>
        <div className={styles.ring} />
        <div className={styles.rope} />
        <div className={styles.knot} />
        <div className={styles.fray} />

        <div className={styles.hanger}>
          <div className={styles.trail}>
            <span />
            <span />
            <span />
          </div>
          <canvas ref={canvasRef} className={styles.canvas} />
          <span className={`${styles.spark} ${styles.sparkA}`} />
          <span className={`${styles.spark} ${styles.sparkB}`} />
          {/* Hovering here makes the robot wave. */}
          <div ref={hitRef} className={styles.hit} />
        </div>

        <div className={styles.drones}>
          {[RingDrone, BandDrone].map((Art, i) => (
            <div
              key={i}
              ref={(el) => {
                dronesRef.current[i] = el;
              }}
              className={styles.drone}
            >
              <div className={styles.bob}>
                <Art />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

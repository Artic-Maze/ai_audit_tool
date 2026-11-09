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
};

// The pose a mode aims for. `phase` grows with the distance travelled and
// drives the climbing cycle; `look` and `kick` are the seconds and progress
// (0 to 1) of an idle look around and leg swing, or null.
function poseFor({ mode, phase, vel, waving, look, kick, blink }) {
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
const RATE = { eyes: 30, headYaw: 6, headPitch: 6, headRoll: 6, sit: 5 };

export function ClimbingRobot() {
  const laneRef = useRef(null);
  const canvasRef = useRef(null);
  const hitRef = useRef(null);

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
      const previous = current;
      if (reduce) current = goal.y;
      else if (sliding) current += gap * 0.12;
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
        mode = sliding ? "slide" : down ? "down" : "up";
      } else if (still > 0.15 || reduce) {
        mode = goal.atBottom ? "sit" : "idle";
      }
      if (mode !== was) {
        look = null;
        kick = null;
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
      });
      let pending = 0;
      for (const [key, to] of Object.entries(goalPose)) {
        const rate = RATE[key] ?? 12;
        value[key] = reduce
          ? to
          : value[key] + (to - value[key]) * (1 - Math.exp(-rate * dt));
        pending = Math.max(pending, Math.abs(to - value[key]));
      }
      lane.style.setProperty("--robot-top", `${current.toFixed(1)}px`);
      lane.dataset.mode = mode;
      lane.dataset.ready = "true";
      robot.update(value, reduce ? 0 : time, current);

      if (
        moving ||
        pending > 0.02 ||
        (waving && !reduce) ||
        look !== null ||
        kick !== null ||
        time < blinkUntil
      ) {
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

    window.addEventListener("scroll", schedule, {
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
      window.removeEventListener("scroll", schedule, { capture: true });
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
      </div>
    </div>
  );
}

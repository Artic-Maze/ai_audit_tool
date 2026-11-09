"use client";

import { useEffect, useRef } from "react";
import styles from "./climbing-robot.module.css";

/*
 * A small humanoid robot hanging from a rope in the right margin of every
 * page. Pure CSS 3D: every body part is a box of six faces.
 *
 * - Scrolling down, it climbs down hand under hand; scrolling fast, it
 *   slides, throwing sparks. Scrolling up, it climbs back up.
 * - When the page stops, it holds on, looks around and swings a leg now
 *   and then. Hovering over it (or clicking it) makes it wave.
 * - At the bottom of the page it sits on the knot at the end of the rope
 *   and waves.
 *
 * It's rendered once, in the root layout, and covers its nearest positioned
 * ancestor (<body>), so that has to span the whole page. The animation loop
 * only writes CSS custom properties on the lane element, easing every joint
 * toward the current mode's pose so changes of mode never jump; React
 * renders the robot once and never re-renders it.
 */

// Where the robot hangs at the top of the page, and how far above the bottom
// of the page it stops.
const START_TOP = 90;
const END_GAP = 320;
// At the very bottom it sits on the knot instead: the knot's top is SEAT px
// above the bottom of the page, and the hips end PELVIS px below the hands.
const SEAT = 90;
const PELVIS = 123;
// Climbing speed in px per frame, down and up. When the page runs more than
// SLIDE_GAP px ahead of the robot (a fast scroll down), it slides to catch
// up instead, until it's within SLIDE_END px.
const CLIMB_DOWN = 4;
const CLIMB_UP = 5;
const SLIDE_GAP = 220;
const SLIDE_END = 40;

// Face colors for each kind of box: front, back, sides, top, bottom.
const LEGS = ["#2F3D5A", "#263149", "#232C42", "#3A4868", "#1A2133"];
const SHOES = ["#E7E2DC", "#D6D0C9", "#CFC9C2", "#F3EEEA", "#E0517F"];
const BODY = ["#3B3735", "#2E2B29", "#2B2826", "#4A4542", "#1E1C1A"];
const NECK = ["#3A3532", "#2A2623", "#24201E", "#4A4542", "#151210"];
const HEAD = ["#2A2623", "#1B1816", "#1D1A18", "#3A3532", "#100E0C"];
const ARMS = ["#383432", "#2C2927", "#2A2725", "#44403D", "#1E1C1A"];
const HANDS = ["#C98E6B", "#A8724F", "#B37C59", "#D49B78", "#9A6847"];
const JOINTS = ["#26221F", "#1C1917", "#1F1C1A", "#34302D", "#141210"];
const KNEES = ["#3A4868", "#2F3D5A", "#2A3550", "#46557A", "#1E2638"];

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

// The resting pose, in degrees (bob in px): both hands on the rope above the
// head. The R arm and leg are on the right of the screen.
const REST = {
  swing: 0,
  yaw: -28,
  bob: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  eyesX: 0,
  armRZ: 170,
  armRX: 0,
  elbowR: -18,
  armLZ: -170,
  armLX: 0,
  elbowL: 18,
  legRZ: 0,
  legRX: 6,
  kneeR: -14,
  legLZ: 0,
  legLX: -2,
  kneeL: -6,
};

// The pose a mode aims for. `phase` grows with the distance travelled and
// drives the climbing cycle; `look` and `kick` are the seconds and progress
// (0 to 1) of an idle look around and leg swing, or null.
function poseFor({ mode, phase, vel, time, waving, look, kick, reduce }) {
  const t = { ...REST };
  t.swing = clamp(-vel * 1.6, -14, 14);
  t.yaw = -28 + 22 * Math.sin(phase * 0.12);

  if (mode === "up" || mode === "down") {
    // Hand over hand, the opposite leg lifting with each pull. Climbing down
    // runs the same cycle the other way.
    const c = mode === "up" ? Math.sin(phase) : -Math.sin(phase);
    const pullR = Math.max(0, -c);
    const pullL = Math.max(0, c);
    t.bob = 3 * Math.abs(c);
    t.armRZ = 170 + 6 * pullR - 4 * pullL;
    t.armLZ = -(170 + 6 * pullL - 4 * pullR);
    t.armRX = 18 * c;
    t.armLX = -18 * c;
    t.elbowR = -18 - 26 * pullR;
    t.elbowL = 18 + 26 * pullL;
    t.legRX = 40 * Math.max(0, c) - 6;
    t.legLX = 40 * Math.max(0, -c) - 6;
    t.kneeR = -75 * Math.max(0, c) - 6;
    t.kneeL = -75 * Math.max(0, -c) - 6;
    t.headPitch = mode === "up" ? 10 : -10;
  } else if (mode === "slide") {
    Object.assign(t, {
      armRZ: 175,
      armLZ: -175,
      elbowR: -8,
      elbowL: 8,
      legRZ: 6,
      legLZ: -6,
      legRX: -10,
      legLX: -10,
      kneeR: -4,
      kneeL: -4,
      headPitch: -14,
    });
  } else if (mode === "sit") {
    // On the knot: thighs forward, shins hanging, facing the visitor.
    const dangle = kick === null ? 0 : 10 * Math.sin(2 * Math.PI * kick);
    Object.assign(t, {
      swing: 0,
      yaw: -10,
      legRZ: 4,
      legLZ: -4,
      legRX: 80,
      legLX: 80,
      kneeR: -88 + dangle,
      kneeL: -88 - dangle,
      headYaw: 10,
      headRoll: 5,
    });
  } else {
    // Idle: look one way, then the other, then back; swing a leg.
    if (look !== null) {
      t.headYaw = look < 1 ? -34 : look < 2 ? 22 : 0;
      t.eyesX = clamp(t.headYaw * 0.07, -2.5, 2.5);
    }
    if (kick !== null) {
      t.legLX = -2 + 22 * Math.sin(Math.PI * kick);
      t.kneeL = -6 - 24 * Math.sin(Math.PI * kick);
    }
  }

  if (waving) {
    // Let go with the left hand and wave it, face the visitor; the right
    // hand keeps hold of the rope.
    const sway = reduce ? 0 : Math.sin(time * 2.6);
    const flap = reduce ? 0 : Math.sin(time * 10);
    t.yaw = mode === "sit" ? -10 : -16;
    t.armLZ = -210 + 6 * sway;
    t.armLX = 0;
    t.elbowL = 30 + 28 * flap;
    t.headYaw = -t.yaw;
    t.headPitch = 4;
    t.headRoll = 6;
    t.eyesX = 0;
  }
  return t;
}

const deg = (n) => `${n.toFixed(2)}deg`;

// The custom properties the robot's parts read (see the JSX below).
function cssVars(top, v) {
  return {
    "--robot-top": `${top.toFixed(1)}px`,
    "--robot-swing": `rotateZ(${deg(v.swing)})`,
    "--robot-rig": `translateY(${v.bob.toFixed(2)}px) rotateY(${deg(v.yaw)})`,
    "--robot-head": `rotateY(${deg(v.headYaw)}) rotateX(${deg(v.headPitch)}) rotateZ(${deg(v.headRoll)})`,
    "--robot-eyes-x": `${v.eyesX.toFixed(2)}px`,
    "--robot-arm-r": `rotateZ(${deg(v.armRZ)}) rotateX(${deg(v.armRX)})`,
    "--robot-arm-l": `rotateZ(${deg(v.armLZ)}) rotateX(${deg(v.armLX)})`,
    "--robot-elbow-r": `rotateZ(${deg(v.elbowR)})`,
    "--robot-elbow-l": `rotateZ(${deg(v.elbowL)})`,
    "--robot-leg-r": `rotateZ(${deg(v.legRZ)}) rotateX(${deg(v.legRX)})`,
    "--robot-leg-l": `rotateZ(${deg(v.legLZ)}) rotateX(${deg(v.legLX)})`,
    "--robot-knee-r": `rotateX(${deg(v.kneeR)})`,
    "--robot-knee-l": `rotateX(${deg(v.kneeL)})`,
  };
}

const IDLE = cssVars(START_TOP, REST);

// A joint: children hang from this point and turn with it.
function Joint({ x = 0, y = 0, transform, children }) {
  return (
    <div className={styles.part} style={{ left: x, top: y, transform }}>
      {children}
    </div>
  );
}

// A w × h × d box with its top-left corner at (x, y), centred in depth.
// `front` is drawn on the front face; `children` move with the box.
function Box({
  x,
  y = 0,
  w,
  h,
  d,
  colors,
  transform,
  frontStyle,
  front,
  children,
}) {
  const [frontColor, backColor, sideColor, topColor, bottomColor] = colors;
  const side = {
    left: (w - d) / 2,
    width: d,
    height: h,
    background: sideColor,
  };
  const cap = { top: (h - d) / 2, width: w, height: d };

  return (
    <div
      className={styles.part}
      style={{ left: x, top: y, width: w, height: h, transform }}
    >
      <div
        className={styles.face}
        style={{
          width: w,
          height: h,
          background: frontColor,
          transform: `translateZ(${d / 2}px)`,
          ...frontStyle,
        }}
      >
        {front}
      </div>
      <div
        className={styles.face}
        style={{
          width: w,
          height: h,
          background: backColor,
          transform: `rotateY(180deg) translateZ(${d / 2}px)`,
        }}
      />
      <div
        className={styles.face}
        style={{ ...side, transform: `rotateY(90deg) translateZ(${w / 2}px)` }}
      />
      <div
        className={styles.face}
        style={{ ...side, transform: `rotateY(-90deg) translateZ(${w / 2}px)` }}
      />
      <div
        className={styles.face}
        style={{
          ...cap,
          background: topColor,
          transform: `rotateX(90deg) translateZ(${h / 2}px)`,
        }}
      />
      <div
        className={styles.face}
        style={{
          ...cap,
          background: bottomColor,
          transform: `rotateX(-90deg) translateZ(${h / 2}px)`,
        }}
      />
      {children}
    </div>
  );
}

// Hip joint, thigh, knee, shin and sneaker.
function Leg({ x, hip, knee }) {
  return (
    <Joint x={x} y={120} transform={hip}>
      <Box x={-7} y={-5} w={14} h={10} d={14} colors={JOINTS} />
      <Box x={-7.5} y={3} w={15} h={41} d={16} colors={LEGS}>
        <Joint x={7.5} y={41} transform={knee}>
          <Box x={-7} y={-4} w={14} h={9} d={16} colors={KNEES} />
          <Box x={-6.5} y={4} w={13} h={38} d={14} colors={LEGS}>
            <Joint x={6.5} y={38}>
              <Box
                x={-7.5}
                w={15}
                h={10}
                d={26}
                colors={SHOES}
                transform="translateZ(5px)"
              />
            </Joint>
          </Box>
        </Joint>
      </Box>
    </Joint>
  );
}

// Shoulder joint, upper arm, elbow, forearm with its cuff, and a hand: palm,
// thumb and fingers curled round the rope.
function Arm({ x, shoulder, elbow }) {
  return (
    <Joint x={x} y={70} transform={shoulder}>
      <Box x={-7} y={-7} w={14} h={14} d={14} colors={JOINTS} />
      <Box x={-5} y={4} w={10} h={27} d={10} colors={ARMS}>
        <Joint x={5} y={27} transform={elbow}>
          <Box x={-5.5} y={-4} w={11} h={8} d={11} colors={JOINTS} />
          <Box
            x={-4.5}
            y={3}
            w={9}
            h={24}
            d={9}
            colors={ARMS}
            front={<div className={styles.cuff} />}
          >
            <Joint x={4.5} y={23}>
              <Box x={-5} w={10} h={9} d={5} colors={HANDS}>
                <Box
                  x={3.5}
                  y={1}
                  w={3}
                  h={6}
                  d={4}
                  colors={HANDS}
                  transform="translateZ(4px)"
                />
                <Joint x={5} y={8} transform="rotateX(55deg)">
                  <Box x={-5} w={10} h={8} d={5} colors={HANDS} />
                </Joint>
              </Box>
            </Joint>
          </Box>
        </Joint>
      </Box>
    </Joint>
  );
}

export function ClimbingRobot() {
  const laneRef = useRef(null);
  const hitRef = useRef(null);

  useEffect(() => {
    const lane = laneRef.current;
    const hit = hitRef.current;
    if (!lane || !hit) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const value = { ...REST };
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

    // Slides from START_TOP at the top of the page to END_GAP above the
    // bottom, in step with the scroll; at the very bottom, down to the seat.
    function target() {
      const page = document.scrollingElement ?? document.documentElement;
      const maxScroll = page.scrollHeight - window.innerHeight;
      if (maxScroll > 1 && page.scrollTop >= maxScroll - 2) {
        return { y: page.scrollHeight - SEAT - PELVIS, atBottom: true };
      }
      const progress = clamp(page.scrollTop / Math.max(1, maxScroll), 0, 1);
      const travel = Math.max(0, page.scrollHeight - START_TOP - END_GAP);
      return { y: START_TOP + progress * travel, atBottom: false };
    }

    function step(ms) {
      frame = 0;
      // Hidden on narrow screens: do nothing, and jump into place once shown.
      if (!lane.offsetParent) {
        current = null;
        return;
      }
      const time = ms / 1000;
      const dt = last === null ? 1 / 60 : clamp(time - last, 0.001, 0.05);
      last = time;

      const goal = target();
      if (current === null) {
        current = goal.y;
        nextLook = time + 2 + Math.random() * 3;
        nextKick = time + 4 + Math.random() * 3;
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
      }

      const goalPose = poseFor({
        mode,
        phase,
        vel,
        time,
        waving,
        look: look === null ? null : time - look,
        kick: kick === null ? null : (time - kick) / 1.8,
        reduce,
      });
      let pending = 0;
      for (const [key, to] of Object.entries(goalPose)) {
        const rate = key.startsWith("head") || key === "eyesX" ? 6 : 14;
        value[key] = reduce
          ? to
          : value[key] + (to - value[key]) * (1 - Math.exp(-rate * dt));
        pending = Math.max(pending, Math.abs(to - value[key]));
      }
      for (const [name, css] of Object.entries(cssVars(current, value))) {
        lane.style.setProperty(name, css);
      }
      lane.dataset.mode = mode;
      lane.dataset.happy = String(waving);

      if (
        moving ||
        pending > 0.05 ||
        (waving && !reduce) ||
        look !== null ||
        kick !== null
      ) {
        schedule();
      } else if (calm && !reduce) {
        // Asleep until the next look around or leg swing.
        const next = Math.min(mode === "idle" ? nextLook : nextKick, nextKick);
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
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      heightWatcher.disconnect();
      hit.removeEventListener("pointerenter", onEnter);
      hit.removeEventListener("pointerleave", onLeave);
      hit.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={styles.layer} aria-hidden="true">
      <div ref={laneRef} className={styles.lane} style={IDLE}>
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
          <div className={styles.sway}>
            <div className={styles.swing}>
              <div className={`${styles.part} ${styles.rig}`}>
                <span className={`${styles.spark} ${styles.sparkA}`} />
                <span className={`${styles.spark} ${styles.sparkB}`} />

                <Leg
                  x={-10}
                  hip="var(--robot-leg-l)"
                  knee="var(--robot-knee-l)"
                />
                <Leg
                  x={10}
                  hip="var(--robot-leg-r)"
                  knee="var(--robot-knee-r)"
                />

                {/* Trousers, then the hoodie's hem and pocket */}
                <Box
                  x={-19}
                  y={107}
                  w={38}
                  h={16}
                  d={21}
                  colors={LEGS}
                  front={<div className={styles.waistband} />}
                />
                <Box
                  x={-20}
                  y={93}
                  w={40}
                  h={15}
                  d={22}
                  colors={BODY}
                  front={
                    <>
                      <div
                        className={styles.brief}
                        style={{ left: 7, top: 1, width: 24, height: 6 }}
                      />
                      <div className={styles.belt} />
                    </>
                  }
                />
                {/* Chest, wider at the shoulders */}
                <Box
                  x={-25}
                  y={64}
                  w={50}
                  h={30}
                  d={26}
                  colors={BODY}
                  front={
                    <>
                      <div className={styles.collar} />
                      <div
                        className={styles.stripe}
                        style={{ left: 19, height: 11 }}
                      />
                      <div
                        className={styles.stripe}
                        style={{ left: 29, height: 13 }}
                      />
                      <svg
                        className={styles.badge}
                        style={{ left: 19, top: 17 }}
                        width="12"
                        height="10"
                        viewBox="0 0 12 10"
                      >
                        <path
                          d="M1 9L6 1l5 8M3.5 9L6 5l2.5 4"
                          fill="none"
                          stroke="#E8638D"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </>
                  }
                />
                <Box x={-5} y={56} w={10} h={10} d={10} colors={NECK} />
                {/* Head, with a visor for a face. It turns at the neck. */}
                <Joint y={58} transform="var(--robot-head)">
                  <div className={styles.antenna} />
                  <div className={styles.antennaTip} />
                  <Box
                    x={-18}
                    y={-32}
                    w={36}
                    h={32}
                    d={32}
                    colors={HEAD}
                    frontStyle={{ padding: "7px 5px" }}
                    front={
                      <div className={styles.visor}>
                        <div className={styles.eyes}>
                          <span className={styles.eye} />
                          <span className={styles.eye} />
                        </div>
                      </div>
                    }
                  />
                </Joint>

                <Arm
                  x={-30}
                  shoulder="var(--robot-arm-l)"
                  elbow="var(--robot-elbow-l)"
                />
                <Arm
                  x={30}
                  shoulder="var(--robot-arm-r)"
                  elbow="var(--robot-elbow-r)"
                />
              </div>
            </div>
          </div>
          {/* Hovering here makes the robot wave. */}
          <div ref={hitRef} className={styles.hit} />
        </div>
      </div>
    </div>
  );
}

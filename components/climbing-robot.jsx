"use client";

import { useEffect, useRef } from "react";
import styles from "./climbing-robot.module.css";

/*
 * A small robot hanging from a rope in the right margin of the page. It
 * slides down the rope as the page scrolls down and climbs back up as it
 * scrolls up, swinging with the speed. Decorative only, and pure CSS 3D:
 * every body part is a box of six faces.
 *
 * The scroll loop only writes CSS custom properties on the lane element, so
 * React renders the robot once and never re-renders it while scrolling.
 */

// Where the robot hangs at the top of the page, and how far above the bottom
// of the page it stops.
const START_TOP = 90;
const END_GAP = 320;

// Face colors for each kind of box: front, back, sides, top, bottom.
const LEGS = ["#2F3D5A", "#263149", "#232C42", "#3A4868", "#1A2133"];
const SHOES = ["#E7E2DC", "#D6D0C9", "#CFC9C2", "#F3EEEA", "#E0517F"];
const BODY = ["#3B3735", "#2E2B29", "#2B2826", "#4A4542", "#1E1C1A"];
const NECK = ["#3A3532", "#2A2623", "#24201E", "#4A4542", "#151210"];
const HEAD = ["#2A2623", "#1B1816", "#1D1A18", "#3A3532", "#100E0C"];
const ARMS = ["#383432", "#2C2927", "#2A2725", "#44403D", "#1E1C1A"];
const HANDS = ["#C98E6B", "#A8724F", "#B37C59", "#D49B78", "#9A6847"];

const deg = (value) => `${Math.round(value * 100) / 100}deg`;

/*
 * The robot's pose, as the CSS custom properties its parts read. `mode` is
 * "idle", "slide" (moving down) or "climb" (moving up). `phase` grows with
 * the distance travelled: it drives the climbing cycle and a slow turn.
 */
function pose({ top, vel, phase, mode }) {
  const climb = mode === "climb";
  const slide = mode === "slide";
  const swing = Math.max(-14, Math.min(14, -vel * 1.6));
  const yaw = -28 + 22 * Math.sin(phase * 0.12);
  const c = Math.sin(phase);
  const bob = climb ? 3 * Math.abs(c) : 0;
  const pullR = climb ? Math.max(0, -c) : 0;
  const pullL = climb ? Math.max(0, c) : 0;
  const shoulderR = slide ? 175 : 170 + 6 * pullR - 4 * pullL;
  const shoulderL = -(slide ? 175 : 170 + 6 * pullL - 4 * pullR);
  const elbowR = slide ? -8 : -18 - 26 * pullR;
  const elbowL = -(slide ? -8 : -18 - 26 * pullL);

  return {
    "--robot-top": `${Math.round(top * 10) / 10}px`,
    "--robot-swing": `rotateZ(${deg(swing)})`,
    "--robot-rig": `translateY(${bob.toFixed(2)}px) rotateY(${deg(yaw)})`,
    "--robot-arm-r": `rotateZ(${deg(shoulderR)})${climb ? ` rotateX(${deg(18 * c)})` : ""}`,
    "--robot-arm-l": `rotateZ(${deg(shoulderL)})${climb ? ` rotateX(${deg(-18 * c)})` : ""}`,
    "--robot-elbow-r": `rotateZ(${deg(elbowR)})`,
    "--robot-elbow-l": `rotateZ(${deg(elbowL)})`,
    "--robot-leg-r": climb
      ? `rotateX(${deg(40 * Math.max(0, c) - 6)})`
      : slide
        ? "rotateZ(6deg) rotateX(-10deg)"
        : "rotateX(6deg)",
    "--robot-leg-l": climb
      ? `rotateX(${deg(40 * Math.max(0, -c) - 6)})`
      : slide
        ? "rotateZ(-6deg) rotateX(-10deg)"
        : "rotateX(-2deg)",
    "--robot-knee-r": climb
      ? `rotateX(${deg(-75 * Math.max(0, c) - 6)})`
      : slide
        ? "rotateX(-4deg)"
        : "rotateX(-14deg)",
    "--robot-knee-l": climb
      ? `rotateX(${deg(-75 * Math.max(0, -c) - 6)})`
      : slide
        ? "rotateX(-4deg)"
        : "rotateX(-6deg)",
    "--robot-eye-h": slide ? "3px" : "8px",
    "--robot-sparks": slide ? "block" : "none",
  };
}

const IDLE = pose({ top: START_TOP, vel: 0, phase: 0, mode: "idle" });

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

function Leg({ x, hip, knee }) {
  return (
    <Joint x={x} y={123} transform={hip}>
      <Box x={-8.5} w={17} h={34} d={18} colors={LEGS}>
        <Joint x={8.5} y={33} transform={knee}>
          <Box x={-7.5} w={15} h={32} d={16} colors={LEGS}>
            <Joint x={7.5} y={31}>
              <Box
                x={-9}
                w={18}
                h={11}
                d={26}
                colors={SHOES}
                transform="translateZ(4px)"
              />
            </Joint>
          </Box>
        </Joint>
      </Box>
    </Joint>
  );
}

function Arm({ x, shoulder, elbow }) {
  return (
    <Joint x={x} y={70} transform={shoulder}>
      <Box x={-6.5} w={13} h={32} d={13} colors={ARMS}>
        <Joint x={6.5} y={31} transform={elbow}>
          <Box
            x={-6}
            w={12}
            h={28}
            d={12}
            colors={ARMS}
            front={<div className={styles.cuff} />}
          >
            <Joint x={6} y={26}>
              <Box x={-5.5} w={11} h={15} d={9} colors={HANDS} />
            </Joint>
          </Box>
        </Joint>
      </Box>
    </Joint>
  );
}

export function ClimbingRobot() {
  const laneRef = useRef(null);

  useEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let current = null;
    let vel = 0;
    let phase = 0;
    let frame = 0;

    // Slides from START_TOP at the top of the page to END_GAP above the
    // bottom, in step with how far the page has been scrolled.
    function target() {
      const page = document.scrollingElement ?? document.documentElement;
      const maxScroll = Math.max(1, page.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, page.scrollTop / maxScroll));
      const travel = Math.max(0, page.scrollHeight - START_TOP - END_GAP);
      return START_TOP + progress * travel;
    }

    function apply(values) {
      for (const [name, value] of Object.entries(values)) {
        lane.style.setProperty(name, value);
      }
    }

    function step() {
      frame = 0;
      // Hidden on narrow screens: do nothing, and jump into place once shown.
      if (!lane.offsetParent) {
        current = null;
        return;
      }

      const goal = target();
      if (reduceMotion) {
        apply(pose({ top: goal, vel: 0, phase: 0, mode: "idle" }));
        return;
      }

      if (current === null) current = goal;
      const previous = current;
      current += (goal - current) * 0.1;
      const moved = current - previous;
      vel = vel * 0.8 + moved * 0.2;
      phase += Math.abs(moved) / 16;

      const moving = Math.abs(goal - current) > 0.4 || Math.abs(vel) > 0.08;
      const mode = !moving ? "idle" : vel > 0 ? "slide" : "climb";
      apply(pose({ top: current, vel, phase, mode }));
      if (moving) schedule();
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(step);
    }

    window.addEventListener("scroll", schedule, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={laneRef} className={styles.lane} style={IDLE} aria-hidden="true">
      <div className={styles.bracket}>
        <span className={styles.screw} />
        <span className={styles.screw} />
      </div>
      <div className={styles.ring} />
      <div className={styles.rope} />
      <div className={styles.knot} />
      <div className={styles.fray} />

      <div className={styles.hanger}>
        <div className={styles.sway}>
          <div className={styles.swing}>
            <div className={`${styles.part} ${styles.rig}`}>
              <span className={`${styles.spark} ${styles.sparkA}`} />
              <span className={`${styles.spark} ${styles.sparkB}`} />
              <div className={styles.antenna} />
              <div className={styles.antennaTip} />

              <Leg
                x={-11}
                hip="var(--robot-leg-l)"
                knee="var(--robot-knee-l)"
              />
              <Leg x={11} hip="var(--robot-leg-r)" knee="var(--robot-knee-r)" />

              {/* Hips */}
              <Box
                x={-22}
                y={99}
                w={44}
                h={28}
                d={22}
                colors={BODY}
                front={
                  <>
                    <div className={styles.brief} />
                    <div className={styles.belt} />
                  </>
                }
              />
              {/* Chest */}
              <Box
                x={-27}
                y={64}
                w={54}
                h={36}
                d={26}
                colors={BODY}
                front={
                  <>
                    <div className={styles.collar} />
                    <div
                      className={styles.stripe}
                      style={{ left: 21, height: 14 }}
                    />
                    <div
                      className={styles.stripe}
                      style={{ left: 31, height: 16 }}
                    />
                    <svg
                      className={styles.badge}
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
              <Box x={-6} y={56} w={12} h={9} d={12} colors={NECK} />
              {/* Head, with a visor for a face */}
              <Box
                x={-18}
                y={26}
                w={36}
                h={32}
                d={32}
                colors={HEAD}
                frontStyle={{ padding: "7px 5px" }}
                front={
                  <div className={styles.visor}>
                    <span className={styles.eye} />
                    <span className={styles.eye} />
                  </div>
                }
              />

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
      </div>
    </div>
  );
}

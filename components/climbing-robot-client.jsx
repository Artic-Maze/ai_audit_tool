"use client";

import dynamic from "next/dynamic";

// The robot is decorative and runs entirely in the browser (WebGL, scroll
// and pointer handling), so it isn't rendered on the server: there's no
// hydration to get wrong, and its code loads after the page.
export const ClimbingRobot = dynamic(
  () => import("./climbing-robot").then((module) => module.ClimbingRobot),
  { ssr: false },
);

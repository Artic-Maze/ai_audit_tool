import * as THREE from "three";

/*
 * The climbing robot as a Three.js scene, in the blocky look of the landing
 * page design: a dark hoodie with pink drawstrings and the logo, a black
 * visor with pink eyes and an antenna, navy trousers, white sneakers with
 * pink soles, and a jetpack on its back. It hugs a slim rope from the left.
 * Loaded on demand by ClimbingRobot, which drives it with update().
 *
 * Every part is a box with flat colours per face, as in the original CSS
 * version. Units are CSS pixels. The origin is the anchor: the point on the
 * rope level with the centre of the head. y points up, z toward the viewer,
 * and the rope runs along x = 0, z = 0.
 */

// The canvas covers this box around the anchor (keep in step with .canvas).
export const VIEW = { left: -120, right: 50, top: 46, bottom: -204 };

const BX = -28; // the body's centre line, left of the rope
const NECK_Y = -16;
const SHOULDER = { y: -28, near: BX + 30, far: BX - 30 };
const HIP = { y: -81, near: BX + 11, far: BX - 11 };
const ARM = [33, 29]; // shoulder to elbow, elbow to wrist
const LEG = [33, 31]; // hip to knee, knee to ankle
const REACH_Z = 18; // the lower hand grips the front of the rope
const BRAID = 9; // rope texture repeat, px

// Face colours: front, back, sides, top, bottom.
const HOODIE = ["#3B3735", "#2E2B29", "#2B2826", "#4A4542", "#1E1C1A"];
const SLEEVE = ["#383432", "#2C2927", "#2A2725", "#44403D", "#1E1C1A"];
const HEAD = ["#2A2623", "#1B1816", "#1D1A18", "#3A3532", "#100E0C"];
const NECK = ["#3A3532", "#2A2623", "#24201E", "#4A4542", "#151210"];
const TROUSERS = ["#2F3D5A", "#263149", "#232C42", "#3A4868", "#1A2133"];
const SHOES = ["#E7E2DC", "#D6D0C9", "#CFC9C2", "#F3EEEA", "#E0517F"];
const SKIN = ["#C98E6B", "#A8724F", "#B37C59", "#D49B78", "#9A6847"];
const PACK = ["#2A2623", "#1F1C1A", "#24201E", "#34302D", "#141210"];
const STALK = ["#3A3330", "#3A3330", "#2E2825", "#4A4542", "#2E2825"];
const PINK = "#E0517F";
const ALL_PINK = [PINK, PINK, PINK, PINK, PINK];

const rad = THREE.MathUtils.degToRad;
const FRONT = new THREE.Vector3(0, 0, 1);
const dir = new THREE.Vector3();
const bend = new THREE.Vector3();
const lowerDir = new THREE.Vector3();
const axisX = new THREE.Vector3();
const axisZ = new THREE.Vector3();
const basis = new THREE.Matrix4();

// Two-bone IK: puts `end` at the target (or as close as the bones reach)
// and `mid` (the elbow or knee) on the side of the pole.
function solveLimb(root, target, [upper, lower], pole, mid, end) {
  dir.subVectors(target, root);
  const dist = THREE.MathUtils.clamp(
    dir.length(),
    Math.abs(upper - lower) + 0.01,
    upper + lower - 0.01,
  );
  dir.normalize();
  end.copy(root).addScaledVector(dir, dist);
  const along = (upper * upper - lower * lower + dist * dist) / (2 * dist);
  const out = Math.sqrt(Math.max(0, upper * upper - along * along));
  bend.subVectors(pole, root);
  bend.addScaledVector(dir, -bend.dot(dir));
  if (bend.lengthSq() < 1e-6) bend.copy(FRONT);
  bend.normalize();
  mid.copy(root).addScaledVector(dir, along).addScaledVector(bend, out);
}

// Turns a box so its y axis runs along `along` and its front faces the
// viewer as far as it can.
function orient(mesh, along) {
  axisZ.copy(FRONT).addScaledVector(along, -FRONT.dot(along));
  if (axisZ.lengthSq() < 1e-6) axisZ.set(1, 0, 0);
  axisZ.normalize();
  axisX.crossVectors(along, axisZ);
  mesh.quaternion.setFromRotationMatrix(basis.makeBasis(axisX, along, axisZ));
}

// Lays a box between two points.
function placeBetween(mesh, a, b) {
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  dir.subVectors(b, a).normalize();
  orient(mesh, dir);
}

function canvasTexture(width, height, paint, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const g = canvas.getContext("2d");
  g.scale(scale, scale);
  paint(g);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function createRobot(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(VIEW.right - VIEW.left, VIEW.top - VIEW.bottom, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    VIEW.left,
    VIEW.right,
    VIEW.top,
    VIEW.bottom,
    -400,
    400,
  );
  camera.position.z = 200;
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-80, 140, 160);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.6));

  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };
  const flat = new Map();
  const color = (hex) => {
    if (!flat.has(hex)) {
      flat.set(hex, keep(new THREE.MeshBasicMaterial({ color: hex })));
    }
    return flat.get(hex);
  };
  // Per-face materials, in BoxGeometry's order: right, left, top, bottom,
  // front, back. `frontMaterial` replaces the front (for a decal).
  const faces = ([front, back, side, top, bottom], frontMaterial) => [
    color(side),
    color(side),
    color(top),
    color(bottom),
    frontMaterial ?? color(front),
    color(back),
  ];
  const add = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, colors, parent, x, y, z, frontMaterial) =>
    add(
      new THREE.BoxGeometry(w, h, d),
      faces(colors, frontMaterial),
      parent,
      x,
      y,
      z,
    );
  const decal = (w, h, paint) =>
    keep(
      new THREE.MeshBasicMaterial({
        map: keep(canvasTexture(w, h, paint, 6)),
        transparent: true,
      }),
    );

  // The rope: slim, dark and braided, faded at the ends into the CSS rope
  // behind the canvas.
  const braid = keep(
    canvasTexture(32, 32, (g) => {
      g.fillStyle = "#222226";
      g.fillRect(0, 0, 32, 32);
      g.lineWidth = 7;
      g.strokeStyle = "#4b4b52";
      for (let i = -32; i <= 64; i += 16) {
        g.beginPath();
        g.moveTo(i, 32);
        g.lineTo(i + 32, 0);
        g.stroke();
      }
    }),
  );
  braid.wrapS = braid.wrapT = THREE.RepeatWrapping;
  braid.repeat.set(2, (VIEW.top - VIEW.bottom) / BRAID);
  const fade = keep(
    canvasTexture(1, 64, (g) => {
      const ramp = g.createLinearGradient(0, 0, 0, 64);
      ramp.addColorStop(0, "#000");
      ramp.addColorStop(0.16, "#fff");
      ramp.addColorStop(0.84, "#fff");
      ramp.addColorStop(1, "#000");
      g.fillStyle = ramp;
      g.fillRect(0, 0, 1, 64);
    }),
  );
  fade.colorSpace = THREE.NoColorSpace;
  const shadowMaterial = keep(
    new THREE.MeshBasicMaterial({
      map: keep(
        canvasTexture(64, 16, (g) => {
          const blob = g.createRadialGradient(32, 8, 0, 32, 8, 32);
          blob.addColorStop(0, "rgba(0,0,0,0.9)");
          blob.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = blob;
          g.fillRect(0, 0, 64, 16);
        }),
      ),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    }),
  );

  // Seen a little from above. The body swings about the high hand and turns
  // about the rope, so both hands stay on it.
  const root = new THREE.Group();
  root.rotation.x = rad(9);
  const pivot = new THREE.Group();
  const body = new THREE.Group();
  scene.add(root);
  root.add(pivot);
  pivot.add(body);

  add(
    new THREE.CylinderGeometry(3, 3, VIEW.top - VIEW.bottom, 16, 1, true),
    keep(
      new THREE.MeshStandardMaterial({
        map: braid,
        alphaMap: fade,
        transparent: true,
        roughness: 0.55,
      }),
    ),
    root,
    0,
    (VIEW.top + VIEW.bottom) / 2,
  );
  const floorShadow = add(
    new THREE.PlaneGeometry(90, 16),
    shadowMaterial,
    root,
    BX + 6,
    -88,
    -24,
  );

  // Hoodie: chest with the collar, drawstrings and logo; the lower part
  // with its pocket and hem.
  const chest = decal(54, 36, (g) => {
    g.fillStyle = HOODIE[0];
    g.fillRect(0, 0, 54, 36);
    g.fillStyle = "#262321";
    roundRect(g, 18, 0, 18, 8, [0, 0, 9, 9]);
    g.fill();
    g.fillStyle = PINK;
    g.fillRect(21, 7, 2, 14);
    g.fillRect(31, 7, 2, 16);
    g.strokeStyle = "#E8638D";
    g.lineWidth = 1.2;
    g.translate(21, 24);
    g.beginPath();
    g.moveTo(1, 9);
    g.lineTo(6, 1);
    g.lineTo(11, 9);
    g.moveTo(3.5, 9);
    g.lineTo(6, 5);
    g.lineTo(8.5, 9);
    g.stroke();
  });
  const pocket = decal(44, 28, (g) => {
    g.fillStyle = HOODIE[0];
    g.fillRect(0, 0, 44, 28);
    g.strokeStyle = "#2A2725";
    g.lineWidth = 1;
    roundRect(g, 9.5, 3.5, 27, 14, [3, 3, 6, 6]);
    g.stroke();
    g.fillStyle = "#2E2B29";
    g.fillRect(0, 22, 44, 6);
    g.fillStyle = "#4A4542";
    g.fillRect(0, 22, 44, 1);
  });
  box(54, 36, 26, HOODIE, body, BX, -40, 0, chest);
  box(44, 28, 22, HOODIE, body, BX, -71, 0, pocket);
  box(12, 9, 12, NECK, body, BX, -20, 0);

  // Jetpack: a pack on the back with two nozzles, and flames while flying.
  box(32, 30, 12, PACK, body, BX, -42, -19);
  box(3, 16, 1.4, ALL_PINK, body, BX, -40, -25.7);
  const flameOuter = keep(
    new THREE.MeshBasicMaterial({
      color: 0xff6f7d,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const flameInner = keep(flameOuter.clone());
  flameInner.color.set(0xffe3c2);
  const flames = [];
  for (const x of [BX - 9, BX + 9]) {
    add(
      new THREE.CylinderGeometry(4, 5.5, 8, 16),
      color("#1B1816"),
      body,
      x,
      -61,
      -19,
    );
    const flame = new THREE.Group();
    flame.position.set(x, -65, -19);
    body.add(flame);
    add(
      new THREE.ConeGeometry(5, 26, 14, 1, true),
      flameOuter,
      flame,
      0,
      -13,
    ).rotation.x = Math.PI;
    add(
      new THREE.ConeGeometry(2.6, 15, 10, 1, true),
      flameInner,
      flame,
      0,
      -7.5,
    ).rotation.x = Math.PI;
    flames.push(flame);
  }

  // Head: a dark box with a visor, two pink eyes and an antenna. It turns
  // at the neck.
  const head = new THREE.Group();
  head.position.set(BX, NECK_Y, 0);
  head.rotation.order = "YXZ";
  body.add(head);
  box(36, 32, 32, HEAD, head, 0, 16, 0);
  add(
    new THREE.PlaneGeometry(26, 16),
    decal(26, 16, (g) => {
      g.fillStyle = "#060503";
      g.strokeStyle = "#3A2A2C";
      g.lineWidth = 1;
      roundRect(g, 0.5, 0.5, 25, 15, 5);
      g.fill();
      g.stroke();
    }),
    head,
    0,
    17,
    16.05,
  );
  const eyes = new THREE.Group();
  eyes.position.set(0, 17, 16.1);
  head.add(eyes);
  const eyeGlow = keep(
    new THREE.MeshBasicMaterial({
      color: PINK,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  for (const x of [-6.5, 6.5]) {
    add(new THREE.PlaneGeometry(10, 12), eyeGlow, eyes, x, 0, -0.02);
    add(new THREE.PlaneGeometry(6, 8), color("#F27AA0"), eyes, x);
  }
  box(3, 14, 3, STALK, head, 0, 37, 0);
  add(new THREE.SphereGeometry(4, 16, 12), color("#E8638D"), head, 0, 45);

  // Limbs: two boxes and a joint block; hands, cuffs and sneakers.
  function limb([upper, lower], [w1, w2], colors) {
    return {
      upper: box(w1, upper, w1, colors, body),
      lower: box(w2, lower, w2, colors, body),
      joint: box(w2, w2, w2, colors, body),
      mid: new THREE.Vector3(),
      end: new THREE.Vector3(),
    };
  }
  const arms = {
    near: limb(ARM, [13, 12], SLEEVE),
    far: limb(ARM, [13, 12], SLEEVE),
  };
  const legs = {
    near: limb(LEG, [17, 15], TROUSERS),
    far: limb(LEG, [17, 15], TROUSERS),
  };
  const shoulders = {};
  const hipJoints = {};
  const hands = {};
  const cuffs = {};
  const boots = {};
  for (const side of ["near", "far"]) {
    shoulders[side] = new THREE.Vector3(SHOULDER[side], SHOULDER.y, 4);
    hipJoints[side] = new THREE.Vector3(HIP[side], HIP.y, 0);
    hands[side] = box(11, 15, 9, SKIN, body);
    cuffs[side] = box(12.6, 4, 12.6, ALL_PINK, body);
    boots[side] = box(18, 11, 26, SHOES, body);
  }

  const target = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const wave = new THREE.Vector3();
  const rest = new THREE.Vector3();
  const flyAt = new THREE.Vector3();

  function pose(part, from, goal, poleAt, sizes) {
    solveLimb(from, goal, sizes, poleAt, part.mid, part.end);
    placeBetween(part.upper, from, part.mid);
    placeBetween(part.lower, part.mid, part.end);
    part.joint.position.copy(part.mid);
    part.joint.quaternion.copy(part.lower.quaternion);
  }

  /**
   * Poses the robot and draws a frame. `p` holds the eased pose values from
   * ClimbingRobot (see REST there); `time` is in seconds; `anchorY` is the
   * anchor's position on the page, which keeps the rope's braid still.
   */
  function update(p, time, anchorY) {
    pivot.position.set(0, p.hiY, 0);
    pivot.rotation.z = rad(p.swing);
    // Flying: off the rope, a little to the left and forward.
    body.position.set(-24 * p.fly, p.bob - p.hiY, 8 * p.fly);
    body.rotation.y = rad(p.yaw);
    flames.forEach((flame, i) => {
      flame.visible = p.thrust > 0.02;
      flame.scale.set(1, p.thrust * (0.85 + 0.15 * Math.sin(time * 47 + i)), 1);
    });
    head.rotation.set(rad(p.headPitch), rad(p.headYaw), rad(p.headRoll));
    eyes.scale.y = p.eyes;
    braid.offset.y = -anchorY / BRAID;
    shadowMaterial.opacity = 0.55 * p.sit;
    floorShadow.visible = p.sit > 0.01;

    // The high hand grips the rope; the other grips it lower down, rests on
    // a knee while sitting, or waves. Flying, both hang at the sides.
    target.set(0, p.hiY - p.bob, 0).lerp(flyAt.set(BX + 34, -74, 2), p.fly);
    pole.set(26, -40, 8).lerp(flyAt.set(BX + 44, -50, -30), p.fly);
    pose(arms.near, shoulders.near, target, pole, ARM);
    wave.set(
      BX - 46 + 5 * Math.sin(time * 10),
      22 + 3 * Math.sin(time * 6),
      12,
    );
    rest.set(BX - 8, -60, 30);
    // It reaches across the chest to the front of the rope: a point on the
    // rope, in front, turned back by the body's yaw so it stays on screen.
    const yaw = rad(p.yaw);
    target
      .set(-REACH_Z * Math.sin(yaw), p.loY - p.bob, REACH_Z * Math.cos(yaw))
      .lerp(rest, p.rest)
      .lerp(wave, p.wave)
      .lerp(flyAt.set(BX - 34, -74, 2), p.fly);
    pole
      .set(BX - 10, -76, 40)
      .lerp(wave.set(BX - 60, -40, 10), p.wave)
      .lerp(flyAt.set(BX - 44, -50, -30), p.fly);
    pose(arms.far, shoulders.far, target, pole, ARM);
    for (const side of ["near", "far"]) {
      const arm = arms[side];
      lowerDir.subVectors(arm.end, arm.mid).normalize();
      hands[side].position.copy(arm.end).addScaledVector(lowerDir, 7);
      orient(hands[side], lowerDir);
      cuffs[side].position.copy(arm.end).addScaledVector(lowerDir, -2);
      orient(cuffs[side], lowerDir);
    }

    // Feet wrap the rope, rest on the floor with the knees up, or dangle in
    // flight.
    for (const side of ["near", "far"]) {
      const s = side === "near" ? "A" : "B";
      const hip = hipJoints[side];
      target
        .set(p[`f${s}x`], p[`f${s}y`] - p.bob, p[`f${s}z`])
        .lerp(flyAt.set(hip.x, -142, 4), p.fly);
      pole
        .set(hip.x + (side === "near" ? 6 : -6), -104, 40)
        .lerp(rest.set(hip.x, -40, 60), p.sit);
      pose(legs[side], hip, target, pole, LEG);
      boots[side].position.copy(legs[side].end).add(rest.set(0, -5, 4));
    }

    renderer.render(scene, camera);
  }

  function dispose() {
    for (const item of disposables) item.dispose();
    renderer.dispose();
  }

  return { update, dispose };
}

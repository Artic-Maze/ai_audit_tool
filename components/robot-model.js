import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/*
 * The climbing robot as a Three.js scene: a chrome humanoid with a round
 * helmet, a dark visor and glowing blue eyes, and a jetpack of twin rocket
 * tubes on its back, hugging a braided rope from the left. Loaded on demand
 * by ClimbingRobot, which drives it with update().
 *
 * Units are CSS pixels. The origin is the anchor: the point on the rope
 * level with the centre of the head. y points up, z toward the viewer, and
 * the rope runs along x = 0, z = 0.
 */

// The canvas covers this box around the anchor (keep in step with .canvas).
export const VIEW = { left: -120, right: 50, top: 46, bottom: -204 };

const BX = -34; // the body's centre line, left of the rope
const NECK_Y = -28;
const SHOULDER = { y: -42, near: BX + 22, far: BX - 22 };
const HIP = { y: -84, near: BX + 9, far: BX - 9 };
const ARM = [30, 28]; // shoulder to elbow, elbow to wrist
const LEG = [27, 26]; // hip to knee, knee to ankle
const REACH_Z = 18; // the lower hand grips the front of the rope
const BRAID = 9; // rope texture repeat, px

const rad = THREE.MathUtils.degToRad;
const UP = new THREE.Vector3(0, 1, 0);
const FRONT = new THREE.Vector3(0, 0, 1);
const dir = new THREE.Vector3();
const bend = new THREE.Vector3();
const lowerDir = new THREE.Vector3();

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

// Lays a mesh built along +y between two points.
function placeBetween(mesh, a, b) {
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  dir.subVectors(b, a).normalize();
  mesh.quaternion.setFromUnitVectors(UP, dir);
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"));
  return new THREE.CanvasTexture(canvas);
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 1.1;

  const camera = new THREE.OrthographicCamera(
    VIEW.left,
    VIEW.right,
    VIEW.top,
    VIEW.bottom,
    -400,
    400,
  );
  camera.position.z = 200;

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-80, 140, 160);
  const rim = new THREE.DirectionalLight(0x8fb8ff, 1.4);
  rim.position.set(120, 40, -100);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.2));

  // Polished chrome, dark gunmetal joints, a black glass visor.
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xc9d0d8,
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x2a2f37,
    metalness: 0.6,
    roughness: 0.38,
  });
  const visor = new THREE.MeshPhysicalMaterial({
    color: 0x05070b,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0x2f86ff,
    toneMapped: false,
  });
  const flameOuter = new THREE.MeshBasicMaterial({
    color: 0xff8a2a,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const flameInner = flameOuter.clone();
  flameInner.color.set(0xfff1b8);

  // The rope, braided, faded at the ends into the CSS rope behind the canvas.
  const braid = canvasTexture(32, 32, (g) => {
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
  });
  braid.colorSpace = THREE.SRGBColorSpace;
  braid.wrapS = braid.wrapT = THREE.RepeatWrapping;
  braid.repeat.set(2, (VIEW.top - VIEW.bottom) / BRAID);
  const fade = canvasTexture(1, 64, (g) => {
    const ramp = g.createLinearGradient(0, 0, 0, 64);
    ramp.addColorStop(0, "#000");
    ramp.addColorStop(0.16, "#fff");
    ramp.addColorStop(0.84, "#fff");
    ramp.addColorStop(1, "#000");
    g.fillStyle = ramp;
    g.fillRect(0, 0, 1, 64);
  });
  const shadow = canvasTexture(64, 16, (g) => {
    const blob = g.createRadialGradient(32, 8, 0, 32, 8, 32);
    blob.addColorStop(0, "rgba(0,0,0,0.9)");
    blob.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = blob;
    g.fillRect(0, 0, 64, 16);
  });
  const ropeMaterial = new THREE.MeshStandardMaterial({
    map: braid,
    alphaMap: fade,
    transparent: true,
    roughness: 0.55,
  });
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadow,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });

  const disposables = [
    chrome,
    dark,
    visor,
    glow,
    flameOuter,
    flameInner,
    ropeMaterial,
    shadowMaterial,
    braid,
    fade,
    shadow,
    environment,
  ];
  const add = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    disposables.push(geometry);
    return mesh;
  };
  const rounded = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r);

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
    ropeMaterial,
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

  // Torso: neck, chest, segmented waist, hips.
  add(new THREE.CylinderGeometry(6, 7, 10, 20), dark, body, BX, -33);
  add(rounded(40, 27, 26, 10), chrome, body, BX, -51);
  add(new THREE.CylinderGeometry(12, 11, 5, 24), dark, body, BX, -66);
  add(new THREE.CylinderGeometry(11.5, 10.5, 5, 24), chrome, body, BX, -71);
  add(rounded(32, 13, 22, 5), chrome, body, BX, -80);

  // Jetpack: a back plate with twin rocket tubes on each side, and flames
  // and a warm light while flying.
  add(rounded(30, 30, 6, 3), chrome, body, BX, -51, -16);
  const flames = [];
  for (const x of [BX - 27, BX - 19, BX + 19, BX + 27]) {
    add(
      new THREE.CylinderGeometry(4.2, 4.2, 26, 18),
      chrome,
      body,
      x,
      -55,
      -21,
    );
    add(new THREE.ConeGeometry(4.2, 7, 18), chrome, body, x, -38.5, -21);
    add(new THREE.CylinderGeometry(3.4, 4.6, 5, 16), dark, body, x, -70.5, -21);
    const flame = new THREE.Group();
    flame.position.set(x, -73, -21);
    body.add(flame);
    add(
      new THREE.ConeGeometry(4, 24, 14, 1, true),
      flameOuter,
      flame,
      0,
      -12,
    ).rotation.x = Math.PI;
    add(
      new THREE.ConeGeometry(2, 14, 10, 1, true),
      flameInner,
      flame,
      0,
      -7,
    ).rotation.x = Math.PI;
    flames.push(flame);
  }
  const thruster = new THREE.PointLight(0xff9a3c, 0, 160, 2);
  thruster.position.set(BX, -86, -10);
  body.add(thruster);

  // Head: a chrome sphere with a dark visor band, two round blue eyes, an
  // ear disc and an antenna on one side.
  const head = new THREE.Group();
  head.position.set(BX, NECK_Y, 0);
  head.rotation.order = "YXZ";
  body.add(head);
  add(new THREE.SphereGeometry(30, 40, 28), chrome, head, 0, 28);
  add(
    new THREE.SphereGeometry(30.7, 40, 14, Math.PI / 2 - 1.25, 2.5, 0.98, 0.78),
    visor,
    head,
    0,
    28,
  );
  const eyes = new THREE.Group();
  eyes.position.set(0, 34, 0);
  head.add(eyes);
  for (const side of [-1, 1]) {
    const eye = add(new THREE.CircleGeometry(5.6, 28), glow, eyes);
    eye.position.set(side * 9.2, 0, 28.9);
    eye.rotation.set(rad(-11), side * rad(18), 0);
  }
  const ear = add(
    new THREE.CylinderGeometry(7.5, 7.5, 4, 24),
    chrome,
    head,
    30,
    28,
  );
  ear.rotation.z = Math.PI / 2;
  add(
    new THREE.CylinderGeometry(4.5, 4.5, 4.6, 20),
    dark,
    head,
    30.4,
    28,
  ).rotation.z = Math.PI / 2;
  const antenna = add(
    new THREE.CylinderGeometry(0.9, 0.9, 24, 8),
    chrome,
    head,
    27,
    50,
  );
  antenna.rotation.z = rad(-14);
  add(new THREE.SphereGeometry(1.8, 12, 8), chrome, head, 30, 62);

  // Limbs: two chrome capsules, a gunmetal joint with a band, and a hand or
  // boot.
  function limb([upper, lower], [r1, r2]) {
    return {
      upper: add(
        new THREE.CapsuleGeometry(r1, upper - r1, 6, 16),
        chrome,
        body,
      ),
      lower: add(
        new THREE.CapsuleGeometry(r2, lower - r2, 6, 16),
        chrome,
        body,
      ),
      joint: add(new THREE.SphereGeometry(r2 + 0.8, 20, 14), dark, body),
      ring: add(new THREE.TorusGeometry(r2 + 1, 1.2, 8, 24), dark, body),
      mid: new THREE.Vector3(),
      end: new THREE.Vector3(),
    };
  }
  const arms = { near: limb(ARM, [5.5, 5]), far: limb(ARM, [5.5, 5]) };
  const legs = { near: limb(LEG, [7.5, 6.8]), far: limb(LEG, [7.5, 6.8]) };
  const shoulders = {};
  const hips = {};
  const hands = {};
  const cuffs = {};
  const boots = {};
  for (const side of ["near", "far"]) {
    shoulders[side] = new THREE.Vector3(SHOULDER[side], SHOULDER.y, 4);
    hips[side] = new THREE.Vector3(HIP[side], HIP.y, 0);
    add(
      new THREE.SphereGeometry(8.5, 24, 16),
      chrome,
      body,
      SHOULDER[side],
      SHOULDER.y,
    );
    add(new THREE.SphereGeometry(7, 20, 14), dark, body, HIP[side], HIP.y);
    hands[side] = add(rounded(11, 12, 9, 3.5), chrome, body);
    cuffs[side] = add(new THREE.CylinderGeometry(5.8, 5.8, 3, 18), dark, body);
    const boot = new THREE.Group();
    body.add(boot);
    add(rounded(17, 12, 24, 5), chrome, boot, 0, 0, 3);
    add(rounded(18, 3.5, 25, 1.5), dark, boot, 0, -6, 3);
    boots[side] = boot;
  }

  const target = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const wave = new THREE.Vector3();
  const rest = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const upperDir = new THREE.Vector3();
  const flyAt = new THREE.Vector3();

  function pose(part, root, goal, poleAt, sizes) {
    solveLimb(root, goal, sizes, poleAt, part.mid, part.end);
    placeBetween(part.upper, root, part.mid);
    placeBetween(part.lower, part.mid, part.end);
    part.joint.position.copy(part.mid);
    part.ring.position.copy(part.mid);
    upperDir.subVectors(part.mid, root).normalize();
    lowerDir.subVectors(part.end, part.mid).normalize();
    normal.crossVectors(upperDir, lowerDir);
    if (normal.lengthSq() < 1e-6) normal.copy(FRONT);
    part.ring.quaternion.setFromUnitVectors(FRONT, normal.normalize());
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
    thruster.intensity = 800 * p.thrust;
    head.rotation.set(rad(p.headPitch), rad(p.headYaw), rad(p.headRoll));
    eyes.scale.y = p.eyes;
    braid.offset.y = -anchorY / BRAID;
    shadowMaterial.opacity = 0.55 * p.sit;
    floorShadow.visible = p.sit > 0.01;

    // The high hand grips the rope; the other grips it lower down, rests on
    // a knee while sitting, or waves. Flying, both hang at the sides.
    target.set(0, p.hiY - p.bob, 0).lerp(flyAt.set(BX + 30, -82, 2), p.fly);
    pole.set(26, -50, 8).lerp(flyAt.set(BX + 40, -60, -30), p.fly);
    pose(arms.near, shoulders.near, target, pole, ARM);
    wave.set(
      BX - 46 + 5 * Math.sin(time * 10),
      18 + 3 * Math.sin(time * 6),
      12,
    );
    rest.set(BX - 8, -66, 30);
    // It reaches across the chest to the front of the rope: a point on the
    // rope, in front, turned back by the body's yaw so it stays on screen.
    const yaw = rad(p.yaw);
    target
      .set(-REACH_Z * Math.sin(yaw), p.loY - p.bob, REACH_Z * Math.cos(yaw))
      .lerp(rest, p.rest)
      .lerp(wave, p.wave)
      .lerp(flyAt.set(BX - 32, -82, 2), p.fly);
    pole
      .set(BX - 10, -84, 40)
      .lerp(wave.set(BX - 60, -50, 10), p.wave)
      .lerp(flyAt.set(BX - 40, -60, -30), p.fly);
    pose(arms.far, shoulders.far, target, pole, ARM);
    for (const side of ["near", "far"]) {
      const arm = arms[side];
      lowerDir.subVectors(arm.end, arm.mid).normalize();
      hands[side].position.copy(arm.end).addScaledVector(lowerDir, 6);
      hands[side].quaternion.setFromUnitVectors(UP, lowerDir);
      cuffs[side].position.copy(arm.end).addScaledVector(lowerDir, -2);
      cuffs[side].quaternion.setFromUnitVectors(UP, lowerDir);
    }

    // Feet wrap the rope, rest on the floor with the knees up, or dangle in
    // flight.
    for (const side of ["near", "far"]) {
      const s = side === "near" ? "A" : "B";
      target
        .set(p[`f${s}x`], p[`f${s}y`] - p.bob, p[`f${s}z`])
        .lerp(flyAt.set(hips[side].x, -140, 4), p.fly);
      pole
        .set(hips[side].x + (side === "near" ? 6 : -6), -104, 40)
        .lerp(rest.set(hips[side].x, -40, 60), p.sit);
      pose(legs[side], hips[side], target, pole, LEG);
      boots[side].position.copy(legs[side].end).add(rest.set(0, -4, 0));
    }

    renderer.render(scene, camera);
  }

  function dispose() {
    for (const item of disposables) item.dispose();
    renderer.dispose();
  }

  return { update, dispose };
}

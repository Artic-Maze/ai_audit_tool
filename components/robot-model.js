import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/*
 * The climbing robot as a Three.js scene: a glossy white mascot with a black
 * visor, glowing eyes and ear lights, hugging a braided rope from the left.
 * Loaded on demand by ClimbingRobot, which drives it with update().
 *
 * Units are CSS pixels. The origin is the anchor: the point on the rope
 * level with the centre of the head. y points up, z toward the viewer, and
 * the rope runs along x = 0, z = 0.
 */

// The canvas covers this box around the anchor (keep in step with .canvas).
export const VIEW = { left: -120, right: 50, top: 46, bottom: -204 };

const BX = -34; // the body's centre line, left of the rope
const NECK_Y = -28;
const SHOULDER = { y: -42, near: BX + 24, far: BX - 24 };
const HIP = { y: -84, near: BX + 10, far: BX - 10 };
const ARM = [30, 28]; // shoulder to elbow, elbow to wrist
const REACH_Z = 18; // the lower hand grips the front of the rope
const LEG = [27, 26]; // hip to knee, knee to ankle
const BRAID = 14; // rope texture repeat, px

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
  scene.environmentIntensity = 0.75;

  const camera = new THREE.OrthographicCamera(
    VIEW.left,
    VIEW.right,
    VIEW.top,
    VIEW.bottom,
    -400,
    400,
  );
  camera.position.z = 200;

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-80, 140, 160);
  const rim = new THREE.DirectionalLight(0x6aa8ff, 1.6);
  rim.position.set(120, 40, -100);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.3));

  const white = new THREE.MeshPhysicalMaterial({
    color: 0xf1f3f7,
    roughness: 0.32,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x262b34,
    roughness: 0.45,
    metalness: 0.25,
  });
  const visor = new THREE.MeshPhysicalMaterial({
    color: 0x05070b,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0x5cb2ff,
    toneMapped: false,
  });

  // The rope, braided, faded at the ends into the CSS rope behind the canvas.
  const braid = canvasTexture(32, 32, (g) => {
    g.fillStyle = "#a8773b";
    g.fillRect(0, 0, 32, 32);
    g.lineWidth = 7;
    g.strokeStyle = "#d9ae6c";
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
    roughness: 0.85,
  });
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadow,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });

  const disposables = [
    white,
    dark,
    visor,
    glow,
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
    new THREE.CylinderGeometry(6, 6, VIEW.top - VIEW.bottom, 20, 1, true),
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

  // Torso.
  add(new THREE.CylinderGeometry(7, 8, 10, 20), dark, body, BX, -33);
  add(rounded(46, 30, 32, 11), white, body, BX, -52);
  add(rounded(18, 3, 2, 1), glow, body, BX, -46, 16.4);
  add(rounded(30, 28, 12, 6), white, body, BX, -50, -21);
  add(rounded(3, 14, 1.6, 0.7), glow, body, BX, -50, -27.6);
  add(new THREE.CylinderGeometry(15, 13, 10, 24), dark, body, BX, -70);
  add(rounded(40, 16, 28, 7), white, body, BX, -80);
  add(new THREE.BoxGeometry(41, 3.5, 29), dark, body, BX, -79);
  add(new THREE.SphereGeometry(1.8, 12, 8), glow, body, BX, -79, 14.8);

  // Head: shell, top band, visor, eyes like "^ ^", ear lights.
  const head = new THREE.Group();
  head.position.set(BX, NECK_Y, 0);
  head.rotation.order = "YXZ";
  body.add(head);
  add(rounded(62, 52, 54, 20), white, head, 0, 28);
  add(rounded(18, 8, 46, 3), dark, head, 0, 52, -2);
  add(rounded(50, 34, 10, 9), visor, head, 0, 25, 23);
  const eyes = new THREE.Group();
  eyes.position.set(0, 23, 28.6);
  head.add(eyes);
  for (const x of [-11, 11]) {
    add(new THREE.TorusGeometry(6.5, 2.2, 10, 24, Math.PI), glow, eyes, x);
  }
  for (const side of [-1, 1]) {
    const ear = add(
      new THREE.CylinderGeometry(11, 11, 8, 28),
      white,
      head,
      side * 32,
      26,
    );
    ear.rotation.z = Math.PI / 2;
    const ring = add(
      new THREE.TorusGeometry(7, 1.8, 10, 28),
      glow,
      head,
      side * 36.2,
      26,
    );
    ring.rotation.y = Math.PI / 2;
  }

  // Limbs: two capsules, a dark joint with a light ring, and a hand or boot.
  function limb([upper, lower], thickness) {
    const [r1, r2] = thickness;
    return {
      upper: add(new THREE.CapsuleGeometry(r1, upper - r1, 6, 16), white, body),
      lower: add(new THREE.CapsuleGeometry(r2, lower - r2, 6, 16), white, body),
      joint: add(new THREE.SphereGeometry(r2 + 0.8, 20, 14), dark, body),
      ring: add(new THREE.TorusGeometry(r2 + 1.2, 1.1, 8, 24), glow, body),
      mid: new THREE.Vector3(),
      end: new THREE.Vector3(),
    };
  }
  const arms = { near: limb(ARM, [6.5, 6]), far: limb(ARM, [6.5, 6]) };
  const legs = { near: limb(LEG, [8.5, 7.5]), far: limb(LEG, [8.5, 7.5]) };
  const shoulders = {};
  const hips = {};
  const hands = {};
  const cuffs = {};
  const boots = {};
  for (const side of ["near", "far"]) {
    shoulders[side] = new THREE.Vector3(SHOULDER[side], SHOULDER.y, 4);
    hips[side] = new THREE.Vector3(HIP[side], HIP.y, 0);
    add(
      new THREE.SphereGeometry(9.5, 24, 16),
      white,
      body,
      SHOULDER[side],
      SHOULDER.y,
    );
    add(new THREE.SphereGeometry(8, 20, 14), dark, body, HIP[side], HIP.y);
    hands[side] = add(rounded(12, 13, 10, 4), white, body);
    cuffs[side] = add(new THREE.CylinderGeometry(6.8, 6.8, 3, 18), dark, body);
    const boot = new THREE.Group();
    body.add(boot);
    add(rounded(19, 13, 27, 5), white, boot, 0, 0, 4);
    add(rounded(20, 4, 28, 1.5), dark, boot, 0, -6, 4);
    add(
      new THREE.SphereGeometry(1.8, 12, 8),
      glow,
      boot,
      side === "near" ? 9.6 : -9.6,
      1,
      6,
    );
    boots[side] = boot;
  }

  const target = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const wave = new THREE.Vector3();
  const rest = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const upperDir = new THREE.Vector3();

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
    body.position.set(0, p.bob - p.hiY, 0);
    body.rotation.y = rad(p.yaw);
    head.rotation.set(rad(p.headPitch), rad(p.headYaw), rad(p.headRoll));
    eyes.scale.y = p.eyes;
    braid.offset.y = -anchorY / BRAID;
    shadowMaterial.opacity = 0.55 * p.sit;
    floorShadow.visible = p.sit > 0.01;

    // The high hand grips the rope; the other grips it lower down, rests on
    // a knee while sitting, or waves.
    target.set(0, p.hiY - p.bob, 0);
    pole.set(26, -50, 8);
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
      .lerp(wave, p.wave);
    pole.set(BX - 10, -84, 40).lerp(wave.set(BX - 60, -50, 10), p.wave);
    pose(arms.far, shoulders.far, target, pole, ARM);
    for (const side of ["near", "far"]) {
      const arm = arms[side];
      lowerDir.subVectors(arm.end, arm.mid).normalize();
      hands[side].position.copy(arm.end).addScaledVector(lowerDir, 6);
      hands[side].quaternion.setFromUnitVectors(UP, lowerDir);
      cuffs[side].position.copy(arm.end).addScaledVector(lowerDir, -2);
      cuffs[side].quaternion.setFromUnitVectors(UP, lowerDir);
    }

    // Feet wrap the rope, or rest on the floor with the knees up.
    for (const side of ["near", "far"]) {
      const s = side === "near" ? "A" : "B";
      target.set(p[`f${s}x`], p[`f${s}y`] - p.bob, p[`f${s}z`]);
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

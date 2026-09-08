// NepalMBBS.in — medical-icons-scene.js
//
// Genuine WebGL 3D: real geometry (not sprites, not a skybox), real
// lighting via a generated environment map (so the crystal material
// actually reflects/refracts something), floating and rotating on their
// own gentle cycles. Five shapes, each built procedurally from Three.js
// primitives/curves rather than an imported model file — there is no
// licensed medical 3D asset in this repository, and shipping one without
// a source would be exactly the kind of unsourced asset this project's own
// content rules already forbid for photography. What is here is honest
// about what it is: five considered, hand-built shapes, not photoreal
// scans.
//
//   1. A stethoscope — a tube swept along a curved path (the tubing) plus
//      a flattened cylinder (the chest piece) and two small tori (the
//      earpieces). Redrawn rounder in this pass to actually read as a
//      stethoscope at a glance, matching the 2D fallback icon.
//   2. A pulse/ECG trace — a tube swept along the classic heartbeat
//      zigzag, extruded into 3D rather than drawn flat.
//   3. A capsule — medicine's own shape (THREE.CapsuleGeometry), standing
//      in for "medicine" the way the stethoscope stands in for "clinical".
//   4. A DNA double helix — two tubes wound around a shared axis with
//      rungs between them, standing in for "biology" the way the cross
//      stands in for "medical".
//   5. A medical cross — an extruded, bevelled 2D cross shape.
//
// Material: MeshPhysicalMaterial with transmission (real glass, not a
// blurred-rectangle approximation) — the same "crystal" language the
// site's Crystal CTA button already uses, now literally three-dimensional.
// Tuned for the LIGHT ground this site uses: a light-coloured environment
// map and a soft key light, not the black-ground tuning an earlier pass
// used, which is why this file is new rather than reviving the old one.
//
// Scaled down and desaturated from the first pass, which read as heavy,
// oversaturated shapes competing with the hero copy for attention — the
// owner's brief was explicit that the colour must never "block a view".
// Every colour here is mixed toward white before it reaches the material,
// and every object is roughly 40% smaller than the first pass.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// A soft physical-glass material shared by every shape, parameterised only
// by colour — keeps the five objects visually consistent (same "material
// language") and keeps this file from repeating the same six properties
// five times.
function crystalMaterial(color, tint = 0.32) {
  const c = new THREE.Color(color).lerp(new THREE.Color(0xffffff), tint);
  return new THREE.MeshPhysicalMaterial({
    color: c, metalness: 0.04, roughness: 0.16,
    transmission: 0.68, thickness: 0.5, ior: 1.38,
    clearcoat: 0.5, clearcoatRoughness: 0.25,
  });
}

// Rounder than the first pass: a closed loop from the two earpieces down to
// a single tube, mirroring the 2D fallback icon (and the 🩺 emoji's own
// grammar) instead of an open, ambiguous squiggle.
function buildStethoscope(color) {
  const group = new THREE.Group();
  const mat = crystalMaterial(color);

  const pts = [
    new THREE.Vector3(-0.42, 0.62, 0),
    new THREE.Vector3(-0.5, 0.4, 0.05),
    new THREE.Vector3(-0.3, 0.18, 0.05),
    new THREE.Vector3(0, 0.18, 0),
    new THREE.Vector3(0.3, 0.18, -0.05),
    new THREE.Vector3(0.5, 0.4, -0.05),
    new THREE.Vector3(0.42, 0.62, 0),
  ];
  const loop = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 48, 0.032, 8, false), mat));

  const drop = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.18, 0),
    new THREE.Vector3(-0.02, -0.15, 0.03),
    new THREE.Vector3(0.02, -0.42, 0),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(drop, 24, 0.032, 8, false), mat));

  // Chest piece — a flattened cylinder at the tube's lower end.
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32), mat);
  disc.position.set(0.02, -0.5, 0);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // Earpieces — two small tori near the top ends.
  [-0.42, 0.42].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 12, 24), mat);
    ring.position.set(x, 0.66, 0);
    group.add(ring);
  });

  group.scale.setScalar(0.62);
  return group;
}

function buildPulseTrace(color) {
  const pts = [
    new THREE.Vector3(-0.75, 0, 0),
    new THREE.Vector3(-0.4, 0, 0),
    new THREE.Vector3(-0.27, 0.1, 0),
    new THREE.Vector3(-0.17, -0.47, 0),
    new THREE.Vector3(-0.03, 0.68, 0),
    new THREE.Vector3(0.1, -0.1, 0),
    new THREE.Vector3(0.24, 0, 0),
    new THREE.Vector3(0.75, 0, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
  const tube = new THREE.TubeGeometry(curve, 96, 0.034, 10, false);
  const mesh = new THREE.Mesh(tube, crystalMaterial(color));
  mesh.scale.setScalar(0.62);
  return mesh;
}

// Medicine's own shape — two capped half-cylinders, standing in for
// "medicine" the way the stethoscope stands in for "clinical".
function buildCapsule(color) {
  const geo = new THREE.CapsuleGeometry(0.16, 0.42, 6, 14);
  const mesh = new THREE.Mesh(geo, crystalMaterial(color, 0.4));
  mesh.rotation.z = Math.PI / 2.6;
  mesh.scale.setScalar(0.62);
  return mesh;
}

// A DNA double helix — two tubes wound around a shared axis, with short
// rungs between them at regular intervals. Standing in for "biology" the
// way the cross stands in for "medical". Built from parametric points
// rather than an imported model, same as every other shape here.
function buildDnaHelix(color) {
  const group = new THREE.Group();
  const mat = crystalMaterial(color, 0.4);
  const turns = 2.1, height = 1.1, radius = 0.22, steps = 40;

  const strandA = [];
  const strandB = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const y = t * height - height / 2;
    strandA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    strandB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
  }

  [strandA, strandB].forEach((pts) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.024, 6, false), mat));
  });

  // Rungs between the strands, evenly spaced along the axis.
  const rungCount = 7;
  for (let i = 0; i < rungCount; i++) {
    const t = i / (rungCount - 1);
    const angle = t * turns * Math.PI * 2;
    const y = t * height - height / 2;
    const a = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    const b = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
    const rungCurve = new THREE.CatmullRomCurve3([a, b]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(rungCurve, 4, 0.014, 5, false), mat));
  }

  group.scale.setScalar(0.62);
  return group;
}

function buildCross(color) {
  const shape = new THREE.Shape();
  const a = 0.22, b = 0.7; // arm half-width, arm length
  shape.moveTo(-a, b); shape.lineTo(a, b); shape.lineTo(a, a);
  shape.lineTo(b, a); shape.lineTo(b, -a); shape.lineTo(a, -a);
  shape.lineTo(a, -b); shape.lineTo(-a, -b); shape.lineTo(-a, -a);
  shape.lineTo(-b, -a); shape.lineTo(-b, a); shape.lineTo(-a, a);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22, bevelEnabled: true, bevelThickness: 0.05,
    bevelSize: 0.04, bevelSegments: 4, curveSegments: 2,
  });
  geo.center();
  const mesh = new THREE.Mesh(geo, crystalMaterial(color, 0.4));
  mesh.scale.setScalar(0.62);
  return mesh;
}

export function mountMedicalIconsScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) {
    return null; // no WebGL — the CSS/SVG field already underneath is a finished hero on its own.
  }
  if (!renderer) return null;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(0, 0, 6.2);

  // A light, neutral environment (not the dark-tuned one an earlier pass
  // used) so the glass material reflects something appropriate to a
  // clinical, light-ground page rather than carrying a dark cast into it.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  scene.environment = env;

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.AmbientLight(0xdfe8ff, 0.55);
  scene.add(fill);

  // Brand tokens, read at mount time — falls back to the site's own blue/
  // teal if CSS custom properties are for some reason unavailable, never
  // to a hard-coded colour disconnected from the theme.
  const cs = getComputedStyle(document.documentElement);
  const brand = new THREE.Color((cs.getPropertyValue('--brand') || '#2464E0').trim());
  const brand2 = new THREE.Color((cs.getPropertyValue('--brand-2') || '#20B78E').trim());

  const stetho = buildStethoscope(brand);
  stetho.position.set(-1.7, 0.7, 0);
  scene.add(stetho);

  const pulse = buildPulseTrace(brand2);
  pulse.position.set(0.15, -0.85, -0.5);
  scene.add(pulse);

  const capsule = buildCapsule(brand);
  capsule.position.set(1.75, 0.85, -0.2);
  scene.add(capsule);

  const dna = buildDnaHelix(brand2);
  dna.position.set(-1.6, -0.75, -0.4);
  scene.add(dna);

  const cross = buildCross(brand.clone().lerp(brand2, 0.5));
  cross.position.set(1.3, -1.25, -0.3);
  scene.add(cross);

  const objects = [
    { mesh: stetho, spin: 0.05, floatAmp: 0.16, floatSpeed: 0.35, phase: 0 },
    { mesh: pulse, spin: -0.07, floatAmp: 0.13, floatSpeed: 0.28, phase: 2.1 },
    { mesh: capsule, spin: 0.08, floatAmp: 0.15, floatSpeed: 0.33, phase: 1.3 },
    { mesh: dna, spin: -0.04, floatAmp: 0.12, floatSpeed: 0.24, phase: 3.4 },
    { mesh: cross, spin: 0.06, floatAmp: 0.17, floatSpeed: 0.31, phase: 4.2 },
  ];

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let raf = 0;
  const clock = new THREE.Clock();
  let visible = true;
  const onVis = () => { visible = document.visibilityState === 'visible'; };
  document.addEventListener('visibilitychange', onVis);

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible) return; // no point spending GPU/battery on a hidden tab
    const t = clock.getElapsedTime();
    objects.forEach((o) => {
      o.mesh.rotation.y += o.spin * 0.01;
      o.mesh.rotation.x = Math.sin(t * o.floatSpeed + o.phase) * 0.15;
      o.mesh.position.y += 0; // base y already set; float applied below
      o.mesh.position.y = o.mesh.userData.baseY ?? (o.mesh.userData.baseY = o.mesh.position.y);
      o.mesh.position.y = o.mesh.userData.baseY + Math.sin(t * o.floatSpeed + o.phase) * o.floatAmp;
    });
    scene.rotation.y = Math.sin(t * 0.06) * 0.08;
    renderer.render(scene, camera);
  }

  // A single static frame if the visitor has asked for reduced motion —
  // real 3D, real light, real material, just not turning. Never "no scene
  // at all" for a preference about motion, only about movement.
  if (reduce) {
    renderer.render(scene, camera);
  } else {
    tick();
  }

  return {
    stop() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose?.();
      });
      env?.dispose?.();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

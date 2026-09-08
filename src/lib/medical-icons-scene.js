// NepalMBBS.in — medical-icons-scene.js
//
// Genuine WebGL 3D: real geometry (not sprites, not a skybox), real
// lighting via a generated environment map (so the crystal material
// actually reflects/refracts something), floating and rotating on their
// own gentle cycles. Three shapes, each built procedurally from Three.js
// primitives/curves rather than an imported model file — there is no
// licensed medical 3D asset in this repository, and shipping one without
// a source would be exactly the kind of unsourced asset this project's own
// content rules already forbid for photography. What is here is honest
// about what it is: three considered, hand-built shapes, not photoreal
// scans.
//
//   1. A stethoscope — a tube swept along a curved path (the tubing) plus
//      a flattened cylinder (the chest piece) and two small tori (the
//      earpieces).
//   2. A pulse/ECG trace — a tube swept along the classic heartbeat
//      zigzag, extruded into 3D rather than drawn flat.
//   3. A medical cross — an extruded, bevelled 2D cross shape.
//
// Material: MeshPhysicalMaterial with transmission (real glass, not a
// blurred-rectangle approximation) — the same "crystal" language the
// site's Crystal CTA button already uses, now literally three-dimensional.
// Tuned for the LIGHT ground this site uses: a light-coloured environment
// map and a soft key light, not the black-ground tuning an earlier pass
// used, which is why this file is new rather than reviving the old one.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function buildStethoscope(color) {
  const group = new THREE.Group();

  const pts = [
    new THREE.Vector3(-0.9, 0.9, 0),
    new THREE.Vector3(-0.55, 1.05, 0.1),
    new THREE.Vector3(-0.15, 0.85, 0),
    new THREE.Vector3(0.15, 0.5, -0.1),
    new THREE.Vector3(0.05, 0.05, 0),
    new THREE.Vector3(-0.05, -0.4, 0.1),
    new THREE.Vector3(0.05, -0.85, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 64, 0.055, 10, false);
  const mat = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.05, roughness: 0.12,
    transmission: 0.55, thickness: 0.6, ior: 1.4,
    clearcoat: 0.6, clearcoatRoughness: 0.2,
  });
  group.add(new THREE.Mesh(tube, mat));

  // Chest piece — a flattened cylinder at the tube's lower end.
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.08, 32),
    mat
  );
  disc.position.set(0.05, -0.9, 0);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // Earpieces — two small tori near the top ends.
  [-0.9, -0.55].forEach((x, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 12, 24), mat);
    ring.position.set(x + (i === 0 ? -0.05 : 0.05), 0.95 + i * 0.1, 0);
    group.add(ring);
  });

  group.scale.setScalar(0.85);
  return group;
}

function buildPulseTrace(color) {
  const pts = [
    new THREE.Vector3(-1.1, 0, 0),
    new THREE.Vector3(-0.6, 0, 0),
    new THREE.Vector3(-0.4, 0.15, 0),
    new THREE.Vector3(-0.25, -0.7, 0),
    new THREE.Vector3(-0.05, 1.0, 0),
    new THREE.Vector3(0.15, -0.15, 0),
    new THREE.Vector3(0.35, 0, 0),
    new THREE.Vector3(1.1, 0, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
  const tube = new THREE.TubeGeometry(curve, 96, 0.05, 10, false);
  const mat = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.05, roughness: 0.1,
    transmission: 0.55, thickness: 0.5, ior: 1.4,
    clearcoat: 0.6, clearcoatRoughness: 0.2,
  });
  const mesh = new THREE.Mesh(tube, mat);
  mesh.scale.setScalar(0.85);
  return mesh;
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
  const mat = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.05, roughness: 0.1,
    transmission: 0.5, thickness: 0.7, ior: 1.4,
    clearcoat: 0.7, clearcoatRoughness: 0.15,
  });
  return new THREE.Mesh(geo, mat);
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
  stetho.position.set(-1.7, 0.6, 0);
  scene.add(stetho);

  const pulse = buildPulseTrace(brand2);
  pulse.position.set(0.1, -0.9, -0.6);
  scene.add(pulse);

  const cross = buildCross(brand.clone().lerp(brand2, 0.5));
  cross.position.set(1.9, 0.9, -0.3);
  scene.add(cross);

  const objects = [
    { mesh: stetho, spin: 0.05, floatAmp: 0.18, floatSpeed: 0.35, phase: 0 },
    { mesh: pulse, spin: -0.07, floatAmp: 0.14, floatSpeed: 0.28, phase: 2.1 },
    { mesh: cross, spin: 0.06, floatAmp: 0.2, floatSpeed: 0.31, phase: 4.2 },
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

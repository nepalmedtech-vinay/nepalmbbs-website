// NepalMBBS.in — crystal-scene.js
//
// A real 3D glass object for the homepage hero: actual geometry, a physical
// glass material (transmission + IOR, not a blurred rectangle), lit by a
// generated environment so it genuinely reflects and refracts, slowly
// turning and drifting toward the pointer. This exists because the CSS
// glassmorphism system elsewhere on this site (glass.css) is a real,
// working technique but is still fundamentally a flat, blurred, translucent
// panel — it cannot produce a lit facet or a caustic the way an actual 3D
// scene can, and the owner asked specifically for the difference.
//
// No external assets: the environment map is generated in-browser
// (RoomEnvironment + PMREMGenerator, three's own built-in approach for
// exactly this "give glass something to reflect without shipping an HDR
// file" problem), and every shape is a Three.js primitive. Nothing here
// claims to depict anything real — it is decorative, like the aurora field
// or the map's graticule, not a stand-in for a photograph.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

export function mountCrystalScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) {
    return false; // no WebGL — the CSS field this sits over is already a finished hero on its own.
  }
  if (!renderer) return false;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.3, 7.2);

  // A small room of neutral panels, baked to a PMREM cubemap once — this is
  // what makes the glass show believable reflections/highlights rather than
  // reading as plain grey transmission. Three's own documented technique;
  // no HDR download, no network request.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const brand = getBrandColors();

  // Coloured point lights so the facets pick up the site's own palette
  // rather than reading as generic clear glass.
  const keyLight = new THREE.PointLight(brand.blue, 22, 20);
  keyLight.position.set(3.5, 2.5, 4);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(brand.teal, 14, 20);
  rimLight.position.set(-3, -1.5, 2.5);
  scene.add(rimLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const group = new THREE.Group();
  scene.add(group);

  const glassMat = (tint, roughness) => new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0,
    roughness,
    transmission: 1,
    thickness: 1.4,
    ior: 1.5,
    envMapIntensity: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    attenuationColor: tint,
    attenuationDistance: 1.2,
  });

  // The centrepiece: a faceted crystal, not a smooth sphere — an
  // icosahedron reads as "cut glass" the instant it catches a highlight,
  // which a sphere never does.
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 1), glassMat(0xeaf1ff, 0.06));
  group.add(core);

  // Two smaller satellites, one per brand hue, on their own slow orbits —
  // echoes the "a figure per colour" idea the hero's stat chips already
  // use, in actual 3D this time.
  const satelliteGeo = [
    new THREE.TorusGeometry(0.62, 0.16, 24, 64),
    new THREE.IcosahedronGeometry(0.5, 0),
  ];
  const satellites = [
    new THREE.Mesh(satelliteGeo[0], glassMat(brand.blue, 0.12)),
    new THREE.Mesh(satelliteGeo[1], glassMat(brand.teal, 0.15)),
  ];
  satellites[0].position.set(-2.3, 0.9, 0.6);
  satellites[0].rotation.set(0.6, 0.4, 0);
  satellites[1].position.set(2.15, -1.1, -0.4);
  group.add(satellites[0], satellites[1]);

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Pointer parallax — the camera drifts a little toward the cursor rather
  // than the object itself tilting, which keeps the facets' own rotation
  // (below) reading as the object's constant, and the parallax reading as
  // the viewer's.
  let px = 0, py = 0;
  window.addEventListener('pointermove', (e) => {
    px = (e.clientX / window.innerWidth - 0.5) * 2;
    py = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let raf = 0, running = true;
  const clock = new THREE.Clock();
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) tick();
  });

  // The one thing CSS genuinely cannot do here: animate a Three.js object's
  // own properties (scale, camera distance) as a real entrance rather than
  // the object simply appearing mid-rotation. GSAP is used for exactly this
  // and nothing else — every other motion on this site is still CSS
  // (animation-timeline / animation-delay), and this scene's own ongoing
  // rotation below stays a plain rAF loop, not a GSAP ticker.
  group.scale.setScalar(0.001);
  camera.position.z = 9.5;
  const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
  entrance
    .to(group.scale, { x: 1, y: 1, z: 1, duration: 1.4 }, 0)
    .to(camera.position, { z: 7.2, duration: 1.6 }, 0)
    .from(group.rotation, { y: -1.4, duration: 1.8, ease: 'power2.out' }, 0);

  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    // Ambient-tier: one slow turn, in the ~26s+ family every other
    // decorative motion element on this page already uses. Additive on top
    // of the GSAP entrance's own rotation tween — that one settles to 0
    // within ~1.8s, after which this is the only thing still turning it.
    group.rotation.y += 0.0016;
    group.rotation.x = Math.sin(t * 0.09) * 0.12;
    satellites[0].rotation.x += 0.004;
    satellites[1].rotation.y += 0.005;
    camera.position.x += (px * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (0.3 - py * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  return true;
}

// Reads the same tokens engine.js writes, so the scene follows the live
// theme (including a future admin-panel colour change) instead of a second,
// hand-typed palette that can drift from the real one.
function getBrandColors() {
  const s = getComputedStyle(document.documentElement);
  const blue = new THREE.Color(s.getPropertyValue('--brand').trim() || '#2F63D6');
  const teal = new THREE.Color(s.getPropertyValue('--brand-2').trim() || '#20B78E');
  return { blue, teal };
}

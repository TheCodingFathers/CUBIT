import * as THREE from 'three';

// BACKDROP: everything far behind the levels (sky, specks, later the islands and the monolith).
// It lives in its OWN scene and is drawn first, then the level is drawn on top of it (see main.js).
// That way the backdrop can never cut into a platform, and it is not limited by the level camera's range.
// It is only scenery: nothing here has collision or touches the puzzles.

const SKY_RADIUS = 300;
const PARALLAX = 0.12; // how much the backdrop shifts when the camera moves (small = very far away)
const MAX_SPECKS = 120;
const SKY_SEGMENTS = 16;

// Small repeatable random numbers, so the specks are in the same places every time
function seededRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBackdrop(defaultColor = 0x0a1230) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(defaultColor); // the flat color, used by worlds without a backdrop

  const camera = new THREE.PerspectiveCamera(50, 1, 1, 700);

  // SKY: a big dome with a soft gradient. The game camera looks down at the level, so what you see is
  // dark near the horizon and a soft blue glow far below.
  const skyGeometry = new THREE.SphereGeometry(SKY_RADIUS, SKY_SEGMENTS, SKY_SEGMENTS);
  const skyColors = new Float32Array(skyGeometry.attributes.position.count * 3);
  skyGeometry.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(
    skyGeometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })
  );
  sky.frustumCulled = false;
  sky.visible = false;
  scene.add(sky);

  const top = new THREE.Color();
  const mid = new THREE.Color();
  const haze = new THREE.Color();
  const mixed = new THREE.Color();

  // Colors the dome from three colors: top (horizon and above), mid, haze (straight down)
  function paintSky(colors) {
    top.set(colors.top);
    mid.set(colors.mid);
    haze.set(colors.haze);
    const positions = skyGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i) / SKY_RADIUS; // 1 = straight up, -1 = straight down
      if (y >= -0.1) mixed.copy(top);
      else if (y >= -0.55) mixed.copy(top).lerp(mid, (-0.1 - y) / 0.45);
      else mixed.copy(mid).lerp(haze, Math.min(1, (-0.55 - y) / 0.4));
      skyColors[i * 3] = mixed.r;
      skyColors[i * 3 + 1] = mixed.g;
      skyColors[i * 3 + 2] = mixed.b;
    }
    skyGeometry.attributes.color.needsUpdate = true;
  }

  // SPECKS: tiny far-away lights. One draw call.
  const random = seededRandom(20261112);
  const speckPositions = new Float32Array(MAX_SPECKS * 3);
  for (let i = 0; i < MAX_SPECKS; i++) {
    const y = -1 + random() * 1.15; // mostly below the horizon, because that is where the camera looks
    const ring = Math.sqrt(1 - y * y);
    const angle = random() * Math.PI * 2;
    const radius = SKY_RADIUS * 0.85;
    speckPositions[i * 3] = Math.cos(angle) * ring * radius;
    speckPositions[i * 3 + 1] = y * radius;
    speckPositions[i * 3 + 2] = Math.sin(angle) * ring * radius;
  }
  const speckGeometry = new THREE.BufferGeometry();
  speckGeometry.setAttribute('position', new THREE.BufferAttribute(speckPositions, 3));
  const specks = new THREE.Points(
    speckGeometry,
    new THREE.PointsMaterial({
      color: 0x7fdcff,
      size: 2.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  specks.frustumCulled = false;
  specks.visible = false;
  scene.add(specks);

  return {
    scene,
    camera,

    // Called when a level of another world loads (data comes from worlds.js)
    setWorld(world) {
      const data = world.backdrop;
      scene.background.set(world.background);
      sky.visible = !!data?.sky;
      if (data?.sky) paintSky(data.sky);
      specks.visible = !!data?.specks;
      if (data?.specks) {
        speckGeometry.setDrawRange(0, Math.min(MAX_SPECKS, data.specks));
        specks.material.color.set(data.speckColor ?? 0x7fdcff);
      }
    },

    // Call every frame right before drawing: the backdrop camera follows the game camera's view
    update(mainCamera, elapsed) {
      if (camera.fov !== mainCamera.fov || camera.aspect !== mainCamera.aspect) {
        camera.fov = mainCamera.fov;
        camera.aspect = mainCamera.aspect;
        camera.updateProjectionMatrix();
      }
      camera.quaternion.copy(mainCamera.quaternion);
      camera.position.copy(mainCamera.position).multiplyScalar(PARALLAX);
      specks.rotation.y = elapsed * 0.004; // a very slow drift
    },
  };
}

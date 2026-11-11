import * as THREE from 'three';

// BACKDROP: everything far behind the levels (sky, specks, the monolith, later the islands).
// It lives in its OWN scene and is drawn first, then the level is drawn on top of it (see main.js).
// That way the backdrop can never cut into a platform, and it is not limited by the level camera's range.
// It is only scenery: nothing here has collision or touches the puzzles.

const SKY_RADIUS = 300;
const PARALLAX = 0.12; // how much the backdrop shifts when the camera moves (small = very far away)
const MAX_SPECKS = 120;
const SKY_SEGMENTS = 16;

// The backdrop scene has its own two lights (the level's lights do not reach it). Lower = darker scenery.
const BACKDROP_AMBIENT = { color: 0x7f9cff, intensity: 0.9 };
const BACKDROP_SUN = { color: 0xbcd0ff, intensity: 1.4, position: [0.5, 1.0, 0.9] };

// The monolith model is about this high up from its own origin to its middle (see Blender: -1.4 to 8.6)
const MONOLITH_MIDDLE = 3.6;
const RING_SPEED_A = 0.1; // radians per second, the two rings turn in opposite directions
const RING_SPEED_B = -0.16;
const CRYSTAL_PULSE_SPEED = 1.8;

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

// loadModel(url) -> Promise of a THREE.Group. It is passed in by main.js (the same cached loader the level uses).
export function createBackdrop(defaultColor = 0x0a1230, loadModel = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(defaultColor); // the flat color, used by worlds without a backdrop

  const camera = new THREE.PerspectiveCamera(50, 1, 1, 700);

  scene.add(new THREE.AmbientLight(BACKDROP_AMBIENT.color, BACKDROP_AMBIENT.intensity));
  const sun = new THREE.DirectionalLight(BACKDROP_SUN.color, BACKDROP_SUN.intensity);
  sun.position.set(...BACKDROP_SUN.position);
  scene.add(sun);

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

  // MONOLITH: the dormant tower far away. It sits on an anchor that is moved, turned and scaled from worlds.js.
  const anchor = new THREE.Group();
  anchor.visible = false;
  scene.add(anchor);
  const monolith = { loading: false, ringA: null, ringB: null, crystal: null, crystalBase: 1 };
  let current = null; // the data of the world that is showing

  function useMonolith(source) {
    const model = source.clone(true); // shares geometry, so it is cheap
    const ringA = model.getObjectByName('Monolith_RingA');
    const ringB = model.getObjectByName('Monolith_RingB');
    const crystal = model.getObjectByName('Monolith_Crystal');
    if (!ringA || !ringB || !crystal) {
      throw new Error('w01_monolith.glb needs the parts Monolith_RingA, Monolith_RingB and Monolith_Crystal');
    }
    crystal.traverse((object) => {
      if (object.isMesh) {
        object.material = object.material.clone(); // so the pulse changes only this one
        monolith.crystal = object.material;
      }
    });
    monolith.crystalBase = monolith.crystal?.emissiveIntensity ?? 1;
    monolith.ringA = ringA;
    monolith.ringB = ringB;
    model.position.y = -MONOLITH_MIDDLE; // so the anchor is the middle of the tower, not its foot
    anchor.add(model);
  }

  // The tower stands far away, below the level, along the direction the game camera looks
  // (heading = that direction on the ground, see CAMERA_OFFSET in main.js; elevation = how far below the horizon)
  function placeMonolith(data) {
    const heading = new THREE.Vector2(data.heading[0], data.heading[1]).normalize();
    const elevation = THREE.MathUtils.degToRad(data.elevation);
    const flat = data.distance * Math.cos(elevation);
    anchor.position.set(heading.x * flat, data.distance * Math.sin(elevation), heading.y * flat);
    anchor.rotation.y = Math.atan2(-heading.x, -heading.y) + (data.yaw ?? 0); // its front faces the camera
    anchor.scale.setScalar(data.scale);
  }

  let lastElapsed = 0;

  return {
    scene,
    camera,
    monolith: anchor, // exposed for tests

    // Called when a level of another world loads (data comes from worlds.js)
    setWorld(world) {
      const data = world.backdrop;
      current = data ?? null;
      scene.background.set(world.background);
      sky.visible = !!data?.sky;
      if (data?.sky) paintSky(data.sky);
      specks.visible = !!data?.specks;
      if (data?.specks) {
        speckGeometry.setDrawRange(0, Math.min(MAX_SPECKS, data.specks));
        specks.material.color.set(data.speckColor ?? 0x7fdcff);
      }

      const tower = data?.monolith;
      if (tower) placeMonolith(tower);
      anchor.visible = !!tower && anchor.children.length > 0;
      if (tower && anchor.children.length === 0 && !monolith.loading && loadModel) {
        monolith.loading = true;
        loadModel(tower.model)
          .then((source) => {
            useMonolith(source);
            anchor.visible = !!current?.monolith;
          })
          .catch((error) => {
            monolith.loading = false; // a later level may try again
            console.warn('Could not load the monolith model, the backdrop stays without it.', error);
          });
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

      const delta = Math.min(Math.max(elapsed - lastElapsed, 0), 0.1);
      lastElapsed = elapsed;
      if (anchor.visible && monolith.ringA) {
        monolith.ringA.rotation.y += RING_SPEED_A * delta;
        monolith.ringB.rotation.y += RING_SPEED_B * delta;
        if (monolith.crystal) {
          monolith.crystal.emissiveIntensity = monolith.crystalBase * (0.85 + 0.3 * Math.sin(elapsed * CRYSTAL_PULSE_SPEED));
        }
      }
    },
  };
}

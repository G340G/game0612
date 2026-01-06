import * as THREE from "three";
import { makePBRTextureSet, makeFogSpriteTexture } from "./assets.js";
import { mulberry32, hashStringToSeed } from "./utils.js";

export function buildCityWorld(scene, seedStr="city-01"){
  const seed = hashStringToSeed(seedStr);
  const rng = mulberry32(seed);

  const group = new THREE.Group();
  scene.add(group);

  const bounds = { minX:-70, maxX:70, minZ:-70, maxZ:70, groundY:0 };

  // road
  const asphalt = makePBRTextureSet(seed+7, "asphalt");
  asphalt.map.repeat.set(10,10);
  asphalt.roughnessMap.repeat.set(10,10);
  asphalt.normalMap.repeat.set(10,10);

  const groundMat = new THREE.MeshStandardMaterial({
    map: asphalt.map, roughnessMap: asphalt.roughnessMap, normalMap: asphalt.normalMap,
    roughness: 0.92, metalness: 0.02
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160,160), groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  group.add(ground);

  // buildings
  const wall = makePBRTextureSet(seed+17, "concrete");
  wall.map.repeat.set(2,2);

  const bMat = new THREE.MeshStandardMaterial({
    map: wall.map, roughnessMap: wall.roughnessMap, normalMap: wall.normalMap,
    roughness: 0.95, metalness: 0.01, color: 0xb8bcc6
  });

  for (let i=0;i<75;i++){
    const w = 4 + rng()*12;
    const d = 4 + rng()*12;
    const h = 6 + rng()*24;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), bMat);
    m.position.set((rng()-0.5)*140, h/2, (rng()-0.5)*140);

    // keep a “main street” open
    if (Math.abs(m.position.x) < 10 || Math.abs(m.position.z) < 10) continue;

    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  // lights
  const amb = new THREE.AmbientLight(0x5b6a7a, 0.22);
  group.add(amb);

  const key = new THREE.DirectionalLight(0xa9c6ff, 0.72);
  key.position.set(18, 32, -8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left = -55;
  key.shadow.camera.right = 55;
  key.shadow.camera.top = 55;
  key.shadow.camera.bottom = -55;
  key.shadow.camera.far = 120;
  group.add(key);

  // lamp posts
  for (let i=0;i<18;i++){
    const x = (i-9)*7.5;
    const z = (Math.random()<0.5 ? -14 : 14) + (rng()-0.5)*6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,4.4,10), new THREE.MeshStandardMaterial({color:0x22252a, roughness:0.9}));
    pole.position.set(x, 2.2, z);
    pole.castShadow = true;
    group.add(pole);

    const lamp = new THREE.PointLight(0xffe4b1, 0.85, 16, 2.0);
    lamp.position.set(x, 4.2, z);
    lamp.castShadow = false;
    group.add(lamp);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshStandardMaterial({ emissive: 0xffd6a1, emissiveIntensity: 2.0, color: 0x111111, roughness: 0.4 })
    );
    bulb.position.copy(lamp.position);
    group.add(bulb);
  }

  // mist sprites
  const spriteTex = makeFogSpriteTexture(seed+123);
  const mist = new THREE.Group();
  group.add(mist);

  for (let i=0;i<120;i++){
    const mat = new THREE.SpriteMaterial({ map: spriteTex, color: 0xb5c0cc, transparent:true, opacity: 0.12, depthWrite:false });
    const s = new THREE.Sprite(mat);
    s.position.set((rng()-0.5)*150, 0.8 + rng()*7.0, (rng()-0.5)*150);
    const sc = 10 + rng()*26;
    s.scale.set(sc, sc, 1);
    mist.add(s);
  }

  // portal back to forest
  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.18, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0xd6dbe6, roughness: 0.25, metalness: 0.2, emissive: 0x332222, emissiveIntensity: 0.8 })
  );
  portal.position.set(0, 1.3, 42);
  portal.rotation.x = Math.PI/2;
  portal.castShadow = true;
  group.add(portal);

  const interactables = [
    { id:"portal_forest", kind:"portal", object: portal, radius: 2.0, prompt: "Attraversa (E) → FORESTA" }
  ];

  return {// js/world_city.js
import * as THREE from "three";
import { makePBRTextureSet, makeFogSpriteTexture } from "./assets.js";
import { mulberry32, hashStringToSeed } from "./utils.js";

export function buildCityWorld(scene, seedStr="city-01"){
  const seed = hashStringToSeed(seedStr);
  const rng = mulberry32(seed);

  const group = new THREE.Group();
  scene.add(group);

  const bounds = { minX:-70, maxX:70, minZ:-70, maxZ:70, groundY:0 };

  // road
  const asphalt = makePBRTextureSet(seed+7, "asphalt");
  asphalt.map.repeat.set(10,10);
  asphalt.roughnessMap.repeat.set(10,10);
  asphalt.normalMap.repeat.set(10,10);

  const groundMat = new THREE.MeshStandardMaterial({
    map: asphalt.map, roughnessMap: asphalt.roughnessMap, normalMap: asphalt.normalMap,
    roughness: 0.92, metalness: 0.02
  });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160,160), groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  group.add(ground);

  // buildings
  const wall = makePBRTextureSet(seed+17, "concrete");
  wall.map.repeat.set(2,2);

  const bMat = new THREE.MeshStandardMaterial({
    map: wall.map, roughnessMap: wall.roughnessMap, normalMap: wall.normalMap,
    roughness: 0.95, metalness: 0.01, color: 0xb8bcc6
  });

  for (let i=0;i<70;i++){
    const w = 4 + rng()*12;
    const d = 4 + rng()*12;
    const h = 6 + rng()*24;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), bMat);
    m.position.set((rng()-0.5)*140, h/2, (rng()-0.5)*140);

    if (Math.abs(m.position.x) < 10 || Math.abs(m.position.z) < 10) continue;

    m.castShadow = false;     // 🔥 enorme risparmio
    m.receiveShadow = true;
    group.add(m);
  }

  // lights
  const amb = new THREE.AmbientLight(0x5b6a7a, 0.22);
  group.add(amb);

  const key = new THREE.DirectionalLight(0xa9c6ff, 0.72);
  key.position.set(18, 32, -8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024); // 🔥 2048 -> 1024
  key.shadow.camera.left = -55;
  key.shadow.camera.right = 55;
  key.shadow.camera.top = 55;
  key.shadow.camera.bottom = -55;
  key.shadow.camera.far = 120;
  group.add(key);

  // lamp posts
  for (let i=0;i<18;i++){
    const x = (i-9)*7.5;
    const z = (Math.random()<0.5 ? -14 : 14) + (rng()-0.5)*6;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.18,4.4,10),
      new THREE.MeshStandardMaterial({color:0x22252a, roughness:0.9})
    );
    pole.position.set(x, 2.2, z);
    pole.castShadow = true;
    group.add(pole);

    const lamp = new THREE.PointLight(0xffe4b1, 0.85, 16, 2.0);
    lamp.position.set(x, 4.2, z);
    lamp.castShadow = false;
    group.add(lamp);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshStandardMaterial({ emissive: 0xffd6a1, emissiveIntensity: 2.0, color: 0x111111, roughness: 0.4 })
    );
    bulb.position.copy(lamp.position);
    bulb.castShadow = false;
    group.add(bulb);
  }

  // mist sprites
  const spriteTex = makeFogSpriteTexture(seed+123);
  const mist = new THREE.Group();
  group.add(mist);

  for (let i=0;i<95;i++){
    const mat = new THREE.SpriteMaterial({
      map: spriteTex, color: 0xb5c0cc, transparent:true, opacity: 0.12, depthWrite:false
    });
    const s = new THREE.Sprite(mat);
    s.position.set((rng()-0.5)*150, 0.8 + rng()*7.0, (rng()-0.5)*150);
    const sc = 10 + rng()*26;
    s.scale.set(sc, sc, 1);
    mist.add(s);
  }

  // portal back to forest
  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.18, 10, 24),
    new THREE.MeshStandardMaterial({
      color: 0xd6dbe6, roughness: 0.25, metalness: 0.2,
      emissive: 0x332222, emissiveIntensity: 0.8
    })
  );
  portal.position.set(0, 1.3, 42);
  portal.rotation.x = Math.PI/2;
  portal.castShadow = true;
  group.add(portal);

  const interactables = [
    { id:"portal_forest", kind:"portal", object: portal, radius: 2.0, prompt: "Attraversa (E) → FORESTA" }
  ];

  return {
    name: "CITTÀ",
    group,
    bounds,
    mistGroup: mist,
    interactables,
    spawn: new THREE.Vector3(0,0,28),
    portalPosition: portal.position.clone()
  };
}


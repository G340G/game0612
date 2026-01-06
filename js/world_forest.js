// js/world_forest.js
import * as THREE from "three";
import { makeFogSpriteTexture, makePBRTextureSet } from "./assets.js";
import { mulberry32, hashStringToSeed } from "./utils.js";

export function buildForestWorld(scene, seedStr="forest-01"){
  const seed = hashStringToSeed(seedStr);
  const rng = mulberry32(seed);

  const group = new THREE.Group();
  scene.add(group);

  const bounds = { minX:-60, maxX:60, minZ:-60, maxZ:60, groundY:0 };

  // ground
  const tex = makePBRTextureSet(seed+11, "concrete");
  tex.map.repeat.set(12,12);
  tex.roughnessMap.repeat.set(12,12);
  tex.normalMap.repeat.set(12,12);

  const groundMat = new THREE.MeshStandardMaterial({
    map: tex.map, roughnessMap: tex.roughnessMap, normalMap: tex.normalMap,
    roughness: 0.95, metalness: 0.02
  });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  group.add(ground);

  // trees (ottimizzazione: solo trunk castShadow)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 1.0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x0b1410, roughness: 1.0 });

  for (let i=0;i<150;i++){
    const x = (rng()-0.5)*120;
    const z = (rng()-0.5)*120;
    if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;

    const trunkH = 3.5 + rng()*6.0;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, trunkH, 7), trunkMat);
    trunk.position.set(x, trunkH/2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rng()*1.6, 0), leafMat);
    crown.position.set(0, trunkH*0.55 + (1.3 + rng()*1.5), 0);
    crown.scale.set(1.0 + rng()*0.8, 1.0 + rng()*1.3, 1.0 + rng()*0.8);
    crown.castShadow = false;         // 🔥 enorme risparmio
    crown.receiveShadow = false;

    const tree = new THREE.Group();
    tree.add(trunk);
    trunk.add(crown);
    tree.rotation.y = rng()*Math.PI*2;
    group.add(tree);
  }

  // lights
  const amb = new THREE.AmbientLight(0x556070, 0.28);
  group.add(amb);

  const moon = new THREE.DirectionalLight(0x9fb7d7, 0.85);
  moon.position.set(-16, 28, 12);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024,1024); // 🔥 2048 -> 1024
  moon.shadow.camera.left = -45;
  moon.shadow.camera.right = 45;
  moon.shadow.camera.top = 45;
  moon.shadow.camera.bottom = -45;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 90;
  group.add(moon);

  // mist sprites
  const spriteTex = makeFogSpriteTexture(seed+99);
  const mist = new THREE.Group();
  group.add(mist);

  const baseMat = new THREE.SpriteMaterial({
    map: spriteTex,
    color: 0xb8c3cf,
    transparent: true,
    opacity: 0.14,
    depthWrite: false
  });

  for (let i=0;i<95;i++){
    const s = new THREE.Sprite(baseMat.clone());
    s.position.set((rng()-0.5)*120, 1.0 + rng()*5.0, (rng()-0.5)*120);
    const sc = 8 + rng()*22;
    s.scale.set(sc, sc, 1);
    mist.add(s);
  }

  // portal to city
  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.18, 10, 24),
    new THREE.MeshStandardMaterial({
      color: 0xd6dbe6, roughness: 0.25, metalness: 0.2,
      emissive: 0x223344, emissiveIntensity: 0.8
    })
  );
  portal.position.set(0, 1.3, -38);
  portal.rotation.x = Math.PI/2;
  portal.castShadow = true;
  group.add(portal);

  const interactables = [
    { id:"portal_city", kind:"portal", object: portal, radius: 2.0, prompt: "Attraversa (E) → CITTÀ" }
  ];

  return {
    name: "FORESTA",
    group,
    bounds,
    mistGroup: mist,
    interactables,
    spawn: new THREE.Vector3(0,0,0),
    portalPosition: portal.position.clone()
  };
}


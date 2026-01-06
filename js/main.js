// js/main.js
import * as THREE from "three";
import { Player } from "./player.js";
import { Enemy } from "./ai.js";
import { UI } from "./ui.js";
import { PsycheModel, buildDilemmas } from "./moral.js";
import { PostFX } from "./post.js";
import { AudioEngine } from "./audio.js";
import { buildForestWorld } from "./world_forest.js";
import { buildCityWorld } from "./world_city.js";
import { clamp, lerp, mulberry32, hashStringToSeed, pick } from "./utils.js";

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  stencil: false,
  depth: true
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x0a0c10, 0.032);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.1, 180);
camera.position.set(0, 1.65, 3);

const ui = new UI();
const psyche = new PsycheModel();
const dilemmas = buildDilemmas();
const audio = new AudioEngine();

const player = new Player(camera, document.body);
scene.add(player.getObject());

const post = new PostFX(renderer, scene, camera);

const rng = mulberry32(hashStringToSeed("FOG//CITY"));

let world = null;
let worlds = {};
let enemies = [];
let fogFactor = 0.55;
let glitchBurst = 0.0;

// ---- GLOBAL ANTI-FREEZE HANDLERS ----
window.addEventListener("error", (e)=>{
  console.error("window.error:", e.error || e.message);
  ui.showFatal(e.error || e.message);
});
window.addEventListener("unhandledrejection", (e)=>{
  console.error("unhandledrejection:", e.reason);
  ui.showFatal(e.reason);
});

renderer.domElement.addEventListener("webglcontextlost", (e)=>{
  e.preventDefault();
  ui.showFatal("WEBGL CONTEXT LOST (GPU overload). Riduci ombre/postfx o riavvia la pagina.");
}, false);

document.addEventListener("pointerlockerror", ()=>{
  ui.showFatal("PointerLock error: il browser ha rifiutato il lock. Prova a cliccare direttamente sul canvas o disabilita estensioni.");
});

// ---- ENEMIES ----
function buildEnemyMesh(){
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 1.0 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: 0.95 });

  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 6, 12), bodyMat);
  body.castShadow = true;
  body.position.y = 1.1;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), headMat);
  head.castShadow = true;
  head.position.set(0, 1.8, 0.06);
  g.add(head);

  const eye = new THREE.PointLight(0xff3b3b, 0.9, 6, 2.0);
  eye.position.set(0.0, 1.82, 0.22);
  g.add(eye);

  return g;
}

function clearWorld(){
  if (!world) return;
  world.group.visible = false;
  enemies.forEach(e => world.group.remove(e.mesh));
  enemies = [];
}

function spawnEnemies(count){
  for (let i=0;i<count;i++){
    const m = buildEnemyMesh();
    const e = new Enemy(m, { speed: 1.9 + rng()*0.8, aggro: 0.95 + rng()*0.5, damage: 8 + Math.floor(rng()*7) });
    const x = (rng()-0.5)*(world.bounds.maxX-world.bounds.minX)*0.9;
    const z = (rng()-0.5)*(world.bounds.maxZ-world.bounds.minZ)*0.9;
    m.position.set(x, 0, z);
    e.setPatrolTarget(new THREE.Vector3(-x*0.6, 0, -z*0.6));
    world.group.add(m);
    enemies.push(e);
  }
}

function setWorld(name){
  clearWorld();

  Object.values(worlds).forEach(w => w.group.visible = false);
  world = worlds[name];
  world.group.visible = true;

  player.getObject().position.copy(world.spawn);

  const base = name === "FORESTA" ? 3 : 5;
  const extra = Math.floor(psyche.dread * 3);
  spawnEnemies(base + extra);

  ui.vhsPulse(`TAPE: ${name==="FORESTA" ? "FGC-01" : "FGC-02"} // TRACKING ${(Math.random()*10-5).toFixed(0)}`);
  document.getElementById("levelChip").textContent = name;
}

function initWorlds(){
  worlds["FORESTA"] = buildForestWorld(scene, "forest-seed-77");
  worlds["CITTÀ"] = buildCityWorld(scene, "city-seed-21");
  setWorld("FORESTA");
}
initWorlds();

// ---- FLASHLIGHT (ridotto costo) ----
const flashlight = new THREE.SpotLight(0xe9f2ff, 2.4, 18, Math.PI/6, 0.35, 1.2);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512,512); // 🔥 ulteriore riduzione (prima 1024)
scene.add(flashlight);
scene.add(flashlight.target);

function updateFlashlight(){
  flashlight.visible = player.flashlightOn && player.isLocked();
  if (!flashlight.visible) return;

  const obj = player.getObject();
  flashlight.position.copy(obj.position).add(new THREE.Vector3(0, 1.3, 0));
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  flashlight.target.position.copy(obj.position).add(dir.multiplyScalar(6));
}

// ---- INPUT ----
window.addEventListener("keydown", (e)=>{
  if (e.code === "KeyF") player.flashlightOn = !player.flashlightOn;
  if (e.code === "KeyE") tryInteract();
});

function tryInteract(){
  if (!world || ui.dialogueOpen || !player.isLocked()) return;

  const pos = player.getObject().position;
  for (const it of world.interactables){
    if (it.object.position.distanceTo(pos) < it.radius){
      if (it.id === "portal_city") setWorld("CITTÀ");
      if (it.id === "portal_forest") setWorld("FORESTA");
      glitchBurst = Math.max(glitchBurst, 0.7);
      audio.stinger(0.9);
      return;
    }
  }

  if (Math.random() < 0.55){
    const d = pick(rng, dilemmas);
    ui.openDialogue(d, (choiceIdx)=>{
      psyche.applyChoice(d.choices[choiceIdx].effect);
      glitchBurst = Math.max(glitchBurst, 0.35 + psyche.dread*0.55);
      audio.stinger(0.55 + psyche.dread*0.45);
    });
  }
}

// click to lock + start audio (NON BLOCCANTE)
document.body.addEventListener("click", ()=>{
  if (!player.isLocked()){
    ui.hideFatal();
    player.lock();
    ui.setHintVisible(false);

    // avvia audio ma non bloccare mai il thread
    audio.start().catch((e)=>console.warn("Audio start error:", e));
  }
});

// resize
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.resize(window.innerWidth, window.innerHeight);
});

// ---- MAIN LOOP (anti-crash) ----
let lastT = performance.now();

function loop(){
  const t = performance.now();
  const dt = Math.min(0.033, (t - lastT)/1000);
  lastT = t;

  try {
    if (!world) return;

    const dread = clamp(psyche.dread + psyche.guilt*0.35 - psyche.empathy*0.12, 0, 1);
    audio.setDread(dread);

    fogFactor = clamp(0.35 + dread*0.55 + (50-psyche.psyche)/100*0.35, 0, 1);
    scene.fog.density = lerp(scene.fog.density, 0.018 + fogFactor*0.050, clamp(dt*1.5,0,1));

    // mist drift (leggero)
    if (world.mistGroup){
      for (let i=0; i<world.mistGroup.children.length; i++){
        const s = world.mistGroup.children[i];
        s.position.x += Math.sin((t*0.0003) + i*1.7) * dt * 0.22;
        s.position.z += Math.cos((t*0.00025) + i*1.3) * dt * 0.20;
        if (s.material) s.material.opacity = 0.07 + fogFactor*0.12;
      }
    }

    const prePos = player.getObject().position.clone();
    player.update(dt, world);
    const playerVel = prePos.distanceTo(player.getObject().position) / Math.max(1e-3, dt);

    updateFlashlight();

    const pPos = player.getObject().position.clone();
    for (const e of enemies){
      e.update(dt, {
        playerPos: pPos,
        playerVel,
        dread,
        fogFactor,
        onHitPlayer: (dmg)=>{
          player.hp = Math.max(0, player.hp - dmg);
          psyche.applyChoice({ psyche:-2, dread:+0.05, guilt:+0.03 });
          glitchBurst = Math.max(glitchBurst, 0.65);
          audio.stinger(0.9);
          ui.vhsPulse(`REC ● // SIGNAL LOSS ${(Math.random()*100).toFixed(0)}%`);
        }
      });
    }

    if (player.isLocked()){
      const bob = Math.sin(t*0.006) * (0.008 + playerVel*0.002);
      camera.position.y = 1.65 + bob;
    }

    // prompt vicino ai portali
    if (player.isLocked() && !ui.dialogueOpen){
      const pos = player.getObject().position;
      let nearPrompt = "";
      for (const it of world.interactables){
        if (it.object.position.distanceTo(pos) < it.radius) nearPrompt = it.prompt;
      }
      ui.setHintVisible(!!nearPrompt);
      if (nearPrompt) ui.elHint.textContent = nearPrompt;
    }

    glitchBurst = Math.max(0, glitchBurst - dt*1.6);
    post.tick(dt, dread, glitchBurst);

    // tick audio SAFE (se non pronto non fa nulla)
    audio.tick(dt);

    ui.setStats({
      psyche: psyche.psyche,
      hp: player.hp,
      levelName: world.name,
      fogFactor,
      dread
    });

    post.render();
  } catch (err) {
    console.error("Loop crashed:", err);
    ui.showFatal(err);
  } finally {
    requestAnimationFrame(loop);
  }
}

requestAnimationFrame(loop);


import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { clamp, lerp } from "./utils.js";

export class Player {
  constructor(camera, dom){
    this.camera = camera;
    this.controls = new PointerLockControls(camera, dom);

    this.vel = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.onGround = true;

    this.hp = 100;
    this.flashlightOn = true;

    this.walkSpeed = 4.2;
    this.runSpeed = 6.6;
    this.friction = 10.0;

    this.keys = new Set();
    window.addEventListener("keydown", (e)=>this.keys.add(e.code));
    window.addEventListener("keyup", (e)=>this.keys.delete(e.code));
  }

  lock(){ this.controls.lock(); }
  unlock(){ this.controls.unlock(); }
  isLocked(){ return this.controls.isLocked; }

  getObject(){ return this.controls.getObject(); }

  update(dt, world){
    if (!this.isLocked()) return;

    const speed = (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) ? this.runSpeed : this.walkSpeed;
    const forward = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const strafe  = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);

    this.dir.set(strafe, 0, forward);
    if (this.dir.lengthSq() > 0) this.dir.normalize();

    // direction in world space
    const yaw = new THREE.Vector3();
    this.controls.getDirection(yaw);
    yaw.y = 0; yaw.normalize();

    const right = new THREE.Vector3().crossVectors(yaw, new THREE.Vector3(0,1,0)).normalize();
    const wish = new THREE.Vector3()
      .addScaledVector(yaw, this.dir.z)
      .addScaledVector(right, this.dir.x);

    // acceleration
    this.vel.x = lerp(this.vel.x, wish.x * speed, clamp(dt*8,0,1));
    this.vel.z = lerp(this.vel.z, wish.z * speed, clamp(dt*8,0,1));

    // cheap friction
    this.vel.x *= Math.max(0, 1 - this.friction*dt*0.06);
    this.vel.z *= Math.max(0, 1 - this.friction*dt*0.06);

    // integrate + collide with “ground plane bounds”
    const pos = this.getObject().position;
    const next = pos.clone().addScaledVector(this.vel, dt);

    // world bounds / collisions (semplice ma solido come base)
    const b = world.bounds; // {minX,maxX,minZ,maxZ, groundY}
    next.x = clamp(next.x, b.minX, b.maxX);
    next.z = clamp(next.z, b.minZ, b.maxZ);
    next.y = b.groundY;

    pos.copy(next);
  }
}

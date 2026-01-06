import * as THREE from "three";
import { clamp, lerp } from "./utils.js";

export class Enemy {
  constructor(mesh, opts={}){
    this.mesh = mesh;
    this.speed = opts.speed ?? 2.2;
    this.aggro = opts.aggro ?? 1.0;      // influenza range di percezione
    this.damage = opts.damage ?? 10;
    this.hp = opts.hp ?? 30;

    this.state = "patrol";
    this.stateT = 0;

    this.targetPos = new THREE.Vector3();
    this.tmp = new THREE.Vector3();

    this.hearRadius = 7;
    this.seeRadius = 12;
    this.attackRadius = 1.4;
    this.cooldown = 0;
  }

  setPatrolTarget(v){
    this.targetPos.copy(v);
  }

  update(dt, ctx){
    const { playerPos, playerVel, dread, fogFactor, onHitPlayer } = ctx;
    this.stateT += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);

    // perception varies with dread + fog + aggro
    const see = this.seeRadius * (0.85 + dread*0.6) * (1.05 - fogFactor*0.35) * this.aggro;
    const hear = this.hearRadius * (0.90 + dread*0.5) * (0.85 + playerVel*0.35);

    const pos = this.mesh.position;
    const dist = pos.distanceTo(playerPos);

    const heard = dist < hear;
    const seen = dist < see;

    if ((heard || seen) && this.state !== "attack") {
      // escalate
      if (dist < this.attackRadius) this._setState("attack");
      else this._setState("chase");
    }

    if (this.state === "patrol"){
      if (this.stateT > 6 + Math.random()*4) {
        this._setState("investigate");
      }
      this._moveToward(this.targetPos, dt, 0.85);
    }

    if (this.state === "investigate"){
      // loiter + small drifts
      if (this.stateT < 1.0){
        // pause
      } else {
        const wiggle = Math.sin(this.stateT*1.4)*0.6;
        this.tmp.copy(this.targetPos).add(new THREE.Vector3(wiggle,0,-wiggle*0.7));
        this._moveToward(this.tmp, dt, 0.75);
      }
      if (this.stateT > 4.5) this._setState("patrol");
    }

    if (this.state === "chase"){
      // chase player
      this._moveToward(playerPos, dt, 1.15 + dread*0.35);
      if (dist < this.attackRadius) this._setState("attack");
      if (!heard && !seen && this.stateT > 2.5) this._setState("investigate");
    }

    if (this.state === "attack"){
      // stay close + deal damage with cooldown
      this._moveToward(playerPos, dt, 1.25);
      if (dist > this.attackRadius*1.25) this._setState("chase");
      if (dist < this.attackRadius && this.cooldown <= 0){
        this.cooldown = 1.0 + Math.random()*0.5;
        onHitPlayer(this.damage);
      }
    }

    // face movement direction
    const v = ctx.playerPos.clone().sub(pos);
    v.y = 0;
    if (v.lengthSq() > 0.0001){
      const targetYaw = Math.atan2(v.x, v.z);
      this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, targetYaw, clamp(dt*6,0,1));
    }
  }

  _setState(s){
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
  }

  _moveToward(goal, dt, mult=1){
    const pos = this.mesh.position;
    const d = goal.clone().sub(pos);
    d.y = 0;
    const dist = d.length();
    if (dist < 0.2) return;
    d.normalize();
    pos.addScaledVector(d, this.speed * mult * dt);
  }
}

function lerpAngle(a, b, t){
  let d = ((b - a + Math.PI) % (Math.PI*2)) - Math.PI;
  return a + d * t;
}

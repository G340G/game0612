import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { clamp } from "./utils.js";

const GlitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.0 },
    lines: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    uniform float lines;

    float rand(vec2 co){
      return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    }

    void main(){
      vec2 uv = vUv;

      // horizontal tearing lines
      float l = step(1.0 - lines, rand(vec2(floor(uv.y*120.0), time)));
      uv.x += l * (rand(vec2(time, uv.y)) - 0.5) * 0.12 * amount;

      // subtle channel offset
      float off = (rand(vec2(uv.y, time)) - 0.5) * 0.006 * amount;
      vec4 cR = texture2D(tDiffuse, uv + vec2(off, 0.0));
      vec4 cG = texture2D(tDiffuse, uv);
      vec4 cB = texture2D(tDiffuse, uv - vec2(off, 0.0));
      vec4 col = vec4(cR.r, cG.g, cB.b, 1.0);

      // film grain
      float g = (rand(uv*time) - 0.5) * 0.08 * amount;
      col.rgb += g;

      gl_FragColor = col;
    }
  `
};

export class PostFX {
  constructor(renderer, scene, camera){
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.35, 0.65, 0.75);
    this.composer.addPass(this.bloom);

    this.glitch = new ShaderPass(GlitchShader);
    this.glitch.uniforms.amount.value = 0.0;
    this.glitch.uniforms.lines.value = 0.0;
    this.composer.addPass(this.glitch);

    this._pulse = 0;
  }

  resize(w,h){
    this.composer.setSize(w,h);
  }

  // dread influences intensity; "burst" used on events
  tick(dt, dread, burst=0){
    this.glitch.uniforms.time.value += dt * 1.0;

    // occasional random pulse
    if (Math.random() < dt * (0.10 + dread*0.35)) this._pulse = Math.max(this._pulse, 0.35 + dread*0.55);

    this._pulse = Math.max(0, this._pulse - dt*(0.9 + dread*0.8));
    const a = clamp(this._pulse + burst, 0, 1);

    this.glitch.uniforms.amount.value = a * (0.35 + dread*0.75);
    this.glitch.uniforms.lines.value = a * (0.20 + dread*0.60);

    this.bloom.strength = 0.22 + dread*0.55;
    this.bloom.radius = 0.55;
    this.bloom.threshold = 0.70 - dread*0.25;
  }

  render(){
    this.composer.render();
  }
}

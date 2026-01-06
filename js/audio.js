// js/audio.js
import { clamp } from "./utils.js";

export class AudioEngine {
  constructor(){
    this.ctx = null;

    this.master = null;
    this.bass = null;
    this.comp = null;

    this.noiseSrc = null;   // AudioBufferSourceNode
    this.noiseGain = null;  // GainNode

    this.droneGain = null;  // GainNode
    this.droneOscs = [];    // oscillators

    this.dread = 0.25;      // 0..1

    this._starting = null;  // Promise guard
    this._ready = false;
  }

  isReady(){ return this._ready; }

  async start(){
    // Idempotente: se già ready, ok. Se sta già partendo, riusa la promise.
    if (this._ready) return;
    if (this._starting) return this._starting;

    this._starting = (async ()=>{
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // ---- MASTER CHAIN ----
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.85;

        this.bass = this.ctx.createBiquadFilter();
        this.bass.type = "lowshelf";
        this.bass.frequency.value = 120;
        this.bass.gain.value = 10;

        this.comp = this.ctx.createDynamicsCompressor();
        this.comp.threshold.value = -20;
        this.comp.knee.value = 20;
        this.comp.ratio.value = 4.5;
        this.comp.attack.value = 0.004;
        this.comp.release.value = 0.18;

        this.master.connect(this.bass);
        this.bass.connect(this.comp);
        this.comp.connect(this.ctx.destination);

        // ---- NOISE ----
        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.value = 0.0;
        this.noiseGain.connect(this.master);

        const { source, out } = this._makeBrownNoiseChain();
        this.noiseSrc = source;
        out.connect(this.noiseGain);
        this.noiseSrc.start();

        // ---- DRONE ----
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0.0;
        this.droneGain.connect(this.master);

        const base = 55; // A1
        const ratios = [1, 6/5, 3/2, 9/5];

        for (let i=0;i<4;i++){
          const o = this.ctx.createOscillator();
          o.type = i===0 ? "sine" : (i===1 ? "triangle" : "sawtooth");
          o.frequency.value = base * ratios[i] * (i===3 ? 2 : 1);

          const g = this.ctx.createGain();
          g.gain.value = 0.0001;

          const lfo = this.ctx.createOscillator();
          lfo.type = "sine";
          lfo.frequency.value = 0.08 + Math.random()*0.12;

          const lfoG = this.ctx.createGain();
          lfoG.gain.value = 0.6 + Math.random()*1.2;

          lfo.connect(lfoG);
          lfoG.connect(o.frequency);

          o.connect(g);
          g.connect(this.droneGain);

          o.start();
          lfo.start();

          this.droneOscs.push({ o, g, lfo, lfoG });
        }

        if (this.ctx.state === "suspended") await this.ctx.resume();

        // SOLO QUI segniamo ready
        this._ready = true;
      } catch (err) {
        console.error("AudioEngine start failed:", err);
        // Non lasciare stato mezzo pronto
        this._ready = false;
        // prova a chiudere contesto se creato
        try { if (this.ctx && this.ctx.state !== "closed") await this.ctx.close(); } catch {}
        this.ctx = null;
      } finally {
        // se fallisce, permetti retry con un nuovo click
        this._starting = null;
      }
    })();

    return this._starting;
  }

  setDread(v){
    this.dread = clamp(v, 0, 1);
  }

  tick(dt){
    // Guard “hard”: se non ready NON tocca gain.
    if (!this._ready) return;
    if (!this.ctx || !this.noiseGain || !this.droneGain || !this.bass) return;

    const t = this.ctx.currentTime;

    const noiseTarget = 0.02 + this.dread * 0.18;
    const droneTarget = 0.03 + this.dread * 0.22;

    this.noiseGain.gain.setTargetAtTime(noiseTarget, t, 0.25);
    this.droneGain.gain.setTargetAtTime(droneTarget, t, 0.35);

    const bassGain = 8 + this.dread * 12;
    this.bass.gain.setTargetAtTime(bassGain, t, 0.4);

    if (Math.random() < dt * (0.08 + this.dread*0.22)){
      this._subHit(35 + Math.random()*10, 0.25 + this.dread*0.25);
    }
  }

  stinger(intensity=0.7){
    if (!this._ready || !this.ctx || !this.master) return;

    const t = this.ctx.currentTime;

    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 220 + Math.random()*120;

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900 + Math.random()*700;
    bp.Q.value = 6;

    const g = this.ctx.createGain();
    g.gain.value = 0.0001;

    o.connect(bp);
    bp.connect(g);
    g.connect(this.master);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22*intensity, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.35);

    o.start(t);
    o.stop(t+0.4);
  }

  _subHit(freq=40, dur=0.35){
    if (!this._ready || !this.ctx || !this.master) return;

    const t = this.ctx.currentTime;

    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq*0.6), t+dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

    o.connect(g);
    g.connect(this.master);

    o.start(t);
    o.stop(t+dur+0.02);
  }

  _makeBrownNoiseChain(){
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i=0; i<bufferSize; i++){
      const white = Math.random()*2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      out[i] = lastOut * 3.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 60;

    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3400;

    source.connect(hp);
    hp.connect(lp);

    return { source, out: lp };
  }
}


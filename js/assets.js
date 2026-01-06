import * as THREE from "three";
import { clamp, mulberry32 } from "./utils.js";

function makeCanvas(w,h){
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function fbmNoise2D(ctx, rng, w, h, oct=5){
  const img = ctx.getImageData(0,0,w,h);
  const d = img.data;

  // base noise
  const base = new Float32Array(w*h);
  for (let i=0;i<w*h;i++) base[i] = rng();

  const sample = (x,y)=>{
    x = (x%w + w)%w; y = (y%h + h)%h;
    return base[y*w+x];
  };

  const lerp = (a,b,t)=>a+(b-a)*t;
  const smooth = t => t*t*(3-2*t);

  const noise = (x,y)=>{
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0+1, y1 = y0+1;
    const sx = smooth(x - x0), sy = smooth(y - y0);
    const n00 = sample(x0,y0), n10 = sample(x1,y0);
    const n01 = sample(x0,y1), n11 = sample(x1,y1);
    return lerp(lerp(n00,n10,sx), lerp(n01,n11,sx), sy);
  };

  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      let amp=1, freq=1, sum=0, norm=0;
      for (let o=0;o<oct;o++){
        sum += amp * noise(x*freq/w*64, y*freq/h*64);
        norm += amp;
        amp *= 0.55; freq *= 2.0;
      }
      const v = sum / norm;
      const idx = (y*w + x)*4;
      const g = Math.floor(255 * v);
      d[idx+0]=g; d[idx+1]=g; d[idx+2]=g; d[idx+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
}

function stampCracks(ctx, rng, w, h, count=70){
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  for (let i=0;i<count;i++){
    const x = rng()*w, y = rng()*h;
    const len = 30 + rng()*220;
    const ang = rng()*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(x,y);
    let px=x, py=y;
    for (let k=0;k<8;k++){
      const t = (k+1)/8;
      const nx = x + Math.cos(ang + (rng()-0.5)*0.6)*len*t + (rng()-0.5)*8;
      const ny = y + Math.sin(ang + (rng()-0.5)*0.6)*len*t + (rng()-0.5)*8;
      ctx.lineTo(nx, ny);
      px=nx; py=ny;
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function makePBRTextureSet(seed=1234, kind="asphalt"){
  const rng = mulberry32(seed);
  const size = 512;

  // base (albedo-ish)
  const c = makeCanvas(size,size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#222"; ctx.fillRect(0,0,size,size);
  fbmNoise2D(ctx, rng, size, size, 6);

  // tint & details
  const img = ctx.getImageData(0,0,size,size);
  const d = img.data;
  for (let i=0;i<d.length;i+=4){
    const g = d[i]/255;
    let r=0,gc=0,b=0;
    if (kind==="asphalt"){
      r = 0.18 + g*0.18; gc = 0.18 + g*0.18; b = 0.20 + g*0.20;
    } else if (kind==="concrete"){
      r = 0.35 + g*0.25; gc = 0.35 + g*0.25; b = 0.37 + g*0.25;
    } else { // wood
      r = 0.22 + g*0.25; gc = 0.16 + g*0.20; b = 0.10 + g*0.14;
    }
    d[i]   = Math.floor(clamp(r,0,1)*255);
    d[i+1] = Math.floor(clamp(gc,0,1)*255);
    d[i+2] = Math.floor(clamp(b,0,1)*255);
    d[i+3] = 255;
  }
  ctx.putImageData(img,0,0);

  if (kind !== "wood") stampCracks(ctx, rng, size, size, kind==="asphalt" ? 55 : 85);

  // roughness map (reuse noise)
  const rC = makeCanvas(size,size);
  const rCtx = rC.getContext("2d");
  fbmNoise2D(rCtx, rng, size, size, 5);

  // normal map (simple sobel from roughness)
  const nC = makeCanvas(size,size);
  const nCtx = nC.getContext("2d");
  const src = rCtx.getImageData(0,0,size,size);
  const out = nCtx.createImageData(size,size);
  const s = src.data, o = out.data;

  const at = (x,y)=>{
    x = (x%size+size)%size; y=(y%size+size)%size;
    return s[(y*size + x)*4] / 255;
  };

  for (let y=0;y<size;y++){
    for (let x=0;x<size;x++){
      const dx = (at(x+1,y)-at(x-1,y)) * 2.0;
      const dy = (at(x,y+1)-at(x,y-1)) * 2.0;
      let nx = -dx, ny = -dy, nz = 1.0;
      const inv = 1/Math.hypot(nx,ny,nz);
      nx*=inv; ny*=inv; nz*=inv;
      const idx = (y*size + x)*4;
      o[idx]   = Math.floor((nx*0.5+0.5)*255);
      o[idx+1] = Math.floor((ny*0.5+0.5)*255);
      o[idx+2] = Math.floor((nz*0.5+0.5)*255);
      o[idx+3] = 255;
    }
  }
  nCtx.putImageData(out,0,0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const rough = new THREE.CanvasTexture(rC);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.anisotropy = 4;

  const normal = new THREE.CanvasTexture(nC);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.anisotropy = 4;

  return { map: tex, roughnessMap: rough, normalMap: normal };
}

export function makeFogSpriteTexture(seed=42){
  const rng = mulberry32(seed);
  const s=256;
  const c = makeCanvas(s,s);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s/2,s/2,10, s/2,s/2,s/2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,s,s);

  // add subtle noise
  const img = ctx.getImageData(0,0,s,s);
  const d = img.data;
  for (let i=0;i<d.length;i+=4){
    const n = (rng()-0.5)*30;
    d[i] = clamp(d[i]+n,0,255);
    d[i+1] = clamp(d[i+1]+n,0,255);
    d[i+2] = clamp(d[i+2]+n,0,255);
  }
  ctx.putImageData(img,0,0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

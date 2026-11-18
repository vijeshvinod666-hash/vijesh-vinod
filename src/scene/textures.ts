import * as THREE from 'three';

export interface ProceduralTextureSet {
  sandstoneAlbedo: THREE.CanvasTexture;
  sandstoneBump: THREE.CanvasTexture;
  sandstoneRoughness: THREE.CanvasTexture;
  groundAlbedo: THREE.CanvasTexture;
  groundBump: THREE.CanvasTexture;
  barkAlbedo: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  starGlow: THREE.CanvasTexture;
  dispose: () => void;
}

function seededNoise(x: number, y: number, seed = 13.37): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves = 4, seed = 1.0): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    const ix = Math.floor(x * freq);
    const iy = Math.floor(y * freq);
    const fx = x * freq - ix;
    const fy = y * freq - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = seededNoise(ix, iy, seed + i * 7);
    const b = seededNoise(ix + 1, iy, seed + i * 7);
    const c = seededNoise(ix, iy + 1, seed + i * 7);
    const d = seededNoise(ix + 1, iy + 1, seed + i * 7);

    const n = a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    value += n * amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return value;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Stratified Entrada/Navajo Sandstone Albedo + Bump + Roughness (512x512)
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImg = albedoCtx.createImageData(size, size);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImg = bumpCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = (y * size + x) * 4;

      // Cross-bedded geological strata warped gently by FBM noise
      const warp = fbm(u * 4, v * 4, 3, 2.1) * 0.12;
      const strataCoord = (v + warp) * 18.0;
      const strataBand =
        0.5 +
        0.3 * Math.sin(strataCoord * Math.PI) +
        0.2 * Math.sin(strataCoord * 2.7 * Math.PI + 1.1);
      const grain = fbm(u * 28, v * 28, 3, 9.4);
      const varnish = Math.max(0, fbm(u * 6 + 3.2, v * 2.5, 3, 4.7) - 0.58) * 2.2;

      // Terracotta / Entrada salmon-ochre palette with cream & iron-oxide strata
      const baseR = 178 + strataBand * 44 - varnish * 68 + (grain - 0.5) * 22;
      const baseG = 86 + strataBand * 34 - varnish * 46 + (grain - 0.5) * 16;
      const baseB = 56 + strataBand * 22 - varnish * 30 + (grain - 0.5) * 12;

      albedoImg.data[idx] = Math.max(0, Math.min(255, baseR));
      albedoImg.data[idx + 1] = Math.max(0, Math.min(255, baseG));
      albedoImg.data[idx + 2] = Math.max(0, Math.min(255, baseB));
      albedoImg.data[idx + 3] = 255;

      // Bump height (sedimentary ledges + fine grit)
      const ledge = Math.pow(Math.max(0, Math.sin(strataCoord * Math.PI)), 2) * 0.65;
      const h = Math.max(0, Math.min(255, (ledge * 0.55 + grain * 0.45) * 255));
      bumpImg.data[idx] = h;
      bumpImg.data[idx + 1] = h;
      bumpImg.data[idx + 2] = h;
      bumpImg.data[idx + 3] = 255;

      // Roughness (matte sandstone ~0.82-0.96, slightly smoother desert varnish ~0.68)
      const rough = Math.max(150, Math.min(248, 228 - varnish * 58 + (grain - 0.5) * 24));
      roughImg.data[idx] = rough;
      roughImg.data[idx + 1] = rough;
      roughImg.data[idx + 2] = rough;
      roughImg.data[idx + 3] = 255;
    }
  }
  albedoCtx.putImageData(albedoImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);

  const sandstoneAlbedo = new THREE.CanvasTexture(albedoCanvas);
  sandstoneAlbedo.colorSpace = THREE.SRGBColorSpace;
  sandstoneAlbedo.wrapS = THREE.RepeatWrapping;
  sandstoneAlbedo.wrapT = THREE.RepeatWrapping;
  sandstoneAlbedo.repeat.set(2, 3);
  sandstoneAlbedo.anisotropy = aniso;

  const sandstoneBump = new THREE.CanvasTexture(bumpCanvas);
  sandstoneBump.wrapS = THREE.RepeatWrapping;
  sandstoneBump.wrapT = THREE.RepeatWrapping;
  sandstoneBump.repeat.set(2, 3);
  sandstoneBump.anisotropy = aniso;

  const sandstoneRoughness = new THREE.CanvasTexture(roughCanvas);
  sandstoneRoughness.wrapS = THREE.RepeatWrapping;
  sandstoneRoughness.wrapT = THREE.RepeatWrapping;
  sandstoneRoughness.repeat.set(2, 3);
  sandstoneRoughness.anisotropy = aniso;

  // 2. Desert Slickrock & Wind-Rippled Sand Terrain Texture (512x512)
  const gSize = 512;
  const gAlbedoCanvas = document.createElement('canvas');
  gAlbedoCanvas.width = gSize;
  gAlbedoCanvas.height = gSize;
  const gCtx = gAlbedoCanvas.getContext('2d')!;
  const gImg = gCtx.createImageData(gSize, gSize);

  const gBumpCanvas = document.createElement('canvas');
  gBumpCanvas.width = gSize;
  gBumpCanvas.height = gSize;
  const gBumpCtx = gBumpCanvas.getContext('2d')!;
  const gBumpImg = gBumpCtx.createImageData(gSize, gSize);

  for (let y = 0; y < gSize; y++) {
    const v = y / gSize;
    for (let x = 0; x < gSize; x++) {
      const u = x / gSize;
      const idx = (y * gSize + x) * 4;

      const patch = fbm(u * 5, v * 5, 4, 3.3);
      const ripple = 0.5 + 0.5 * Math.sin((u * 14 + patch * 1.4) * Math.PI * 2);
      const grit = seededNoise(x, y, 7.1);

      const r = 168 + patch * 42 + ripple * 12 + (grit - 0.5) * 14;
      const g = 92 + patch * 28 + ripple * 9 + (grit - 0.5) * 10;
      const b = 60 + patch * 18 + ripple * 6 + (grit - 0.5) * 8;

      gImg.data[idx] = Math.max(0, Math.min(255, r));
      gImg.data[idx + 1] = Math.max(0, Math.min(255, g));
      gImg.data[idx + 2] = Math.max(0, Math.min(255, b));
      gImg.data[idx + 3] = 255;

      const bumpVal = Math.max(0, Math.min(255, (ripple * 0.45 + patch * 0.35 + grit * 0.2) * 255));
      gBumpImg.data[idx] = bumpVal;
      gBumpImg.data[idx + 1] = bumpVal;
      gBumpImg.data[idx + 2] = bumpVal;
      gBumpImg.data[idx + 3] = 255;
    }
  }
  gCtx.putImageData(gImg, 0, 0);
  gBumpCtx.putImageData(gBumpImg, 0, 0);

  const groundAlbedo = new THREE.CanvasTexture(gAlbedoCanvas);
  groundAlbedo.colorSpace = THREE.SRGBColorSpace;
  groundAlbedo.wrapS = THREE.RepeatWrapping;
  groundAlbedo.wrapT = THREE.RepeatWrapping;
  groundAlbedo.repeat.set(16, 16);
  groundAlbedo.anisotropy = aniso;

  const groundBump = new THREE.CanvasTexture(gBumpCanvas);
  groundBump.wrapS = THREE.RepeatWrapping;
  groundBump.wrapT = THREE.RepeatWrapping;
  groundBump.repeat.set(16, 16);
  groundBump.anisotropy = aniso;

  // 3. Utah Juniper Bark Texture (256x256)
  const bSize = 256;
  const bCanvas = document.createElement('canvas');
  bCanvas.width = bSize;
  bCanvas.height = bSize;
  const bCtx = bCanvas.getContext('2d')!;
  const bImg = bCtx.createImageData(bSize, bSize);
  for (let y = 0; y < bSize; y++) {
    const v = y / bSize;
    for (let x = 0; x < bSize; x++) {
      const u = x / bSize;
      const idx = (y * bSize + x) * 4;
      const fibrous = fbm(u * 18, v * 4, 3, 5.5);
      const twist = Math.sin((u * 10 + v * 2.5 + fibrous * 0.6) * Math.PI * 2) * 0.5 + 0.5;
      bImg.data[idx] = Math.min(255, 84 + twist * 42 + fibrous * 26);
      bImg.data[idx + 1] = Math.min(255, 68 + twist * 34 + fibrous * 22);
      bImg.data[idx + 2] = Math.min(255, 58 + twist * 28 + fibrous * 18);
      bImg.data[idx + 3] = 255;
    }
  }
  bCtx.putImageData(bImg, 0, 0);
  const barkAlbedo = new THREE.CanvasTexture(bCanvas);
  barkAlbedo.colorSpace = THREE.SRGBColorSpace;
  barkAlbedo.wrapS = THREE.RepeatWrapping;
  barkAlbedo.wrapT = THREE.RepeatWrapping;
  barkAlbedo.anisotropy = aniso;

  // 4. Soft Radial Contact Shadow Disc (128x128)
  const cSize = 128;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = cSize;
  cCanvas.height = cSize;
  const cCtx = cCanvas.getContext('2d')!;
  const cGrad = cCtx.createRadialGradient(cSize / 2, cSize / 2, 4, cSize / 2, cSize / 2, cSize / 2);
  cGrad.addColorStop(0, 'rgba(18, 10, 6, 0.72)');
  cGrad.addColorStop(0.55, 'rgba(18, 10, 6, 0.28)');
  cGrad.addColorStop(1, 'rgba(18, 10, 6, 0)');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, cSize, cSize);
  const contactShadow = new THREE.CanvasTexture(cCanvas);

  // 5. Star Glow Sprite (64x64)
  const sSize = 64;
  const sCanvas = document.createElement('canvas');
  sCanvas.width = sSize;
  sCanvas.height = sSize;
  const sCtx = sCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(sSize / 2, sSize / 2, 0, sSize / 2, sSize / 2, sSize / 2);
  sGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  sGrad.addColorStop(0.22, 'rgba(225, 238, 255, 0.88)');
  sGrad.addColorStop(0.55, 'rgba(180, 210, 255, 0.24)');
  sGrad.addColorStop(1, 'rgba(180, 210, 255, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, sSize, sSize);
  const starGlow = new THREE.CanvasTexture(sCanvas);

  return {
    sandstoneAlbedo,
    sandstoneBump,
    sandstoneRoughness,
    groundAlbedo,
    groundBump,
    barkAlbedo,
    contactShadow,
    starGlow,
    dispose: () => {
      sandstoneAlbedo.dispose();
      sandstoneBump.dispose();
      sandstoneRoughness.dispose();
      groundAlbedo.dispose();
      groundBump.dispose();
      barkAlbedo.dispose();
      contactShadow.dispose();
      starGlow.dispose();
    },
  };
}

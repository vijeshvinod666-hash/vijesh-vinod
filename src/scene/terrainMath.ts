/**
 * Deterministic mathematical terrain heightfield for Arches National Park.
 * Shared by terrain mesh generation, prop/wildlife grounding, and unit tests.
 */

export function groundHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);

  // Broad slickrock amphitheater bowl centered around Delicate Arch (0, 0)
  const bowlFlatten = Math.exp(-(r * r) / (2 * 30 * 30));

  // Gentle rolling Navajo sandstone dunes & slickrock ridges
  const dunes =
    Math.sin(x * 0.04) * Math.cos(z * 0.036) * 1.25 +
    Math.sin(x * 0.095 + z * 0.075) * 0.38 +
    Math.cos(x * 0.022 - z * 0.028) * 0.95;

  // Gently elevated sandstone slickrock bench under Delicate Arch (0, 0)
  const archPlinth = 1.35 * Math.exp(-(r * r) / (2 * 11.5 * 11.5));

  // Sheltered flat desert wash pocket near Wildlife Meadow (15.5, 15)
  const dWash = Math.hypot(x - 15.5, z - 15);
  const wildlifeWash = -0.65 * Math.exp(-(dWash * dWash) / (2 * 8.0 * 8.0));

  // Gentle distant canyon rim rise beyond 68m radius (avoids harsh spiky peaks)
  const rimFactor = Math.max(0, Math.min(1.4, (r - 68) / 48));
  const rimAngle = Math.atan2(z, x);
  const rimMesa =
    rimFactor *
    rimFactor *
    (5.5 + 1.8 * Math.sin(rimAngle * 4.0 + 0.5) + 1.1 * Math.cos(rimAngle * 7.0));

  return dunes * (1 - 0.68 * bowlFlatten) + archPlinth + wildlifeWash + rimMesa;
}

/**
 * Computes approximate surface normal at (x, z) via central differences
 * for aligning ground-hugging boulders, shrubs, and contact shadows.
 */
export function groundNormalAt(x: number, z: number): [number, number, number] {
  const eps = 0.5;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);

  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

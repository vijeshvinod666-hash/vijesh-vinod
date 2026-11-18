export const DOCUMENTARY_DURATION = 60;

export interface DocumentaryChapter {
  id: string;
  index: number;
  title: string;
  shortLabel: string;
  startTime: number;
  endTime: number;
  narration: string;
  subtitleLocation: string;
  timeOfDayLabel: string;
}

export interface AtmosphereKeyframe {
  time: number;
  skyZenith: [number, number, number];
  skyHorizon: [number, number, number];
  sunColor: [number, number, number];
  sunIntensity: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  hemiSky: [number, number, number];
  hemiGround: [number, number, number];
  hemiIntensity: number;
  fogColor: [number, number, number];
  fogDensity: number;
  starVisibility: number;
  exposure: number;
}

export interface CameraKeyframe {
  time: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const DOCUMENTARY_CHAPTERS: DocumentaryChapter[] = [
  {
    id: 'opening',
    index: 1,
    title: 'Powerful Opening',
    shortLabel: 'Opening',
    startTime: 0,
    endTime: 8,
    narration:
      "In the heart of Utah's red desert lies a natural wonder unlike any other… Arches National Park!",
    subtitleLocation: 'Colorado Plateau · Moab, Utah',
    timeOfDayLabel: 'Golden Hour',
  },
  {
    id: 'ancient-wonders',
    index: 2,
    title: 'Ancient Wonders',
    shortLabel: 'Ancient Wonders',
    startTime: 8,
    endTime: 20,
    narration:
      'Home to more than 2,000 natural stone arches, this breathtaking landscape was sculpted over millions of years by wind, water, and time.',
    subtitleLocation: 'Entrada Sandstone Fins · 150M Years',
    timeOfDayLabel: 'Late Afternoon',
  },
  {
    id: 'delicate-arch',
    index: 3,
    title: 'Delicate Arch',
    shortLabel: 'Delicate Arch',
    startTime: 20,
    endTime: 32,
    narration:
      'Among its greatest treasures is Delicate Arch, an iconic sandstone masterpiece and a symbol of Utah. Thousands of visitors travel here to witness its incredible beauty.',
    subtitleLocation: 'Delicate Arch · 52 ft Freestanding Span',
    timeOfDayLabel: 'Desert Sunset',
  },
  {
    id: 'wildlife-nature',
    index: 4,
    title: 'Wildlife and Nature',
    shortLabel: 'Wildlife',
    startTime: 32,
    endTime: 43,
    narration:
      'Beyond the towering rocks, desert wildlife survives in this harsh environment, while unique plants flourish against all odds.',
    subtitleLocation: 'Pinyon-Juniper Wash · High Desert Ecosystem',
    timeOfDayLabel: 'Amber Dusk',
  },
  {
    id: 'night-sky',
    index: 5,
    title: 'Night Sky',
    shortLabel: 'Night Sky',
    startTime: 43,
    endTime: 53,
    narration:
      'As darkness falls, the desert transforms once again. Millions of stars illuminate the sky, creating a magical scene above the ancient landscape.',
    subtitleLocation: 'International Dark Sky Park',
    timeOfDayLabel: 'Milky Way Night',
  },
  {
    id: 'ending',
    index: 6,
    title: 'Powerful Ending',
    shortLabel: 'Ending',
    startTime: 53,
    endTime: 60,
    narration:
      'Arches National Park is more than a destination. It is a masterpiece of nature, proving that time can turn stone into art!',
    subtitleLocation: 'Arches National Park · Utah',
    timeOfDayLabel: 'First Light',
  },
];

export const ATMOSPHERE_KEYFRAMES: AtmosphereKeyframe[] = [
  {
    time: 0,
    skyZenith: [0.14, 0.32, 0.62],
    skyHorizon: [0.96, 0.56, 0.34],
    sunColor: [1.0, 0.74, 0.48],
    sunIntensity: 2.9,
    sunElevationDeg: 22,
    sunAzimuthDeg: 225,
    hemiSky: [0.58, 0.74, 0.96],
    hemiGround: [0.52, 0.24, 0.14],
    hemiIntensity: 0.72,
    fogColor: [0.85, 0.54, 0.39],
    fogDensity: 0.004,
    starVisibility: 0.0,
    exposure: 1.08,
  },
  {
    time: 12,
    skyZenith: [0.13, 0.38, 0.7],
    skyHorizon: [0.86, 0.66, 0.5],
    sunColor: [1.0, 0.86, 0.68],
    sunIntensity: 3.1,
    sunElevationDeg: 35,
    sunAzimuthDeg: 205,
    hemiSky: [0.64, 0.8, 0.98],
    hemiGround: [0.55, 0.27, 0.16],
    hemiIntensity: 0.76,
    fogColor: [0.82, 0.62, 0.48],
    fogDensity: 0.0036,
    starVisibility: 0.0,
    exposure: 1.06,
  },
  {
    time: 24,
    skyZenith: [0.15, 0.23, 0.48],
    skyHorizon: [0.98, 0.42, 0.21],
    sunColor: [1.0, 0.54, 0.24],
    sunIntensity: 3.2,
    sunElevationDeg: 11,
    sunAzimuthDeg: 248,
    hemiSky: [0.48, 0.54, 0.82],
    hemiGround: [0.46, 0.19, 0.12],
    hemiIntensity: 0.64,
    fogColor: [0.84, 0.43, 0.27],
    fogDensity: 0.0044,
    starVisibility: 0.04,
    exposure: 1.12,
  },
  {
    time: 36,
    skyZenith: [0.11, 0.16, 0.36],
    skyHorizon: [0.82, 0.38, 0.26],
    sunColor: [1.0, 0.58, 0.36],
    sunIntensity: 2.2,
    sunElevationDeg: 7,
    sunAzimuthDeg: 256,
    hemiSky: [0.42, 0.48, 0.76],
    hemiGround: [0.36, 0.18, 0.12],
    hemiIntensity: 0.62,
    fogColor: [0.62, 0.34, 0.27],
    fogDensity: 0.0042,
    starVisibility: 0.15,
    exposure: 1.1,
  },
  {
    time: 43,
    skyZenith: [0.008, 0.014, 0.045],
    skyHorizon: [0.032, 0.052, 0.125],
    sunColor: [0.56, 0.7, 1.0],
    sunIntensity: 1.05,
    sunElevationDeg: 40,
    sunAzimuthDeg: 150,
    hemiSky: [0.14, 0.22, 0.44],
    hemiGround: [0.07, 0.05, 0.07],
    hemiIntensity: 0.46,
    fogColor: [0.025, 0.04, 0.095],
    fogDensity: 0.0028,
    starVisibility: 1.0,
    exposure: 1.16,
  },
  {
    time: 52,
    skyZenith: [0.01, 0.016, 0.052],
    skyHorizon: [0.038, 0.058, 0.135],
    sunColor: [0.6, 0.74, 1.0],
    sunIntensity: 1.1,
    sunElevationDeg: 38,
    sunAzimuthDeg: 145,
    hemiSky: [0.16, 0.24, 0.46],
    hemiGround: [0.075, 0.055, 0.075],
    hemiIntensity: 0.48,
    fogColor: [0.03, 0.046, 0.105],
    fogDensity: 0.0028,
    starVisibility: 0.98,
    exposure: 1.18,
  },
  {
    time: 54,
    skyZenith: [0.11, 0.2, 0.42],
    skyHorizon: [0.92, 0.48, 0.3],
    sunColor: [1.0, 0.65, 0.38],
    sunIntensity: 2.35,
    sunElevationDeg: 10,
    sunAzimuthDeg: 112,
    hemiSky: [0.5, 0.62, 0.88],
    hemiGround: [0.42, 0.19, 0.12],
    hemiIntensity: 0.66,
    fogColor: [0.76, 0.44, 0.32],
    fogDensity: 0.0038,
    starVisibility: 0.12,
    exposure: 1.1,
  },
  {
    time: 60,
    skyZenith: [0.15, 0.29, 0.56],
    skyHorizon: [0.97, 0.56, 0.36],
    sunColor: [1.0, 0.7, 0.42],
    sunIntensity: 2.8,
    sunElevationDeg: 16,
    sunAzimuthDeg: 105,
    hemiSky: [0.58, 0.7, 0.94],
    hemiGround: [0.48, 0.22, 0.13],
    hemiIntensity: 0.72,
    fogColor: [0.84, 0.5, 0.36],
    fogDensity: 0.0038,
    starVisibility: 0.02,
    exposure: 1.1,
  },
];

export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  // 0:00–0:08 Powerful Opening: grand golden-hour vista framing Delicate Arch & surrounding park
  { time: 0, position: [4, 15.5, 44], target: [0, 7.8, 0], fov: 46 },
  { time: 7.5, position: [-10, 10.5, 29], target: [-3, 7.2, -3], fov: 46 },

  // 0:08–0:20 Ancient Wonders: right at t=8 frame Landscape Arch, Double Arch & Balanced Rock
  { time: 8.2, position: [-22, 12.5, 16], target: [-15, 6.2, -16], fov: 48 },
  { time: 14, position: [-8, 12.0, 6], target: [0, 6.5, -16], fov: 48 },
  { time: 19.5, position: [15, 10.5, 4], target: [16, 6.2, -14], fov: 47 },

  // 0:20–0:32 Delicate Arch: heroic close sunset orbit around Delicate Arch
  { time: 20.2, position: [16, 7.2, 18], target: [0, 8.2, 0], fov: 44 },
  { time: 26, position: [2, 6.2, 22], target: [0, 8.2, 0], fov: 44 },
  { time: 31.5, position: [-12, 7.0, 19], target: [0, 8.2, 0], fov: 43 },

  // 0:32–0:43 Wildlife and Nature: clear unobstructed view of Mule Deer buck & doe, Prickly Pear, Junipers & Eagle
  { time: 32.2, position: [11.5, 3.6, 22.8], target: [16.0, 1.8, 15.0], fov: 42 },
  { time: 37.5, position: [14.2, 3.4, 21.8], target: [16.0, 1.9, 15.2], fov: 42 },
  { time: 42.5, position: [20.5, 3.8, 20.5], target: [15.8, 2.0, 15.0], fov: 43 },

  // 0:43–0:53 Night Sky: clear open-bowl low-angle upward stargazing framing full Delicate Arch + Milky Way
  { time: 43.2, position: [4.5, 3.2, 24.5], target: [0, 11.2, -3], fov: 53 },
  { time: 48, position: [-1.5, 3.0, 23.5], target: [0, 12.0, -4], fov: 54 },
  { time: 52.5, position: [-6.0, 3.4, 23.0], target: [0, 11.8, -3], fov: 53 },

  // 0:53–1:00 Powerful Ending: majestic sunrise crane pullback framing the entire park
  { time: 53.2, position: [-3.0, 6.0, 27], target: [0, 8.5, 0], fov: 49 },
  { time: 60, position: [0, 14.5, 42], target: [0, 8.0, 0], fov: 46 },
];

export function clampTime(timeSec: number): number {
  if (!Number.isFinite(timeSec)) return 0;
  return Math.max(0, Math.min(DOCUMENTARY_DURATION, timeSec));
}

export function getChapterAtTime(timeSec: number): DocumentaryChapter {
  const t = clampTime(timeSec);
  for (let i = 0; i < DOCUMENTARY_CHAPTERS.length; i++) {
    const ch = DOCUMENTARY_CHAPTERS[i];
    if (t < ch.endTime || i === DOCUMENTARY_CHAPTERS.length - 1) {
      return ch;
    }
  }
  return DOCUMENTARY_CHAPTERS[0];
}

export function formatTimecode(timeSec: number): string {
  const clamped = Math.floor(clampTime(timeSec));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerpNum(a[0], b[0], t), lerpNum(a[1], b[1], t), lerpNum(a[2], b[2], t)];
}

export function interpolateAtmosphere(timeSec: number): AtmosphereKeyframe {
  const t = clampTime(timeSec);
  const frames = ATMOSPHERE_KEYFRAMES;

  if (t <= frames[0].time) return frames[0];
  if (t >= frames[frames.length - 1].time) return frames[frames.length - 1];

  let idx = 0;
  for (let i = 0; i < frames.length - 1; i++) {
    if (t >= frames[i].time && t <= frames[i + 1].time) {
      idx = i;
      break;
    }
  }

  const a = frames[idx];
  const b = frames[idx + 1];
  const span = Math.max(0.0001, b.time - a.time);
  const alpha = smoothstep01((t - a.time) / span);

  return {
    time: t,
    skyZenith: lerpVec3(a.skyZenith, b.skyZenith, alpha),
    skyHorizon: lerpVec3(a.skyHorizon, b.skyHorizon, alpha),
    sunColor: lerpVec3(a.sunColor, b.sunColor, alpha),
    sunIntensity: lerpNum(a.sunIntensity, b.sunIntensity, alpha),
    sunElevationDeg: lerpNum(a.sunElevationDeg, b.sunElevationDeg, alpha),
    sunAzimuthDeg: lerpNum(a.sunAzimuthDeg, b.sunAzimuthDeg, alpha),
    hemiSky: lerpVec3(a.hemiSky, b.hemiSky, alpha),
    hemiGround: lerpVec3(a.hemiGround, b.hemiGround, alpha),
    hemiIntensity: lerpNum(a.hemiIntensity, b.hemiIntensity, alpha),
    fogColor: lerpVec3(a.fogColor, b.fogColor, alpha),
    fogDensity: lerpNum(a.fogDensity, b.fogDensity, alpha),
    starVisibility: lerpNum(a.starVisibility, b.starVisibility, alpha),
    exposure: lerpNum(a.exposure, b.exposure, alpha),
  };
}

function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function interpolateCamera(timeSec: number): CameraKeyframe {
  const t = clampTime(timeSec);
  const frames = CAMERA_KEYFRAMES;

  if (t <= frames[0].time) return frames[0];
  if (t >= frames[frames.length - 1].time) return frames[frames.length - 1];

  let idx = 0;
  for (let i = 0; i < frames.length - 1; i++) {
    if (t >= frames[i].time && t <= frames[i + 1].time) {
      idx = i;
      break;
    }
  }

  const p0 = frames[Math.max(0, idx - 1)];
  const p1 = frames[idx];
  const p2 = frames[idx + 1];
  const p3 = frames[Math.min(frames.length - 1, idx + 2)];

  const span = Math.max(0.0001, p2.time - p1.time);
  const u = smoothstep01((t - p1.time) / span);

  return {
    time: t,
    position: [
      catmullRom1D(p0.position[0], p1.position[0], p2.position[0], p3.position[0], u),
      catmullRom1D(p0.position[1], p1.position[1], p2.position[1], p3.position[1], u),
      catmullRom1D(p0.position[2], p1.position[2], p2.position[2], p3.position[2], u),
    ],
    target: [
      catmullRom1D(p0.target[0], p1.target[0], p2.target[0], p3.target[0], u),
      catmullRom1D(p0.target[1], p1.target[1], p2.target[1], p3.target[1], u),
      catmullRom1D(p0.target[2], p1.target[2], p2.target[2], p3.target[2], u),
    ],
    fov: lerpNum(p1.fov, p2.fov, u),
  };
}

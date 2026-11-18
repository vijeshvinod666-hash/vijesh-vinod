import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOCUMENTARY_CHAPTERS,
  DOCUMENTARY_DURATION,
  clampTime,
  formatTimecode,
  getChapterAtTime,
  interpolateAtmosphere,
  interpolateCamera,
} from './scriptData';
import { groundHeightAt, groundNormalAt } from '../scene/terrainMath';

test('documentary chapters cover 0 to 60 seconds contiguously with exact script', () => {
  assert.equal(DOCUMENTARY_CHAPTERS.length, 6);
  assert.equal(DOCUMENTARY_CHAPTERS[0].startTime, 0);
  assert.equal(DOCUMENTARY_CHAPTERS[DOCUMENTARY_CHAPTERS.length - 1].endTime, DOCUMENTARY_DURATION);

  for (let i = 0; i < DOCUMENTARY_CHAPTERS.length - 1; i++) {
    assert.equal(DOCUMENTARY_CHAPTERS[i].endTime, DOCUMENTARY_CHAPTERS[i + 1].startTime);
  }

  assert.equal(getChapterAtTime(0).id, 'opening');
  assert.equal(getChapterAtTime(7.9).id, 'opening');
  assert.equal(getChapterAtTime(8).id, 'ancient-wonders');
  assert.equal(getChapterAtTime(20).id, 'delicate-arch');
  assert.equal(getChapterAtTime(32).id, 'wildlife-nature');
  assert.equal(getChapterAtTime(43).id, 'night-sky');
  assert.equal(getChapterAtTime(53).id, 'ending');
  assert.equal(getChapterAtTime(60).id, 'ending');
});

test('timecode formatting and clamping stay valid at bounds', () => {
  assert.equal(clampTime(-5), 0);
  assert.equal(clampTime(99), 60);
  assert.equal(clampTime(Number.NaN), 0);

  assert.equal(formatTimecode(0), '0:00');
  assert.equal(formatTimecode(8.9), '0:08');
  assert.equal(formatTimecode(43), '0:43');
  assert.equal(formatTimecode(60), '1:00');
});

test('atmosphere transitions into dark starry night around 45-52s and back to dawn at 60s', () => {
  const day = interpolateAtmosphere(12);
  const night = interpolateAtmosphere(48);
  const dawn = interpolateAtmosphere(60);

  assert.equal(day.starVisibility, 0);
  assert.ok(night.starVisibility > 0.9, 'stars should be brightly visible during Night Sky chapter');
  assert.ok(night.skyZenith[2] < 0.12, 'night zenith sky should be deep dark blue-black');
  assert.ok(dawn.starVisibility < 0.15, 'stars fade as dawn breaks at 1:00');
  assert.ok(dawn.sunIntensity > night.sunIntensity);
});

test('camera spline produces finite positions above terrain', () => {
  for (let t = 0; t <= 60; t += 2) {
    const cam = interpolateCamera(t);
    for (const val of [...cam.position, ...cam.target, cam.fov]) {
      assert.ok(Number.isFinite(val), `Non-finite camera value at t=${t}`);
    }
    const groundY = groundHeightAt(cam.position[0], cam.position[2]);
    assert.ok(
      cam.position[1] > groundY + 1.0,
      `Camera at t=${t} (${cam.position[1].toFixed(2)}) must stay above terrain (${groundY.toFixed(2)})`,
    );
  }
});

test('terrain groundNormalAt returns a normalized upward-pointing vector', () => {
  const [nx, ny, nz] = groundNormalAt(0, 0);
  const len = Math.hypot(nx, ny, nz);
  assert.ok(Math.abs(len - 1) < 1e-5);
  assert.ok(ny > 0.7);
});

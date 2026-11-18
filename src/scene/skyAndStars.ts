import * as THREE from 'three';
import { AtmosphereKeyframe } from '../documentary/scriptData';

export interface SkyAndStarsRig {
  group: THREE.Group;
  update: (atmo: AtmosphereKeyframe, elapsedSec: number, sunDirection: THREE.Vector3) => void;
  dispose: () => void;
}

export function createSkyAndStars(starTexture: THREE.Texture): SkyAndStarsRig {
  const group = new THREE.Group();

  // 1. Procedural Sky Dome Shader with Sun Glow + Twilight Band + Milky Way Galactic Band
  const skyGeo = new THREE.SphereGeometry(220, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenithColor: { value: new THREE.Color(0.14, 0.32, 0.62) },
      uHorizonColor: { value: new THREE.Color(0.96, 0.56, 0.34) },
      uSunColor: { value: new THREE.Color(1.0, 0.74, 0.48) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.3, -0.8).normalize() },
      uStarVisibility: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDir;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uStarVisibility;
      uniform float uTime;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float elev = clamp(dir.y, 0.0, 1.0);

        float horizonCurve = pow(1.0 - elev, 2.35);
        vec3 sky = mix(uZenithColor, uHorizonColor, horizonCurve);

        float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
        float halo = pow(sunDot, 12.0) * 0.44 * (1.0 - uStarVisibility * 0.9);
        float core = smoothstep(0.9975, 0.9994, sunDot) * 1.5 * (1.0 - uStarVisibility * 0.8);
        sky += uSunColor * (halo + core);

        // Luminous Milky Way diagonal galactic band during Night Sky chapter
        if (uStarVisibility > 0.01) {
          vec3 galNormal = normalize(vec3(0.42, 0.38, -0.82));
          float bandDist = abs(dot(dir, galNormal));
          float bandMask = exp(-bandDist * bandDist * 11.0) * smoothstep(-0.02, 0.22, dir.y);
          float neb = noise(dir * 6.5 + vec3(0.0, uTime * 0.004, 0.0));
          float dustRift = noise(dir * 15.0);
          float milky = bandMask * (0.42 + 0.58 * neb) * (0.45 + 0.55 * dustRift);
          vec3 milkyColor = mix(vec3(0.16, 0.28, 0.56), vec3(0.48, 0.58, 0.88), neb);
          sky += milkyColor * milky * uStarVisibility * 1.15;
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // 2. 2,600-Star Celestial Dome with Individual Twinkling & Crisp Star Pinpoints
  const starCount = 2600;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starPhase = new Float32Array(starCount);
  const starSize = new Float32Array(starCount);

  const colorPalette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xd2e6ff),
    new THREE.Color(0xffe7c9),
    new THREE.Color(0xa6cbff),
  ];

  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(0.03 + 0.97 * v);
    const radius = 195;

    starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = radius * Math.cos(phi);
    starPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const col = colorPalette[i % colorPalette.length];
    starColors[i * 3] = col.r;
    starColors[i * 3 + 1] = col.g;
    starColors[i * 3 + 2] = col.b;

    starPhase[i] = Math.random() * Math.PI * 2;
    starSize[i] = i % 15 === 0 ? 5.8 : 2.2 + Math.random() * 2.6;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSprite: { value: starTexture },
      uStarVisibility: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      attribute vec3 color;
      attribute float aPhase;
      attribute float aSize;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;

      void main() {
        vColor = color;
        vTwinkle = 0.72 + 0.28 * sin(uTime * 2.0 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (340.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uSprite;
      uniform float uStarVisibility;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vec4 tex = texture2D(uSprite, gl_PointCoord);
        float alpha = tex.a * uStarVisibility * vTwinkle;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * tex.rgb * 1.35, alpha);
      }
    `,
  });

  const starPoints = new THREE.Points(starGeo, starMat);
  group.add(starPoints);

  // 3. Desert Canyon Wind Dust Motes (240 golden airborne particles)
  const dustCount = 240;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 76;
    dustPos[i * 3 + 1] = 0.8 + Math.random() * 14;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 76;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

  const dustMat = new THREE.PointsMaterial({
    map: starTexture,
    color: 0xffd5a6,
    size: 0.24,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  group.add(dustPoints);

  return {
    group,
    update: (atmo, elapsedSec, sunDirection) => {
      skyMat.uniforms.uZenithColor.value.setRGB(
        atmo.skyZenith[0],
        atmo.skyZenith[1],
        atmo.skyZenith[2],
      );
      skyMat.uniforms.uHorizonColor.value.setRGB(
        atmo.skyHorizon[0],
        atmo.skyHorizon[1],
        atmo.skyHorizon[2],
      );
      skyMat.uniforms.uSunColor.value.setRGB(atmo.sunColor[0], atmo.sunColor[1], atmo.sunColor[2]);
      skyMat.uniforms.uSunDir.value.copy(sunDirection).normalize();
      skyMat.uniforms.uStarVisibility.value = atmo.starVisibility;
      skyMat.uniforms.uTime.value = elapsedSec;

      starMat.uniforms.uStarVisibility.value = atmo.starVisibility;
      starMat.uniforms.uTime.value = elapsedSec;
      starPoints.visible = atmo.starVisibility > 0.01;
      starPoints.rotation.y = elapsedSec * 0.003;

      dustMat.opacity = 0.28 * (1.0 - atmo.starVisibility * 0.75);
      dustPoints.position.x = Math.sin(elapsedSec * 0.14) * 1.4;
      dustPoints.position.y = Math.cos(elapsedSec * 0.2) * 0.25;
    },
    dispose: () => {
      skyGeo.dispose();
      skyMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
    },
  };
}

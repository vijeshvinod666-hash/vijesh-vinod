import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import { groundHeightAt } from './terrainMath';

export interface AnimatedWildlifeRefs {
  deerGroup1: THREE.Group;
  deer1Head: THREE.Group;
  deerGroup2: THREE.Group;
  deer2Head: THREE.Group;
  eagleGroup: THREE.Group;
  eagleLeftWing: THREE.Group;
  eagleRightWing: THREE.Group;
}

export interface SceneGeometryBundle {
  root: THREE.Group;
  wildlife: AnimatedWildlifeRefs;
  dispose: () => void;
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 91.3458) * 47453.5453;
  return x - Math.floor(x);
}

/**
 * Sculpts organic stratified sandstone geometry along a TubeGeometry curve
 * AND remaps UVs to world-horizontal sedimentary bedding planes so sandstone
 * strata layers run naturally horizontal across legs and arch crown.
 */
function buildSculptedArchTube(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radialSegments: number,
  radiusFn: (t: number, angle: number) => number,
): THREE.BufferGeometry {
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1.0, radialSegments, false);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const frames = curve.computeFrenetFrames(tubularSegments, false);

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const center = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      const angle = (j / radialSegments) * Math.PI * 2;
      const r = radiusFn(t, angle);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const worldX = center.x + r * (cosA * N.x + sinA * B.x);
      const worldY = center.y + r * (cosA * N.y + sinA * B.y);
      const worldZ = center.z + r * (cosA * N.z + sinA * B.z);

      // Sedimentary horizontal shelf ridges & wind-eroded fluting
      const strataRidge = Math.sin(worldY * 2.1 + worldX * 0.25) * 0.14;
      const chiseledX = worldX + Math.sin(worldY * 1.25) * 0.1;
      const chiseledZ = worldZ + strataRidge * 0.65;

      pos.setXYZ(idx, chiseledX, worldY, chiseledZ);

      // Planar/world-Y UV projection so sandstone strata bands are strictly horizontal
      uv.setXY(idx, (chiseledX + chiseledZ) * 0.065, worldY * 0.11);
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates an organic, flat-topped stepped Colorado Plateau canyon mesa/butte
 * instead of a smooth geometric cone stump.
 */
function buildSteppedButteGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(4.2, 8.6, 13.0, 14, 7);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const r = Math.hypot(x, z);

    // Stepped geological ledges + vertical erosion gullies
    const ledge = Math.sin(y * 1.35) * 0.35;
    const gully = Math.cos(angle * 5.0 + y * 0.18) * 0.55 + Math.sin(angle * 3.0) * 0.45;
    const scaleR = r > 0.01 ? (r + ledge + gully) / r : 1.0;

    const nx = x * scaleR;
    const nz = z * scaleR;
    // Slight cap plateau undulation
    const ny = y > 5.8 ? y + Math.sin(angle * 2.0) * 0.35 : y;

    pos.setXYZ(i, nx, ny, nz);
    uv.setXY(i, (nx + nz) * 0.05, (ny + 6.5) * 0.08);
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createContactShadowDisc(
  shadowTex: THREE.Texture,
  width: number,
  depth: number,
  opacity = 0.44,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.position.y = 0.03;
  return disc;
}

/**
 * Hero Subject 1: Delicate Arch (8 tightly integrated composite parts)
 * Asymmetric free-standing Entrada sandstone arch with thick western buttress,
 * slender eastern leg, integrated crest saddle, sculpted plinths, and talus boulders.
 */
function createDelicateArch(
  sandstoneMat: THREE.MeshStandardMaterial,
  darkSandstoneMat: THREE.MeshStandardMaterial,
  capMat: THREE.MeshStandardMaterial,
  shadowTex: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DelicateArch';

  // 1. Primary sculpted arch span curve (pivoted at bottom center y=0)
  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.2, -0.5, 0.25),
    new THREE.Vector3(-5.9, 3.6, 0.12),
    new THREE.Vector3(-4.8, 8.8, -0.15),
    new THREE.Vector3(-2.4, 13.0, -0.3),
    new THREE.Vector3(0.4, 14.4, -0.1),
    new THREE.Vector3(3.1, 13.1, 0.15),
    new THREE.Vector3(4.8, 9.2, 0.28),
    new THREE.Vector3(5.3, 4.2, 0.18),
    new THREE.Vector3(5.6, -0.6, 0.0),
  ]);

  const spanGeo = buildSculptedArchTube(archCurve, 68, 20, (t, angle) => {
    const leftThick = Math.exp(-Math.pow((t - 0.16) * 3.0, 2)) * 1.25;
    const rightFoot = Math.exp(-Math.pow((t - 0.94) * 4.8, 2)) * 0.72;
    const crownTaper = 1.15 - 0.34 * Math.sin(t * Math.PI);
    const facet = 1.0 + 0.12 * Math.cos(angle * 3 + t * 7.0) + 0.07 * Math.sin(angle * 5);
    return (1.26 * crownTaper + leftThick + rightFoot) * facet;
  });
  const mainSpan = new THREE.Mesh(spanGeo, sandstoneMat);
  mainSpan.castShadow = true;
  mainSpan.receiveShadow = true;
  group.add(mainSpan);

  // 2. Left Entrada sandstone buttress plinth (tightly hugging left leg)
  const leftPlinthPts = [
    new THREE.Vector2(0, -0.8),
    new THREE.Vector2(3.5, -0.8),
    new THREE.Vector2(3.1, 0.7),
    new THREE.Vector2(2.6, 2.0),
    new THREE.Vector2(2.2, 3.3),
    new THREE.Vector2(1.5, 4.4),
    new THREE.Vector2(0, 4.6),
  ];
  const leftPlinth = new THREE.Mesh(new THREE.LatheGeometry(leftPlinthPts, 16), darkSandstoneMat);
  leftPlinth.position.set(-6.05, 0, 0.2);
  leftPlinth.scale.set(1.0, 1.0, 0.85);
  leftPlinth.castShadow = true;
  leftPlinth.receiveShadow = true;
  group.add(leftPlinth);

  // 3. Right slender sandstone pedestal collar (tightly hugging right leg)
  const rightPlinthPts = [
    new THREE.Vector2(0, -0.8),
    new THREE.Vector2(2.6, -0.8),
    new THREE.Vector2(2.2, 0.7),
    new THREE.Vector2(1.75, 2.0),
    new THREE.Vector2(1.3, 3.2),
    new THREE.Vector2(0, 3.4),
  ];
  const rightPlinth = new THREE.Mesh(new THREE.LatheGeometry(rightPlinthPts, 16), darkSandstoneMat);
  rightPlinth.position.set(5.48, 0, 0.08);
  rightPlinth.castShadow = true;
  rightPlinth.receiveShadow = true;
  group.add(rightPlinth);

  // 4. Sculpted sandstone cap-stone saddle hugging the upper arch crest
  const capCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, 13.0, -0.25),
    new THREE.Vector3(0.4, 14.55, -0.08),
    new THREE.Vector3(3.0, 13.2, 0.14),
  ]);
  const capGeo = buildSculptedArchTube(capCurve, 24, 12, (t) => 0.75 + 0.38 * Math.sin(t * Math.PI));
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = 0.28;
  capMesh.castShadow = true;
  capMesh.receiveShadow = true;
  group.add(capMesh);

  // 5. Eroded western fin shoulder (sits flush against outer left buttress)
  const shoulderGeo = new THREE.CylinderGeometry(1.15, 2.1, 6.2, 10);
  const shoulder = new THREE.Mesh(shoulderGeo, darkSandstoneMat);
  shoulder.position.set(-6.6, 3.1, 0.15);
  shoulder.rotation.z = -0.14;
  shoulder.scale.set(0.95, 1.0, 0.78);
  shoulder.castShadow = true;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  // 6, 7, 8. Talus slickrock boulders nestled around arch feet
  const boulderGeo = new THREE.DodecahedronGeometry(1.15, 1);
  const talusConfigs = [
    { pos: [-8.1, 0.35, 1.1], scale: [1.35, 0.65, 1.05], rot: [0.1, 0.5, 0.2] },
    { pos: [6.7, 0.3, -0.8], scale: [1.1, 0.52, 0.9], rot: [-0.15, 1.2, -0.1] },
    { pos: [-4.1, 0.22, -1.2], scale: [0.95, 0.45, 0.8], rot: [0.2, -0.6, 0.1] },
  ];
  for (const cfg of talusConfigs) {
    const slab = new THREE.Mesh(boulderGeo, darkSandstoneMat);
    slab.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    slab.scale.set(cfg.scale[0], cfg.scale[1], cfg.scale[2]);
    slab.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  }

  group.add(createContactShadowDisc(shadowTex, 18, 8, 0.36));
  return group;
}

/**
 * Secondary Landmark 2: Landscape Arch (slender sweeping 22m ribbon arch, 6 parts)
 */
function createLandscapeArch(
  sandstoneMat: THREE.MeshStandardMaterial,
  darkSandstoneMat: THREE.MeshStandardMaterial,
  capMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LandscapeArch';

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-11.5, -0.6, 0.4),
    new THREE.Vector3(-9.5, 5.2, 0.1),
    new THREE.Vector3(-4.5, 9.6, -0.3),
    new THREE.Vector3(0.5, 10.6, -0.1),
    new THREE.Vector3(5.8, 9.1, 0.2),
    new THREE.Vector3(10.0, 4.8, 0.3),
    new THREE.Vector3(11.4, -0.6, 0.0),
  ]);

  const ribbonGeo = buildSculptedArchTube(curve, 56, 14, (t, angle) => {
    const endThick = 1.0 + 1.5 * Math.pow(Math.abs(t - 0.5) * 2, 2.2);
    const ribbonThin = 0.62 + 0.18 * Math.cos(angle * 2);
    return endThick * ribbonThin;
  });
  const span = new THREE.Mesh(ribbonGeo, sandstoneMat);
  span.castShadow = true;
  span.receiveShadow = true;
  group.add(span);

  const finShape = new THREE.Shape();
  finShape.moveTo(-2.5, 0);
  finShape.lineTo(2.5, 0);
  finShape.lineTo(1.8, 7.2);
  finShape.lineTo(-1.4, 6.8);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 2.2,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.25,
    bevelSegments: 2,
  });
  finGeo.center();

  const leftFin = new THREE.Mesh(finGeo, darkSandstoneMat);
  leftFin.position.set(-11.2, 3.0, 0.2);
  leftFin.castShadow = true;
  leftFin.receiveShadow = true;
  group.add(leftFin);

  const rightFin = new THREE.Mesh(finGeo, darkSandstoneMat);
  rightFin.position.set(11.0, 2.8, 0.1);
  rightFin.rotation.y = 0.35;
  rightFin.castShadow = true;
  rightFin.receiveShadow = true;
  group.add(rightFin);

  const capCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.0, 10.1, -0.2),
    new THREE.Vector3(0.5, 10.75, -0.1),
    new THREE.Vector3(3.8, 9.9, 0.1),
  ]);
  const cap = new THREE.Mesh(buildSculptedArchTube(capCurve, 16, 10, () => 0.48), capMat);
  cap.position.y = 0.2;
  cap.castShadow = true;
  group.add(cap);

  const rockGeo = new THREE.DodecahedronGeometry(1.5, 1);
  const rockL = new THREE.Mesh(rockGeo, darkSandstoneMat);
  rockL.position.set(-12.8, 0.4, 1.5);
  rockL.scale.set(1.4, 0.7, 1.1);
  group.add(rockL);

  const rockR = new THREE.Mesh(rockGeo, darkSandstoneMat);
  rockR.position.set(12.2, 0.4, -1.2);
  rockR.scale.set(1.2, 0.6, 1.0);
  group.add(rockR);

  return group;
}

/**
 * Secondary Landmark 3: Double Arch (twin intersecting sandstone vaults, 6 parts)
 */
function createDoubleArch(
  sandstoneMat: THREE.MeshStandardMaterial,
  darkSandstoneMat: THREE.MeshStandardMaterial,
  capMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DoubleArch';

  const curveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7.0, -0.5, 1.8),
    new THREE.Vector3(-5.0, 7.5, 0.8),
    new THREE.Vector3(0.0, 11.4, 0.0),
    new THREE.Vector3(5.4, 7.2, -0.8),
    new THREE.Vector3(7.2, -0.5, -1.5),
  ]);
  const archA = new THREE.Mesh(
    buildSculptedArchTube(curveA, 44, 14, (t) => 1.35 + 0.55 * Math.pow(Math.abs(t - 0.5) * 2, 2)),
    sandstoneMat,
  );
  archA.castShadow = true;
  archA.receiveShadow = true;
  group.add(archA);

  const curveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, -0.5, -4.8),
    new THREE.Vector3(-2.8, 6.2, -2.5),
    new THREE.Vector3(0.2, 9.6, 0.0),
    new THREE.Vector3(3.6, 5.8, 2.8),
    new THREE.Vector3(5.2, -0.5, 5.2),
  ]);
  const archB = new THREE.Mesh(
    buildSculptedArchTube(curveB, 40, 12, (t) => 1.1 + 0.5 * Math.pow(Math.abs(t - 0.5) * 2, 2)),
    darkSandstoneMat,
  );
  archB.castShadow = true;
  archB.receiveShadow = true;
  group.add(archB);

  // Integrated sandstone saddle ridge connecting both arches
  const saddleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.4, 10.6, 0.4),
    new THREE.Vector3(0.0, 11.55, 0.0),
    new THREE.Vector3(2.4, 10.5, -0.4),
  ]);
  const saddle = new THREE.Mesh(buildSculptedArchTube(saddleCurve, 18, 10, () => 0.85), capMat);
  saddle.position.y = 0.25;
  saddle.castShadow = true;
  group.add(saddle);

  const plinthGeo = new THREE.CylinderGeometry(1.7, 2.6, 3.2, 10);
  for (const [px, pz] of [
    [-6.9, 1.7],
    [7.0, -1.4],
    [5.0, 5.0],
  ]) {
    const p = new THREE.Mesh(plinthGeo, darkSandstoneMat);
    p.position.set(px, 1.2, pz);
    p.castShadow = true;
    p.receiveShadow = true;
    group.add(p);
  }

  return group;
}

/**
 * Secondary Landmark 4: Balanced Rock (layered pedestal + cap boulder, 5 parts)
 */
function createBalancedRock(
  sandstoneMat: THREE.MeshStandardMaterial,
  darkSandstoneMat: THREE.MeshStandardMaterial,
  capMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BalancedRock';

  const pedPoints = [
    new THREE.Vector2(0, -0.5),
    new THREE.Vector2(3.8, -0.5),
    new THREE.Vector2(3.1, 1.8),
    new THREE.Vector2(2.2, 4.2),
    new THREE.Vector2(1.45, 6.8),
    new THREE.Vector2(0.95, 8.6),
    new THREE.Vector2(1.15, 9.2),
    new THREE.Vector2(0, 9.3),
  ];
  const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pedPoints, 16), sandstoneMat);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.85, 12), capMat);
  neck.position.set(0, 9.1, 0);
  neck.castShadow = true;
  group.add(neck);

  const capBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(2.55, 1), darkSandstoneMat);
  capBoulder.position.set(0.18, 11.4, 0.05);
  capBoulder.scale.set(1.05, 1.22, 0.92);
  capBoulder.rotation.set(0.12, 0.4, -0.08);
  capBoulder.castShadow = true;
  capBoulder.receiveShadow = true;
  group.add(capBoulder);

  const capRidge = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45, 1), capMat);
  capRidge.position.set(-0.35, 13.0, -0.15);
  capRidge.scale.set(1.3, 0.65, 1.0);
  capRidge.castShadow = true;
  group.add(capRidge);

  const baseSkirt = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 1), darkSandstoneMat);
  baseSkirt.position.set(-1.4, 0.4, 1.0);
  baseSkirt.scale.set(1.2, 0.45, 0.9);
  group.add(baseSkirt);

  return group;
}

/**
 * Desert Wildlife 1: Composite 10-part Desert Mule Deer
 */
function createMuleDeer(isBuck: boolean, shadowTex: THREE.Texture): { group: THREE.Group; headPivot: THREE.Group } {
  const group = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({
    color: 0xa47b58,
    roughness: 0.88,
    metalness: 0.02,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xd9c7b2,
    roughness: 0.92,
    metalness: 0.0,
  });
  const hoofEyeMat = new THREE.MeshStandardMaterial({
    color: 0x221a16,
    roughness: 0.22,
    metalness: 0.1,
  });
  const antlerMat = new THREE.MeshStandardMaterial({
    color: 0xd8cdb8,
    roughness: 0.55,
    metalness: 0.05,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.62, 6, 12), coatMat);
  torso.rotation.z = Math.PI / 2;
  torso.position.set(0, 0.92, 0);
  torso.castShadow = true;
  group.add(torso);

  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), bellyMat);
  rump.position.set(-0.36, 0.9, 0);
  rump.scale.set(0.8, 0.9, 0.85);
  group.add(rump);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), bellyMat);
  tail.position.set(-0.52, 0.88, 0);
  tail.rotation.z = 0.65;
  group.add(tail);

  const legGeo = new THREE.CylinderGeometry(0.045, 0.032, 0.78, 8);
  const hoofGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.08, 8);
  const legOffsets: [number, number, number][] = [
    [0.3, 0.41, 0.12],
    [0.3, 0.41, -0.12],
    [-0.3, 0.41, 0.12],
    [-0.3, 0.41, -0.12],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);

    const hoof = new THREE.Mesh(hoofGeo, hoofEyeMat);
    hoof.position.set(lx, 0.04, lz);
    group.add(hoof);
  }

  const headPivot = new THREE.Group();
  headPivot.position.set(0.36, 1.02, 0);
  group.add(headPivot);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.44, 10), coatMat);
  neck.position.set(0.1, 0.2, 0);
  neck.rotation.z = -0.42;
  neck.castShadow = true;
  headPivot.add(neck);

  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.18, 6, 10), coatMat);
  head.position.set(0.28, 0.39, 0);
  head.rotation.z = 1.2;
  head.castShadow = true;
  headPivot.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), hoofEyeMat);
  nose.position.set(0.42, 0.34, 0);
  headPivot.add(nose);

  const earGeo = new THREE.ConeGeometry(0.055, 0.22, 6);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, coatMat);
    ear.position.set(0.2, 0.51, side * 0.11);
    ear.rotation.set(side * 0.45, 0, 0.35);
    headPivot.add(ear);
  }

  if (isBuck) {
    for (const side of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.36, 6), antlerMat);
      beam.position.set(0.19, 0.62, side * 0.08);
      beam.rotation.set(side * 0.35, 0, 0.28);
      headPivot.add(beam);

      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.2, 6), antlerMat);
      tine.position.set(0.25, 0.72, side * 0.14);
      tine.rotation.set(side * 0.2, 0, -0.35);
      headPivot.add(tine);
    }
  }

  group.add(createContactShadowDisc(shadowTex, 1.35, 0.85, 0.42));
  return { group, headPivot };
}

/**
 * Desert Wildlife 2: Soaring Golden Eagle (7-part articulated flying silhouette)
 */
function createGoldenEagle(): {
  group: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
} {
  const group = new THREE.Group();
  const plumageMat = new THREE.MeshStandardMaterial({
    color: 0x3b281c,
    roughness: 0.75,
    metalness: 0.05,
  });
  const goldenNapeMat = new THREE.MeshStandardMaterial({
    color: 0xb88642,
    roughness: 0.65,
    metalness: 0.08,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xe2a832,
    roughness: 0.3,
    metalness: 0.15,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.46, 6, 10), plumageMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), goldenNapeMat);
  head.position.set(0, 0.03, 0.32);
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), beakMat);
  beak.rotation.x = Math.PI / 2 + 0.25;
  beak.position.set(0, 0.01, 0.43);
  group.add(beak);

  const tailGeo = new THREE.ConeGeometry(0.22, 0.42, 5);
  const tail = new THREE.Mesh(tailGeo, plumageMat);
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(1.2, 1.0, 0.16);
  tail.position.set(0, 0.02, -0.42);
  group.add(tail);

  const makeWing = (sign: number) => {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(sign * 0.1, 0.04, 0.06);

    const innerWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.38), plumageMat);
    innerWing.position.set(sign * 0.42, 0, -0.02);
    innerWing.rotation.y = sign * -0.14;
    wingPivot.add(innerWing);

    const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.24), goldenNapeMat);
    outerWing.position.set(sign * 1.1, 0.02, -0.1);
    outerWing.rotation.y = sign * -0.32;
    wingPivot.add(outerWing);

    return wingPivot;
  };

  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  group.add(leftWing);
  group.add(rightWing);

  group.scale.setScalar(1.35);
  return { group, leftWing, rightWing };
}

/**
 * Desert Flora 1: Composite Gnarled Utah Juniper Tree (7 parts)
 */
function createUtahJuniper(
  barkTex: THREE.Texture,
  shadowTex: THREE.Texture,
  seed: number,
): THREE.Group {
  const group = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.0,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x4b6340,
    roughness: 0.86,
    metalness: 0.0,
    flatShading: true,
  });
  const highlightFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x627c4f,
    roughness: 0.82,
    metalness: 0.0,
    flatShading: true,
  });

  const skew = (pseudoRand(seed) - 0.5) * 0.5;
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, 0),
    new THREE.Vector3(skew * 0.5, 0.9, 0.15),
    new THREE.Vector3(-skew * 0.4, 2.0, -0.15),
    new THREE.Vector3(skew * 0.8, 3.0, 0.2),
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 14, 0.22, 7, false), barkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const branchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.3, 0),
    new THREE.Vector3(-0.7, 2.1, 0.45),
    new THREE.Vector3(-1.15, 2.6, 0.6),
  ]);
  const branch = new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 8, 0.11, 6, false), barkMat);
  branch.castShadow = true;
  group.add(branch);

  const foliageOffsets: [number, number, number, number, boolean][] = [
    [skew * 0.7, 3.15, 0.2, 1.05, false],
    [-1.1, 2.65, 0.55, 0.82, true],
    [0.75, 2.7, -0.35, 0.78, true],
    [0.15, 3.55, -0.1, 0.7, false],
  ];
  const puffGeo = new THREE.DodecahedronGeometry(1.0, 1);
  for (const [fx, fy, fz, sc, bright] of foliageOffsets) {
    const puff = new THREE.Mesh(puffGeo, bright ? highlightFoliageMat : foliageMat);
    puff.position.set(fx, fy, fz);
    puff.scale.set(sc * 1.15, sc * 0.72, sc);
    puff.rotation.set(fx * 0.4, fz * 0.5, 0);
    puff.castShadow = true;
    puff.receiveShadow = true;
    group.add(puff);
  }

  group.add(createContactShadowDisc(shadowTex, 3.2, 3.2, 0.38));
  return group;
}

/**
 * Desert Flora 2: Sculpted Prickly Pear Cactus with Desert Blossoms (6 parts)
 */
function createPricklyPear(shadowTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x527a46,
    roughness: 0.78,
    metalness: 0.02,
  });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xf4a835,
    emissive: 0x3b2104,
    roughness: 0.45,
    metalness: 0.05,
  });

  const padGeo = new THREE.SphereGeometry(0.32, 10, 10);
  const pads: [number, number, number, number, number][] = [
    [0, 0.25, 0, 0, 0],
    [-0.28, 0.62, 0.08, 0.4, 0.2],
    [0.26, 0.68, -0.05, -0.35, -0.15],
    [0.05, 0.98, 0.14, 0.15, 0.3],
  ];
  for (const [px, py, pz, rz, ry] of pads) {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(px, py, pz);
    pad.scale.set(0.82, 1.15, 0.26);
    pad.rotation.set(0, ry, rz);
    pad.castShadow = true;
    group.add(pad);
  }

  const flowerGeo = new THREE.ConeGeometry(0.11, 0.15, 6);
  for (const [fx, fy, fz] of [
    [-0.3, 0.96, 0.09],
    [0.07, 1.32, 0.15],
  ]) {
    const flower = new THREE.Mesh(flowerGeo, blossomMat);
    flower.position.set(fx, fy, fz);
    flower.rotation.x = Math.PI;
    group.add(flower);
  }

  group.add(createContactShadowDisc(shadowTex, 1.2, 1.2, 0.32));
  return group;
}

export function buildArchesWorldGeometry(textures: ProceduralTextureSet): SceneGeometryBundle {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const sandstoneMat = new THREE.MeshStandardMaterial({
    map: textures.sandstoneAlbedo,
    bumpMap: textures.sandstoneBump,
    bumpScale: 0.38,
    roughnessMap: textures.sandstoneRoughness,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
  });

  const darkSandstoneMat = new THREE.MeshStandardMaterial({
    map: textures.sandstoneAlbedo,
    bumpMap: textures.sandstoneBump,
    bumpScale: 0.45,
    color: 0xd98a6c,
    roughness: 0.85,
    metalness: 0.04,
  });

  const capMat = new THREE.MeshStandardMaterial({
    map: textures.sandstoneAlbedo,
    bumpMap: textures.sandstoneBump,
    bumpScale: 0.3,
    color: 0xf4c29f,
    roughness: 0.64,
    metalness: 0.04,
  });

  const groundMat = new THREE.MeshStandardMaterial({
    map: textures.groundAlbedo,
    bumpMap: textures.groundBump,
    bumpScale: 0.26,
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
  });

  disposables.push(sandstoneMat, darkSandstoneMat, capMat, groundMat);

  // 1. Continuous mathematical Desert Slickrock & Canyon Terrain (220m x 220m)
  const terrainGeo = new THREE.PlaneGeometry(220, 220, 120, 120);
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    tPos.setY(i, groundHeightAt(x, z));
  }
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, groundMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);
  disposables.push(terrainGeo);

  // 2. Hero Delicate Arch centered at (0, groundHeightAt(0,0), 0)
  const delicateArch = createDelicateArch(sandstoneMat, darkSandstoneMat, capMat, textures.contactShadow);
  delicateArch.position.set(0, groundHeightAt(0, 0), 0);
  delicateArch.rotation.y = 0.22;
  root.add(delicateArch);

  // 3. Landscape Arch at (-24, y, -22)
  const landscapeArch = createLandscapeArch(sandstoneMat, darkSandstoneMat, capMat);
  landscapeArch.position.set(-24, groundHeightAt(-24, -22) - 0.3, -22);
  landscapeArch.rotation.y = 0.52;
  root.add(landscapeArch);

  // 4. Double Arch at (26, y, -18)
  const doubleArch = createDoubleArch(sandstoneMat, darkSandstoneMat, capMat);
  doubleArch.position.set(26, groundHeightAt(26, -18) - 0.3, -18);
  doubleArch.rotation.y = -0.45;
  root.add(doubleArch);

  // 5. Balanced Rock at (-21, y, 14)
  const balancedRock = createBalancedRock(sandstoneMat, darkSandstoneMat, capMat);
  balancedRock.position.set(-21, groundHeightAt(-21, 14) - 0.2, 14);
  root.add(balancedRock);

  // 6. Sculpted Canyon Rim Buttes & Mesas (InstancedMesh = 28 natural stepped buttes)
  const mesaCount = 28;
  const mesaGeo = buildSteppedButteGeometry();
  const mesaMat = new THREE.MeshStandardMaterial({
    map: textures.sandstoneAlbedo,
    bumpMap: textures.sandstoneBump,
    bumpScale: 0.32,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
  });
  const mesaInstanced = new THREE.InstancedMesh(mesaGeo, mesaMat, mesaCount);
  mesaInstanced.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < mesaCount; i++) {
    const angle = (i / mesaCount) * Math.PI * 2 + (pseudoRand(i * 3) - 0.5) * 0.14;
    const radius = 64 + pseudoRand(i * 7 + 1) * 28;
    const mx = Math.cos(angle) * radius;
    const mz = Math.sin(angle) * radius;
    const my = groundHeightAt(mx, mz);

    const sx = 1.0 + pseudoRand(i * 11) * 1.4;
    const sy = 0.75 + pseudoRand(i * 13) * 1.25;
    const sz = 0.8 + pseudoRand(i * 17) * 1.2;

    dummy.position.set(mx, my + 4.8 * sy - 1.5, mz);
    dummy.rotation.set(0, pseudoRand(i * 19) * Math.PI * 2, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesaInstanced.setMatrixAt(i, dummy.matrix);

    const shade = 0.78 + pseudoRand(i * 23) * 0.34;
    tint.setRGB(shade, shade * 0.85, shade * 0.76);
    mesaInstanced.setColorAt(i, tint);
  }
  mesaInstanced.instanceMatrix.needsUpdate = true;
  if (mesaInstanced.instanceColor) mesaInstanced.instanceColor.needsUpdate = true;
  mesaInstanced.computeBoundingSphere();
  root.add(mesaInstanced);
  disposables.push(mesaGeo, mesaMat);

  // 7. Slickrock Boulders (InstancedMesh = 56 boulders, keeping sightlines clear)
  const boulderCount = 56;
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const rockInstanced = new THREE.InstancedMesh(rockGeo, darkSandstoneMat, boulderCount);
  rockInstanced.castShadow = true;
  rockInstanced.receiveShadow = true;

  let placedRocks = 0;
  for (let i = 0; i < boulderCount * 2 && placedRocks < boulderCount; i++) {
    const angle = pseudoRand(i * 31 + 2) * Math.PI * 2;
    const dist = 12 + pseudoRand(i * 37 + 5) * 42;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    // Keep wildlife meadow and stargazing corridor clear
    if (Math.hypot(rx - 15.5, rz - 15) < 6.5) continue;
    if (Math.abs(rx) < 8 && rz > 10 && rz < 28) continue;

    const ry = groundHeightAt(rx, rz);
    const sc = 0.55 + pseudoRand(i * 41) * 1.05;
    dummy.position.set(rx, ry + sc * 0.25, rz);
    dummy.rotation.set(pseudoRand(i * 43), pseudoRand(i * 47), pseudoRand(i * 53));
    dummy.scale.set(sc * 1.3, sc * 0.6, sc);
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(placedRocks, dummy.matrix);

    const tVal = 0.82 + pseudoRand(i * 59) * 0.28;
    tint.setRGB(tVal, tVal * 0.9, tVal * 0.85);
    rockInstanced.setColorAt(placedRocks, tint);
    placedRocks++;
  }
  rockInstanced.count = placedRocks;
  rockInstanced.instanceMatrix.needsUpdate = true;
  if (rockInstanced.instanceColor) rockInstanced.instanceColor.needsUpdate = true;
  rockInstanced.computeBoundingSphere();
  root.add(rockInstanced);
  disposables.push(rockGeo);

  // 8. Desert Sagebrush & Scrub Tufts (InstancedMesh = 72 tufts)
  const scrubCount = 72;
  const scrubGeo = new THREE.DodecahedronGeometry(0.4, 0);
  const scrubMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
  });
  const scrubInstanced = new THREE.InstancedMesh(scrubGeo, scrubMat, scrubCount);
  scrubInstanced.castShadow = true;

  for (let i = 0; i < scrubCount; i++) {
    const angle = pseudoRand(i * 61 + 3) * Math.PI * 2;
    const dist = 10 + pseudoRand(i * 67 + 9) * 38;
    const sx = Math.cos(angle) * dist;
    const sz = Math.sin(angle) * dist;
    const sy = groundHeightAt(sx, sz);

    const sScale = 0.72 + pseudoRand(i * 71) * 0.62;
    dummy.position.set(sx, sy + 0.2 * sScale, sz);
    dummy.rotation.set(0, pseudoRand(i * 73) * Math.PI * 2, 0);
    dummy.scale.set(sScale * 1.3, sScale * 0.8, sScale * 1.2);
    dummy.updateMatrix();
    scrubInstanced.setMatrixAt(i, dummy.matrix);

    const gShift = pseudoRand(i * 79);
    tint.setRGB(0.36 + gShift * 0.14, 0.45 + gShift * 0.14, 0.31 + gShift * 0.1);
    scrubInstanced.setColorAt(i, tint);
  }
  scrubInstanced.instanceMatrix.needsUpdate = true;
  if (scrubInstanced.instanceColor) scrubInstanced.instanceColor.needsUpdate = true;
  scrubInstanced.computeBoundingSphere();
  root.add(scrubInstanced);
  disposables.push(scrubGeo, scrubMat);

  // 9. Wildlife & Desert Flora Oasis (around x=16.0, z=15.0) — clear sightlines for Chapter 4 & 5
  const juniperSpots: [number, number, number][] = [
    [13.4, 12.2, 0.95],
    [19.5, 12.0, 0.88],
    [19.0, 17.8, 0.86],
    [-16.5, 18.0, 0.84],
    [-16.0, -7.5, 0.78],
  ];
  for (let i = 0; i < juniperSpots.length; i++) {
    const [jx, jz, jScale] = juniperSpots[i];
    const tree = createUtahJuniper(textures.barkAlbedo, textures.contactShadow, i + 1);
    tree.position.set(jx, groundHeightAt(jx, jz), jz);
    tree.scale.setScalar(jScale);
    tree.rotation.y = i * 1.3;
    root.add(tree);
  }

  const cactusSpots: [number, number][] = [
    [14.2, 16.6],
    [17.4, 14.1],
    [13.0, 15.6],
    [18.2, 16.4],
  ];
  for (let i = 0; i < cactusSpots.length; i++) {
    const [cx, cz] = cactusSpots[i];
    const cactus = createPricklyPear(textures.contactShadow);
    cactus.position.set(cx, groundHeightAt(cx, cz), cz);
    cactus.rotation.y = i * 1.1;
    root.add(cactus);
  }

  // Animated Desert Mule Deer (Buck + Doe)
  const buck = createMuleDeer(true, textures.contactShadow);
  buck.group.position.set(15.2, groundHeightAt(15.2, 14.8), 14.8);
  buck.group.rotation.y = -0.55;
  root.add(buck.group);

  const doe = createMuleDeer(false, textures.contactShadow);
  doe.group.position.set(17.1, groundHeightAt(17.1, 15.8), 15.8);
  doe.group.rotation.y = 2.35;
  root.add(doe.group);

  // Animated Golden Eagle circling over canyon
  const eagle = createGoldenEagle();
  eagle.group.position.set(8, 22, 6);
  root.add(eagle.group);

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) disposables.push(obj.geometry);
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => disposables.push(m));
      } else if (obj.material) {
        disposables.push(obj.material);
      }
    }
  });

  return {
    root,
    wildlife: {
      deerGroup1: buck.group,
      deer1Head: buck.headPivot,
      deerGroup2: doe.group,
      deer2Head: doe.headPivot,
      eagleGroup: eagle.group,
      eagleLeftWing: eagle.leftWing,
      eagleRightWing: eagle.rightWing,
    },
    dispose: () => {
      const seen = new Set<{ dispose: () => void }>();
      for (const item of disposables) {
        if (!seen.has(item)) {
          seen.add(item);
          item.dispose();
        }
      }
    },
  };
}

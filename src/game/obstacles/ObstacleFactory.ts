import * as THREE from 'three';
import type { ObstacleKind } from '../engine/types';
import { boxAt, sharedGeometry, sharedMaterial } from '../world/materials';
import { crateTexture, glowTexture, signTexture, stripeTexture, trainFrontTexture, trainSideTexture } from '../world/textures';
import { BUS_DIMS, OBSTACLE_DIMS, RAMP_LENGTH, TRAIN_CAR_LENGTH, TRAIN_HEIGHT } from './obstacleDefs';

export interface ObstacleVisual {
  root: THREE.Object3D;
  kind: ObstacleKind | 'trainCar';
  variant: number;
  frame?: THREE.Object3D;
  headlights?: THREE.Object3D;
  body?: THREE.Mesh;
  blink?: THREE.Mesh;
}

const lambert = (key: string, params: THREE.MeshLambertMaterialParameters): THREE.MeshLambertMaterial =>
  sharedMaterial(`l-${key}`, () => new THREE.MeshLambertMaterial(params));
const standard = (key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial =>
  sharedMaterial(`s-${key}`, () => new THREE.MeshStandardMaterial(params));

const shadowed = <T extends THREE.Mesh>(m: T, cast = true): T => {
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
};

const CAR_COLORS = [0xe23b3b, 0x2f7de1, 0xf2c14e, 0x3fbf7f, 0xf4f4f4, 0x2b2b2b, 0xff8a3d];

const flipped = (tex: THREE.Texture): THREE.Texture => {
  const t = tex.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = -1;
  t.needsUpdate = true;
  return t;
};

const buildTrainCar = (variant: number): ObstacleVisual => {
  const L = TRAIN_CAR_LENGTH - 0.4;
  const W = 2.3;
  const side = sharedMaterial(`train-side-${variant}`, () => new THREE.MeshStandardMaterial({ map: trainSideTexture(variant), roughness: 0.45, metalness: 0.35 }));
  const sideFlip = sharedMaterial(`train-sidef-${variant}`, () => new THREE.MeshStandardMaterial({ map: flipped(trainSideTexture(variant)), roughness: 0.45, metalness: 0.35 }));
  const front = sharedMaterial(`train-front-${variant}`, () => new THREE.MeshStandardMaterial({ map: trainFrontTexture(variant), roughness: 0.4, metalness: 0.3 }));
  const roof = standard('train-roof', { color: 0x7d838c, roughness: 0.6, metalness: 0.4 });
  const dark = lambert('train-under', { color: 0x1e2024 });
  const mats = [side, sideFlip, roof, dark, front, front];

  const detailed = new THREE.Group();
  const bodyGeo = sharedGeometry('train-body', () => boxAt(W, TRAIN_HEIGHT - 0.45, L, 0.45, 0.2));
  detailed.add(shadowed(new THREE.Mesh(bodyGeo, mats)));
  const under = sharedGeometry('train-underbox', () => boxAt(W * 0.8, 0.45, L - 1, 0, 0.7));
  detailed.add(new THREE.Mesh(under, dark));
  const wheelGeo = sharedGeometry('train-wheel', () => {
    const g = new THREE.CylinderGeometry(0.36, 0.36, 0.18, 12);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const wheelMat = standard('wheel', { color: 0x30333a, metalness: 0.8, roughness: 0.4 });
  for (const z of [1.6, 2.6, L - 2.4, L - 1.4]) {
    for (const x of [-0.72, 0.72]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, 0.36, -z);
      detailed.add(w);
    }
  }
  const acGeo = sharedGeometry('train-ac', () => boxAt(1.2, 0.18, 2.2, TRAIN_HEIGHT - 0.02, 0));
  const ac1 = new THREE.Mesh(acGeo, roof);
  ac1.position.z = -2.5;
  const ac2 = new THREE.Mesh(acGeo, roof);
  ac2.position.z = -L + 4.6;
  detailed.add(ac1, ac2);

  const simple = new THREE.Mesh(sharedGeometry('train-simple', () => boxAt(W, TRAIN_HEIGHT, L, 0, 0.2)), mats);

  const lod = new THREE.LOD();
  lod.addLevel(detailed, 0);
  lod.addLevel(simple, 95);

  const root = new THREE.Group();
  root.add(lod);

  // Headlights (lit on moving trains).
  const lights = new THREE.Group();
  const glowMat = sharedMaterial('headlight-glow', () => new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  for (const x of [-0.75, 0.75]) {
    const s = new THREE.Sprite(glowMat);
    s.scale.set(2.2, 2.2, 1);
    s.position.set(x, 0.75, 0.3);
    lights.add(s);
  }
  const beamMat = sharedMaterial('headlight-beam', () => new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const beamGeo = sharedGeometry('headlight-beam', () => {
    const g = new THREE.ConeGeometry(1.6, 14, 16, 1, true);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.6, 7.2);
    return g;
  });
  lights.add(new THREE.Mesh(beamGeo, beamMat));
  lights.visible = false;
  root.add(lights);
  return { root, kind: 'trainCar', variant, headlights: lights };
};

const buildRamp = (): ObstacleVisual => {
  const W = 2.3;
  const L = RAMP_LENGTH;
  const H = TRAIN_HEIGHT;
  const geo = sharedGeometry('ramp', () => {
    const p = (x: number, y: number, z: number): number[] => [x, y, z];
    const nbl = p(-W / 2, 0, 0);
    const nbr = p(W / 2, 0, 0);
    const fbl = p(-W / 2, 0, -L);
    const fbr = p(W / 2, 0, -L);
    const ftl = p(-W / 2, H, -L);
    const ftr = p(W / 2, H, -L);
    const pos: number[] = [];
    const uv: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[], u: number, v: number): void => {
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      uv.push(0, 0, u, 0, u, v, 0, 0, u, v, 0, v);
    };
    const tri = (a: number[], b: number[], c: number[]): void => {
      pos.push(...a, ...b, ...c);
      uv.push(0, 0, 1, 0, 1, 1);
    };
    quad(nbl, nbr, ftr, ftl, 1, 4); // slope
    tri(nbr, fbr, ftr); // right side
    tri(fbl, nbl, ftl); // left side
    quad(fbr, fbl, ftl, ftr, 1, 1); // back
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  });
  const mat = sharedMaterial('ramp-mat', () => {
    const t = stripeTexture('#f2c014', '#2a2a2a').clone();
    t.needsUpdate = true;
    t.repeat.set(2, 2);
    return new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide });
  });
  const root = new THREE.Group();
  root.add(shadowed(new THREE.Mesh(geo, mat)));
  // Side rails for readability.
  const railGeo = sharedGeometry('ramp-rail', () => {
    const g = new THREE.BoxGeometry(0.08, 0.08, Math.hypot(L, H));
    g.rotateX(Math.atan2(H, L));
    g.translate(0, H / 2 + 0.05, -L / 2);
    return g;
  });
  const railMat = standard('ramp-rail', { color: 0xd0d4da, metalness: 0.8, roughness: 0.3 });
  for (const x of [-W / 2, W / 2]) {
    const r = new THREE.Mesh(railGeo, railMat);
    r.position.x = x;
    root.add(r);
  }
  return { root, kind: 'ramp', variant: 0 };
};

const buildVehicle = (variant: number): ObstacleVisual => {
  const root = new THREE.Group();
  const wheelGeo = sharedGeometry('car-wheel', () => {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const wheelMat = lambert('tyre', { color: 0x161616 });
  const glass = standard('car-glass', { color: 0x1d2b3a, roughness: 0.1, metalness: 0.6 });
  let body: THREE.Mesh;
  if (variant === 1) {
    const L = BUS_DIMS.length;
    const busTex = sharedMaterial('bus-side', () => new THREE.MeshStandardMaterial({ map: trainSideTexture(0), roughness: 0.5, metalness: 0.2, color: 0xffe08a }));
    const busFront = sharedMaterial('bus-front', () => new THREE.MeshStandardMaterial({ map: signTexture('CITY\nBUS 7', '#ffb300', '#1a1a1a'), roughness: 0.5 }));
    const roof = lambert('bus-roof', { color: 0xe0e0e0 });
    body = shadowed(new THREE.Mesh(sharedGeometry('bus-body', () => boxAt(2.2, BUS_DIMS.topY - 0.35, L - 0.2, 0.35, 0.1)), [busTex, busTex, roof, roof, busFront, busFront]));
    root.add(body);
    for (const z of [1.3, L - 1.5]) for (const x of [-0.95, 0.95]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, 0.34, -z);
      root.add(w);
    }
  } else {
    const L = OBSTACLE_DIMS.vehicle.length;
    const paint = standard('car-paint-0', { color: CAR_COLORS[0], roughness: 0.35, metalness: 0.5 });
    body = shadowed(new THREE.Mesh(sharedGeometry('car-body', () => boxAt(1.95, 0.7, L - 0.1, 0.3, 0.05)), paint));
    root.add(body);
    const cabin = shadowed(new THREE.Mesh(sharedGeometry('car-cabin', () => boxAt(1.7, 0.55, 2.3, 1.0, 1.2)), glass));
    root.add(cabin);
    const lightMat = sharedMaterial('car-lights', () => new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    const lights = new THREE.Mesh(sharedGeometry('car-lights', () => {
      const g = new THREE.BoxGeometry(1.6, 0.14, 0.05);
      g.translate(0, 0.75, 0.0);
      return g;
    }), lightMat);
    root.add(lights);
    for (const z of [0.85, L - 0.95]) for (const x of [-0.88, 0.88]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, 0.34, -z);
      root.add(w);
    }
  }
  return { root, kind: 'vehicle', variant, body };
};

const buildRoadblock = (variant: number): ObstacleVisual => {
  const root = new THREE.Group();
  const d = OBSTACLE_DIMS.roadblock;
  if (variant === 1) {
    const mat = sharedMaterial('jersey', () => {
      const t = stripeTexture('#f2c014', '#d8d8d8').clone();
      t.needsUpdate = true;
      t.repeat.set(2, 0.5);
      return new THREE.MeshLambertMaterial({ map: t });
    });
    const geo = sharedGeometry('jersey', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-1.05, 0);
      shape.lineTo(1.05, 0);
      shape.lineTo(0.95, 0.25);
      shape.lineTo(0.35, 1.0);
      shape.lineTo(-0.35, 1.0);
      shape.lineTo(-0.95, 0.25);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
      g.translate(0, 0, -0.6);
      return g;
    });
    root.add(shadowed(new THREE.Mesh(geo, mat)));
  } else {
    const board = sharedMaterial('barrier-board', () => {
      const t = stripeTexture('#e8262f', '#ffffff').clone();
      t.needsUpdate = true;
      t.repeat.set(3, 0.6);
      return new THREE.MeshLambertMaterial({ map: t });
    });
    root.add(shadowed(new THREE.Mesh(sharedGeometry('barrier-board', () => boxAt(2.1, 0.42, 0.12, 0.58, 0.1)), board)));
    root.add(shadowed(new THREE.Mesh(sharedGeometry('barrier-board2', () => boxAt(2.1, 0.2, 0.12, 0.2, 0.1)), board)));
    const leg = lambert('barrier-leg', { color: 0xdddddd });
    for (const x of [-0.95, 0.95]) {
      const l = new THREE.Mesh(sharedGeometry('barrier-leg', () => boxAt(0.1, 1.0, d.length, 0, 0)), leg);
      l.position.x = x;
      root.add(l);
    }
    const blinkMat = sharedMaterial('blink', () => new THREE.MeshBasicMaterial({ color: 0xffa500 }));
    const blink = new THREE.Mesh(sharedGeometry('blink', () => new THREE.SphereGeometry(0.09, 8, 6)), blinkMat);
    blink.position.set(0.95, 1.06, -0.15);
    root.add(blink);
    return { root, kind: 'roadblock', variant, blink };
  }
  return { root, kind: 'roadblock', variant };
};

const buildCrate = (kind: 'crateLow' | 'crateStack', variant: number): ObstacleVisual => {
  const root = new THREE.Group();
  const mat = sharedMaterial(`crate-${variant}`, () => new THREE.MeshLambertMaterial({ map: crateTexture(variant) }));
  if (kind === 'crateLow') {
    root.add(shadowed(new THREE.Mesh(sharedGeometry('crate-low', () => boxAt(1.85, 1.0, 1.3)), mat)));
  } else {
    root.add(shadowed(new THREE.Mesh(sharedGeometry('crate-b', () => boxAt(1.95, 1.25, 1.6)), mat)));
    const top = shadowed(new THREE.Mesh(sharedGeometry('crate-t', () => boxAt(1.7, 1.25, 1.4, 1.25, 0.1)), sharedMaterial(`crate-${(variant + 1) % 3}`, () => new THREE.MeshLambertMaterial({ map: crateTexture((variant + 1) % 3) }))));
    top.rotation.y = 0.08;
    root.add(top);
  }
  return { root, kind, variant };
};

const OVERHEAD_TEXT: [string, string, string][] = [
  ['SLIDE!', '#101820', '#00e5ff'],
  ['LOW\nBRIDGE', '#f2c014', '#1a1a1a'],
  ['CITY\nDASH', '#ff2fb4', '#ffffff'],
];

const buildOverhead = (variant: number): ObstacleVisual => {
  const d = OBSTACLE_DIMS.overhead;
  const root = new THREE.Group();
  const [text, bg, fg] = OVERHEAD_TEXT[variant % OVERHEAD_TEXT.length];
  const face = sharedMaterial(`overhead-${variant}`, () => new THREE.MeshBasicMaterial({ map: signTexture(text, bg, fg) }));
  const edge = lambert('overhead-edge', { color: 0x2b2f36 });
  const h = d.topY - d.bottomY;
  root.add(shadowed(new THREE.Mesh(sharedGeometry('overhead-board', () => boxAt(2.3, h, d.length, d.bottomY, 0)), [edge, edge, edge, edge, face, face])));
  const rodGeo = sharedGeometry('overhead-rod', () => boxAt(0.06, 4.35 - d.topY, 0.06, d.topY, 0.15));
  for (const x of [-0.9, 0.9]) {
    const r = new THREE.Mesh(rodGeo, edge);
    r.position.x = x;
    root.add(r);
  }
  // Gantry frame (posts outside the track + beam). Shown once per row.
  const frame = new THREE.Group();
  const steel = standard('gantry', { color: 0x59616b, metalness: 0.6, roughness: 0.5 });
  const post = sharedGeometry('gantry-post', () => boxAt(0.3, 4.6, 0.3, 0, 0));
  const beam = sharedGeometry('gantry-beam', () => boxAt(9.2, 0.35, 0.35, 4.3, 0));
  const lp = new THREE.Mesh(post, steel);
  const rp = new THREE.Mesh(post, steel);
  lp.position.x = -4.35;
  rp.position.x = 4.35;
  frame.add(lp, rp, shadowed(new THREE.Mesh(beam, steel)));
  frame.userData.posts = [lp, rp];
  root.add(frame);
  return { root, kind: 'overhead', variant, frame };
};

/** Creates the visual for an obstacle kind/variant. Geometries and materials are shared. */
export const createObstacleVisual = (kind: ObstacleKind | 'trainCar', variant: number): ObstacleVisual => {
  switch (kind) {
    case 'trainCar':
      return buildTrainCar(variant);
    case 'ramp':
      return buildRamp();
    case 'vehicle':
      return buildVehicle(variant);
    case 'roadblock':
      return buildRoadblock(variant);
    case 'crateLow':
    case 'crateStack':
      return buildCrate(kind, variant);
    case 'overhead':
      return buildOverhead(variant);
    default:
      throw new Error(`Obstacle kind ${kind} is composite`);
  }
};

export const carPaint = (index: number): THREE.Material =>
  standard(`car-paint-${index % CAR_COLORS.length}`, { color: CAR_COLORS[index % CAR_COLORS.length], roughness: 0.35, metalness: 0.5 });
export const CAR_COLOR_COUNT = CAR_COLORS.length;

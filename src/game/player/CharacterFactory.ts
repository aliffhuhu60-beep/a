import * as THREE from 'three';
import type { CharacterLook } from '../engine/types';

/**
 * Builds an original low-poly runner as a bone hierarchy of named Object3Ds.
 * The rig uses Mixamo-style bone names, so the same animation clips could
 * drive an imported GLB character (see `CharacterAnimator`), but no external
 * asset is required.
 *
 * The character faces -Z (the running direction). Its right side is +X.
 */
export const BONES = [
  'Hips',
  'Spine',
  'Chest',
  'Neck',
  'Head',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
] as const;
export type BoneName = (typeof BONES)[number];

export interface CharacterRig {
  root: THREE.Group;
  /** Visual-only node used for procedural lean / squash on top of clips. */
  body: THREE.Group;
  bones: Record<BoneName, THREE.Object3D>;
  materials: THREE.Material[];
  /** Attachment point for the jetpack (on the back). */
  back: THREE.Object3D;
  rightHand: THREE.Object3D;
  dispose: () => void;
}

const std = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });

export const createCharacter = (look: CharacterLook): CharacterRig => {
  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };
  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };

  const c = look.colors;
  const skin = m(std(c.skin, { roughness: 0.8 }));
  const hair = m(std(c.hair, { roughness: 0.9 }));
  const top = m(std(c.top));
  const accent = m(std(c.topAccent, c.glow ? { emissive: new THREE.Color(c.glow), emissiveIntensity: 0.9 } : {}));
  const pants = m(std(c.pants, { roughness: 0.85 }));
  const shoes = m(std(c.shoes, { roughness: 0.5 }));
  const acc = m(std(c.accessory, c.glow ? { emissive: new THREE.Color(c.glow), emissiveIntensity: 1.2, metalness: 0.4 } : { metalness: 0.3 }));
  const eye = m(new THREE.MeshBasicMaterial({ color: 0x111111 }));
  const sole = m(std(0xf4f4f4));

  const H = look.build.height;
  const B = look.build.bulk;

  const root = new THREE.Group();
  root.name = 'CharacterRoot';
  const body = new THREE.Group();
  body.name = 'Body';
  root.add(body);

  const bone = (name: BoneName, parent: THREE.Object3D, x: number, y: number, z = 0): THREE.Object3D => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Mesh => {
    const mm = new THREE.Mesh(geo, mat);
    mm.position.set(x, y, z);
    mm.castShadow = true;
    parent.add(mm);
    return mm;
  };

  const hips = bone('Hips', body, 0, 0.95 * H);
  const spine = bone('Spine', hips, 0, 0.1 * H);
  const chest = bone('Chest', spine, 0, 0.2 * H);
  const neck = bone('Neck', chest, 0, 0.22 * H);
  const head = bone('Head', neck, 0, 0.07 * H);

  // Torso
  mesh(g(new THREE.CapsuleGeometry(0.2 * B, 0.12 * H, 4, 10)), pants, hips, 0, 0.02, 0).scale.set(1.15, 1, 0.8);
  mesh(g(new THREE.CapsuleGeometry(0.17 * B, 0.08 * H, 4, 10)), top, spine, 0, 0.06 * H, 0).scale.set(1.25, 1, 0.85);
  const torso = mesh(g(new THREE.CapsuleGeometry(0.22 * B, 0.1 * H, 4, 12)), top, chest, 0, 0.08 * H, 0);
  torso.scale.set(1.25, 1, 0.82);
  // Chest stripe / logo panel
  mesh(g(new THREE.BoxGeometry(0.34 * B, 0.07, 0.02)), accent, chest, 0, 0.12 * H, -0.19 * B);
  mesh(g(new THREE.BoxGeometry(0.06, 0.2 * H, 0.02)), accent, chest, 0.12 * B, 0.06 * H, -0.185 * B);

  // Head
  mesh(g(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8)), skin, neck, 0, 0.02, 0);
  const skull = mesh(g(new THREE.SphereGeometry(0.17, 16, 12)), skin, head, 0, 0.14, 0);
  skull.scale.set(1, 1.08, 1);
  mesh(g(new THREE.SphereGeometry(0.022, 8, 6)), eye, head, -0.06, 0.16, -0.155);
  mesh(g(new THREE.SphereGeometry(0.022, 8, 6)), eye, head, 0.06, 0.16, -0.155);
  // Ears
  mesh(g(new THREE.SphereGeometry(0.035, 6, 6)), skin, head, -0.17, 0.14, 0);
  mesh(g(new THREE.SphereGeometry(0.035, 6, 6)), skin, head, 0.17, 0.14, 0);

  // Hair styles
  switch (look.hair) {
    case 'cap': {
      const cap = mesh(g(new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), hair, head, 0, 0.17, 0);
      cap.scale.set(1.04, 0.9, 1.06);
      // Brim pointing backwards (street style)
      const brim = mesh(g(new THREE.BoxGeometry(0.22, 0.025, 0.16)), accent, head, 0, 0.19, 0.2);
      brim.rotation.x = -0.15;
      break;
    }
    case 'ponytail': {
      const top = mesh(g(new THREE.SphereGeometry(0.182, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.8)), hair, head, 0, 0.15, 0.01);
      top.scale.set(1.03, 1.05, 1.06);
      const tail = mesh(g(new THREE.CapsuleGeometry(0.06, 0.22, 4, 8)), hair, head, 0, 0.1, 0.22);
      tail.rotation.x = 0.7;
      mesh(g(new THREE.TorusGeometry(0.05, 0.015, 6, 12)), accent, head, 0, 0.2, 0.17).rotation.x = 1.2;
      break;
    }
    case 'spiky': {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const spike = mesh(g(new THREE.ConeGeometry(0.06, 0.18, 6)), hair, head, Math.cos(a) * 0.1, 0.27, Math.sin(a) * 0.1 + 0.02);
        spike.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      }
      mesh(g(new THREE.SphereGeometry(0.175, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2)), hair, head, 0, 0.16, 0.01);
      break;
    }
    case 'helmet': {
      const helm = mesh(g(new THREE.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.6)), hair, head, 0, 0.12, 0);
      helm.scale.set(1, 1.05, 1.05);
      mesh(g(new THREE.TorusGeometry(0.19, 0.018, 6, 24)), accent, head, 0, 0.12, 0).rotation.x = Math.PI / 2;
      break;
    }
  }

  // Accessories
  let back: THREE.Object3D = chest;
  switch (look.accessory) {
    case 'backpack': {
      const bp = mesh(g(new THREE.BoxGeometry(0.32 * B, 0.36, 0.16)), acc, chest, 0, 0.07 * H, 0.2 * B);
      back = bp;
      mesh(g(new THREE.BoxGeometry(0.24 * B, 0.12, 0.05)), accent, bp, 0, -0.08, 0.09);
      break;
    }
    case 'headphones': {
      const band = mesh(g(new THREE.TorusGeometry(0.19, 0.022, 6, 20, Math.PI)), acc, head, 0, 0.14, 0);
      band.rotation.y = Math.PI / 2;
      mesh(g(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12)), acc, head, -0.18, 0.13, 0).rotation.z = Math.PI / 2;
      mesh(g(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12)), acc, head, 0.18, 0.13, 0).rotation.z = Math.PI / 2;
      break;
    }
    case 'visor': {
      const vz = mesh(g(new THREE.SphereGeometry(0.175, 16, 6, Math.PI * 1.15, Math.PI * 0.7, Math.PI * 0.38, Math.PI * 0.2)), acc, head, 0, 0.14, 0);
      vz.scale.set(1.06, 1, 1.08);
      break;
    }
    case 'antenna': {
      mesh(g(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6)), acc, head, 0.08, 0.38, 0);
      mesh(g(new THREE.SphereGeometry(0.04, 8, 8)), accent, head, 0.08, 0.5, 0);
      mesh(g(new THREE.BoxGeometry(0.22, 0.05, 0.02)), accent, head, 0, 0.17, -0.165);
      break;
    }
  }

  // Arms (hang down along -Y from the shoulder joint)
  const arm = (side: 1 | -1): [THREE.Object3D, THREE.Object3D, THREE.Object3D] => {
    const pre = side > 0 ? 'Right' : 'Left';
    const upper = bone(`${pre}Arm` as BoneName, chest, side * 0.27 * B, 0.17 * H, 0);
    mesh(g(new THREE.CapsuleGeometry(0.065 * B, 0.17 * H, 4, 8)), top, upper, 0, -0.12 * H, 0);
    const fore = bone(`${pre}ForeArm` as BoneName, upper, 0, -0.26 * H, 0);
    mesh(g(new THREE.CapsuleGeometry(0.055 * B, 0.15 * H, 4, 8)), skin, fore, 0, -0.1 * H, 0);
    mesh(g(new THREE.CylinderGeometry(0.066 * B, 0.066 * B, 0.05, 8)), accent, fore, 0, -0.02, 0);
    const hand = bone(`${pre}Hand` as BoneName, fore, 0, -0.22 * H, 0);
    mesh(g(new THREE.SphereGeometry(0.065, 8, 6)), skin, hand, 0, -0.03, 0);
    return [upper, fore, hand];
  };
  const [lArm, lFore, lHand] = arm(-1);
  const [rArm, rFore, rHand] = arm(1);

  // Legs
  const leg = (side: 1 | -1): [THREE.Object3D, THREE.Object3D, THREE.Object3D] => {
    const pre = side > 0 ? 'Right' : 'Left';
    const thigh = bone(`${pre}UpLeg` as BoneName, hips, side * 0.11 * B, -0.04 * H, 0);
    mesh(g(new THREE.CapsuleGeometry(0.085 * B, 0.2 * H, 4, 8)), pants, thigh, 0, -0.13 * H, 0);
    const shin = bone(`${pre}Leg` as BoneName, thigh, 0, -0.26 * H, 0);
    mesh(g(new THREE.CapsuleGeometry(0.07 * B, 0.2 * H, 4, 8)), pants, shin, 0, -0.12 * H, 0);
    const foot = bone(`${pre}Foot` as BoneName, shin, 0, -0.25 * H, 0);
    mesh(g(new THREE.BoxGeometry(0.13 * B, 0.09, 0.27)), shoes, foot, 0, -0.04, -0.06);
    mesh(g(new THREE.BoxGeometry(0.135 * B, 0.03, 0.28)), sole, foot, 0, -0.085, -0.06);
    return [thigh, shin, foot];
  };
  const [lUp, lLeg, lFoot] = leg(-1);
  const [rUp, rLeg, rFoot] = leg(1);

  const bones: Record<BoneName, THREE.Object3D> = {
    Hips: hips,
    Spine: spine,
    Chest: chest,
    Neck: neck,
    Head: head,
    LeftArm: lArm,
    LeftForeArm: lFore,
    LeftHand: lHand,
    RightArm: rArm,
    RightForeArm: rFore,
    RightHand: rHand,
    LeftUpLeg: lUp,
    LeftLeg: lLeg,
    LeftFoot: lFoot,
    RightUpLeg: rUp,
    RightLeg: rLeg,
    RightFoot: rFoot,
  };

  return {
    root,
    body,
    bones,
    materials: mats,
    back,
    rightHand: rHand,
    dispose: () => {
      mats.forEach((x) => x.dispose());
      geos.forEach((x) => x.dispose());
      root.removeFromParent();
    },
  };
};

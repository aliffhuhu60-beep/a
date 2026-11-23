import * as THREE from 'three';
import { BONES, type BoneName, type CharacterRig } from './CharacterFactory';

export type ClipName = 'idle' | 'run' | 'jump' | 'slide' | 'death' | 'victory';
export type OverlayName = 'collect' | 'dodgeLeft' | 'dodgeRight' | 'stumble';

type Euler3 = [number, number, number];
type Pose = Partial<Record<BoneName, Euler3>> & { hipsY?: number; hipsZ?: number };

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const e = new THREE.Euler();
const q = new THREE.Quaternion();

/**
 * Samples a pose function into an AnimationClip of quaternion tracks.
 * `full` clips key every bone (so cross-fading never leaves stale rotations);
 * additive overlays key only the bones they touch.
 */
const buildClip = (name: string, duration: number, samples: number, pose: (t: number) => Pose, hipsBaseY: number, full: boolean): THREE.AnimationClip => {
  const times: number[] = [];
  for (let i = 0; i <= samples; i++) times.push((i / samples) * duration);
  const poses = times.map((t) => pose(t / duration));
  const tracks: THREE.KeyframeTrack[] = [];
  for (const b of BONES) {
    if (!full && !poses.some((p) => p[b])) continue;
    const values: number[] = [];
    for (const p of poses) {
      const r = p[b] ?? [0, 0, 0];
      e.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, 'XYZ');
      q.setFromEuler(e);
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, values));
  }
  if (full || poses.some((p) => p.hipsY !== undefined)) {
    const pos: number[] = [];
    for (const p of poses) pos.push(0, p.hipsY ?? hipsBaseY, p.hipsZ ?? 0);
    tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, pos));
  }
  return new THREE.AnimationClip(name, duration, tracks);
};

const sin = (p: number, phase = 0): number => Math.sin(p * TAU + phase);
const cos = (p: number, phase = 0): number => Math.cos(p * TAU + phase);

export const RUN_CYCLE = 0.62;
export const JUMP_CLIP = 0.73;
export const SLIDE_CLIP = 0.72;

const createClips = (hipsY: number): { clips: Record<ClipName, THREE.AnimationClip>; overlays: Record<OverlayName, THREE.AnimationClip> } => {
  const run = buildClip(
    'run',
    RUN_CYCLE,
    16,
    (p) => {
      const legR = 12 + 44 * sin(p);
      const legL = 12 + 44 * sin(p, Math.PI);
      const kneeR = -(12 + 78 * Math.max(0, cos(p)));
      const kneeL = -(12 + 78 * Math.max(0, cos(p, Math.PI)));
      return {
        hipsY: hipsY - 0.03 + 0.05 * Math.abs(cos(p)),
        Hips: [0, 6 * sin(p), 0],
        Spine: [-6, 0, 0],
        Chest: [-8, -9 * sin(p), 0],
        Neck: [4, 0, 0],
        Head: [6, 7 * sin(p), 0],
        RightUpLeg: [legR, 0, 0],
        LeftUpLeg: [legL, 0, 0],
        RightLeg: [kneeR, 0, 0],
        LeftLeg: [kneeL, 0, 0],
        RightFoot: [-10 + 25 * Math.max(0, -sin(p)), 0, 0],
        LeftFoot: [-10 + 25 * Math.max(0, -sin(p, Math.PI)), 0, 0],
        RightArm: [-40 * sin(p), 0, 9],
        LeftArm: [-40 * sin(p, Math.PI), 0, -9],
        RightForeArm: [78 + 12 * sin(p), 0, 0],
        LeftForeArm: [78 + 12 * sin(p, Math.PI), 0, 0],
      };
    },
    hipsY,
    true,
  );

  const idle = buildClip(
    'idle',
    2.4,
    12,
    (p) => ({
      hipsY: hipsY + 0.006 * sin(p),
      Chest: [2 * sin(p), 0, 0],
      Head: [3 * sin(p, 1), 10 * sin(p * 0.5), 0],
      RightArm: [3, 0, 6 + 2 * sin(p)],
      LeftArm: [3, 0, -6 - 2 * sin(p)],
      RightForeArm: [12, 0, 0],
      LeftForeArm: [12, 0, 0],
      RightUpLeg: [0, 0, 2],
      LeftUpLeg: [0, 0, -2],
    }),
    hipsY,
    true,
  );

  const jump = buildClip(
    'jump',
    JUMP_CLIP,
    12,
    (p) => {
      // 0 -> takeoff, 0.45 -> tuck, 1 -> reaching for the ground
      const tuck = Math.sin(Math.min(1, p / 0.9) * Math.PI);
      return {
        hipsY: hipsY + 0.05 * tuck,
        Spine: [-8 * tuck, 0, 0],
        Chest: [-10 * tuck, 0, 0],
        Head: [10 * tuck, 0, 0],
        RightUpLeg: [20 + 55 * tuck, 0, 4],
        LeftUpLeg: [-10 + 45 * tuck, 0, -4],
        RightLeg: [-20 - 85 * tuck, 0, 0],
        LeftLeg: [-30 - 70 * tuck, 0, 0],
        RightFoot: [15 * tuck, 0, 0],
        LeftFoot: [15 * tuck, 0, 0],
        RightArm: [40 + 110 * tuck, 0, 25 + 25 * tuck],
        LeftArm: [40 + 110 * tuck, 0, -25 - 25 * tuck],
        RightForeArm: [30, 0, 0],
        LeftForeArm: [30, 0, 0],
      };
    },
    hipsY,
    true,
  );

  const slide = buildClip(
    'slide',
    SLIDE_CLIP,
    10,
    (p) => {
      const k = Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.12 + 0.35);
      const kk = Math.min(1, k);
      return {
        hipsY: hipsY - (hipsY - 0.32) * kk,
        Hips: [72 * kk, 0, 0],
        Spine: [-18 * kk, 0, 0],
        Chest: [-14 * kk, 0, 0],
        Head: [-22 * kk, 0, 0],
        RightUpLeg: [0, 0, 6 * kk],
        RightLeg: [-6 * kk, 0, 0],
        LeftUpLeg: [-55 * kk, 0, -8 * kk],
        LeftLeg: [-100 * kk, 0, 0],
        RightArm: [-50 * kk, 0, 35 * kk],
        LeftArm: [20 * kk, 0, -70 * kk],
        RightForeArm: [20, 0, 0],
        LeftForeArm: [40 * kk, 0, 0],
      };
    },
    hipsY,
    true,
  );

  const death = buildClip(
    'death',
    1.0,
    14,
    (p) => {
      const f = Math.min(1, p / 0.55);
      const ease = 1 - Math.pow(1 - f, 2);
      const bounce = p > 0.55 ? Math.sin(((p - 0.55) / 0.45) * Math.PI) * 0.06 : 0;
      return {
        hipsY: hipsY - (hipsY - 0.22) * ease + bounce,
        hipsZ: 0.5 * ease,
        Hips: [-80 * ease, 0, 8 * ease],
        Chest: [10 * ease, 0, 0],
        Head: [25 * ease, 15 * ease, 0],
        RightArm: [-20 * ease, 0, 75 * ease],
        LeftArm: [-30 * ease, 0, -80 * ease],
        RightForeArm: [30 * ease, 0, 0],
        LeftForeArm: [10 * ease, 0, 0],
        RightUpLeg: [-10 * ease, 0, 12 * ease],
        LeftUpLeg: [20 * ease, 0, -10 * ease],
        RightLeg: [-20 * ease, 0, 0],
        LeftLeg: [-50 * ease, 0, 0],
      };
    },
    hipsY,
    true,
  );

  const victory = buildClip(
    'victory',
    1.1,
    14,
    (p) => {
      const hop = Math.max(0, Math.sin(p * TAU));
      return {
        hipsY: hipsY + 0.16 * hop - 0.04,
        Chest: [6 - 8 * hop, 0, 0],
        Head: [-10 * hop, 0, 0],
        RightArm: [10, 0, 140 + 20 * hop],
        LeftArm: [10, 0, -140 - 20 * hop],
        RightForeArm: [20 * (1 - hop), 0, 0],
        LeftForeArm: [20 * (1 - hop), 0, 0],
        RightUpLeg: [30 * (1 - hop), 0, 6],
        LeftUpLeg: [30 * (1 - hop), 0, -6],
        RightLeg: [-50 * (1 - hop), 0, 0],
        LeftLeg: [-50 * (1 - hop), 0, 0],
        RightFoot: [20 * (1 - hop), 0, 0],
        LeftFoot: [20 * (1 - hop), 0, 0],
      };
    },
    hipsY,
    true,
  );

  // Additive overlays (relative to their first frame, which is the zero pose).
  const additive = (clip: THREE.AnimationClip): THREE.AnimationClip => THREE.AnimationUtils.makeClipAdditive(clip, 0);

  const collect = additive(
    buildClip(
      'collect',
      0.3,
      6,
      (p) => {
        const k = Math.sin(p * Math.PI);
        return { RightArm: [35 * k, 0, 25 * k], RightForeArm: [-30 * k, 0, 0], Head: [-6 * k, 0, 0], Chest: [0, 0, 0] };
      },
      hipsY,
      false,
    ),
  );
  const dodge = (dir: 1 | -1): THREE.AnimationClip =>
    additive(
      buildClip(
        dir > 0 ? 'dodgeRight' : 'dodgeLeft',
        0.28,
        6,
        (p) => {
          const k = Math.sin(p * Math.PI);
          return {
            Spine: [0, 0, -dir * 14 * k],
            Chest: [0, -dir * 10 * k, -dir * 10 * k],
            Head: [0, 0, dir * 12 * k],
            RightArm: [0, 0, (dir > 0 ? 20 : 45) * k],
            LeftArm: [0, 0, -(dir > 0 ? 45 : 20) * k],
          };
        },
        hipsY,
        false,
      ),
    );
  const stumble = additive(
    buildClip(
      'stumble',
      0.55,
      10,
      (p) => {
        const k = Math.sin(p * Math.PI) * (1 - p * 0.3);
        const w = Math.sin(p * TAU * 2);
        return {
          Spine: [20 * k, 0, 18 * w * k],
          Chest: [10 * k, 15 * w * k, 0],
          Head: [20 * k, 0, -15 * w * k],
          RightArm: [60 * k, 0, 70 * k],
          LeftArm: [40 * k, 0, -80 * k],
        };
      },
      hipsY,
      false,
    ),
  );

  return {
    clips: { idle, run, jump, slide, death, victory },
    overlays: { collect, dodgeLeft: dodge(-1), dodgeRight: dodge(1), stumble },
  };
};

/** Cross-fading state animator driven by Three.js AnimationMixer. */
export class CharacterAnimator {
  readonly mixer: THREE.AnimationMixer;
  private readonly actions: Record<ClipName, THREE.AnimationAction>;
  private readonly overlays: Record<OverlayName, THREE.AnimationAction>;
  current: ClipName = 'idle';
  private overlayCooldown: Partial<Record<OverlayName, number>> = {};

  constructor(private readonly rig: CharacterRig) {
    this.mixer = new THREE.AnimationMixer(rig.root);
    const { clips, overlays } = createClips(rig.bones.Hips.position.y);
    this.actions = {} as Record<ClipName, THREE.AnimationAction>;
    (Object.keys(clips) as ClipName[]).forEach((k) => {
      const a = this.mixer.clipAction(clips[k]);
      if (k === 'jump' || k === 'slide' || k === 'death') {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions[k] = a;
    });
    this.overlays = {} as Record<OverlayName, THREE.AnimationAction>;
    (Object.keys(overlays) as OverlayName[]).forEach((k) => {
      const a = this.mixer.clipAction(overlays[k]);
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = false;
      a.weight = 1;
      this.overlays[k] = a;
    });
    this.actions.idle.play();
  }

  play(name: ClipName, fade = 0.12, timeScale = 1): void {
    const next = this.actions[name];
    next.timeScale = timeScale;
    if (name === this.current) {
      if (name === 'jump' || name === 'slide') next.reset().play();
      return;
    }
    const prev = this.actions[this.current];
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    prev.crossFadeTo(next, fade, false);
    this.current = name;
  }

  setTimeScale(name: ClipName, ts: number): void {
    this.actions[name].timeScale = ts;
  }

  overlay(name: OverlayName, weight = 1): void {
    const cd = this.overlayCooldown[name] ?? 0;
    if (cd > 0) return;
    this.overlayCooldown[name] = name === 'collect' ? 0.25 : 0.05;
    const a = this.overlays[name];
    a.reset();
    a.setEffectiveWeight(weight);
    a.play();
  }

  update(dt: number): void {
    for (const k in this.overlayCooldown) {
      const key = k as OverlayName;
      this.overlayCooldown[key] = Math.max(0, (this.overlayCooldown[key] ?? 0) - dt);
    }
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.rig.root);
  }
}

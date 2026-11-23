import * as THREE from 'three';
import { JETPACK, toWorldZ } from '../engine/constants';
import { damp, lerp } from '../engine/math';

export type CameraMode = 'menu' | 'showcase' | 'run' | 'death';

export interface CameraTarget {
  x: number;
  y: number;
  s: number;
  groundY: number;
  jetpack: boolean;
  speedFrac: number;
}

/** Third-person chase camera with menu/showcase framing and trauma-based shake. */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'menu';
  private trauma = 0;
  private time = 0;
  shakeEnabled = true;
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private followY = 0;
  private initialized = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(64, aspect, 0.1, 900);
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  snap(): void {
    this.initialized = false;
  }

  update(dt: number, t: CameraTarget): void {
    this.time += dt;
    const z = toWorldZ(t.s);
    let fov = 64;
    let rate = 7;
    switch (this.mode) {
      case 'menu': {
        const a = Math.sin(this.time * 0.25) * 0.35;
        this.desiredPos.set(Math.sin(a) * 4.6 + 0.4, 1.9, z - Math.cos(a) * 4.6);
        this.desiredLook.set(0, 1.15, z);
        fov = 50;
        rate = 3;
        break;
      }
      case 'showcase': {
        const a = Math.sin(this.time * 0.4) * 0.5;
        this.desiredPos.set(Math.sin(a) * 3.4 - 0.9, 1.5, z - Math.cos(a) * 3.4);
        this.desiredLook.set(-0.6, 1.0, z);
        fov = 46;
        rate = 4;
        break;
      }
      case 'run': {
        // Follow the ground height (train roofs) fully, jumps only partially.
        const targetY = t.jetpack ? t.y : t.groundY + Math.max(0, t.y - t.groundY) * 0.3;
        this.followY += (targetY - this.followY) * damp(t.jetpack ? 2.5 : 6, dt);
        const back = t.jetpack ? 8 : 6.4;
        const up = t.jetpack ? 3.4 : 3.1;
        this.desiredPos.set(t.x * 0.72, this.followY + up, z + back);
        this.desiredLook.set(t.x * 0.85, this.followY + (t.jetpack ? 0.2 : 1.25), z - 8);
        fov = 63 + 10 * t.speedFrac + (t.jetpack ? 6 : 0);
        rate = 10;
        break;
      }
      case 'death': {
        this.desiredPos.set(t.x + 2.6, t.groundY + 2.4, z + 4.2);
        this.desiredLook.set(t.x, t.groundY + 0.6, z);
        fov = 55;
        rate = 2.5;
        break;
      }
    }
    if (!this.initialized) {
      this.pos.copy(this.desiredPos);
      this.look.copy(this.desiredLook);
      this.followY = t.groundY;
      this.initialized = true;
    } else {
      const k = damp(rate, dt);
      // Lock forward axis tightly when running so the camera never lags behind at high speed.
      if (this.mode === 'run') {
        this.pos.x += (this.desiredPos.x - this.pos.x) * k;
        this.pos.y += (this.desiredPos.y - this.pos.y) * k;
        this.pos.z = this.desiredPos.z;
        this.look.x += (this.desiredLook.x - this.look.x) * k;
        this.look.y += (this.desiredLook.y - this.look.y) * k;
        this.look.z = this.desiredLook.z;
      } else {
        this.pos.lerp(this.desiredPos, k);
        this.look.lerp(this.desiredLook, k);
      }
    }
    this.camera.fov = lerp(this.camera.fov, fov, damp(4, dt));
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);

    if (this.trauma > 0) {
      const s = this.shakeEnabled ? this.trauma * this.trauma : 0;
      const tt = this.time * 40;
      this.camera.position.x += (Math.sin(tt * 1.3) + Math.sin(tt * 2.9)) * 0.12 * s;
      this.camera.position.y += (Math.sin(tt * 1.7 + 1) + Math.sin(tt * 3.1)) * 0.1 * s;
      this.camera.rotation.z += Math.sin(tt * 1.1 + 2) * 0.03 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    }
  }

  get jetpackAltitude(): number {
    return JETPACK.altitude;
  }
}

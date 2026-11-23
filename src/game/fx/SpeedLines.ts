import * as THREE from 'three';

/** Streaks rushing past the camera; intensity follows speed and jetpack. */
export class SpeedLines {
  private readonly mesh: THREE.InstancedMesh;
  private readonly data: { a: number; r: number; z: number; len: number }[] = [];
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  intensity = 0;

  constructor(camera: THREE.Camera, count = 46) {
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const geo = new THREE.BoxGeometry(0.025, 0.025, 1);
    this.mesh = new THREE.InstancedMesh(geo, this.mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    for (let i = 0; i < count; i++) this.data.push({ a: Math.random() * Math.PI * 2, r: 2.2 + Math.random() * 3.5, z: -Math.random() * 40, len: 2 + Math.random() * 4 });
    camera.add(this.mesh);
  }

  update(dt: number, speed: number): void {
    const target = this.intensity;
    this.mat.opacity += (target * 0.35 - this.mat.opacity) * Math.min(1, dt * 4);
    this.mesh.visible = this.mat.opacity > 0.01;
    if (!this.mesh.visible) return;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      d.z += speed * 2.2 * dt;
      if (d.z > 4) {
        d.z = -40 - Math.random() * 10;
        d.a = Math.random() * Math.PI * 2;
        d.r = 2.2 + Math.random() * 3.5;
      }
      this.p.set(Math.cos(d.a) * d.r, Math.sin(d.a) * d.r * 0.6, d.z);
      this.sc.set(1, 1, d.len * (0.5 + target));
      this.m.compose(this.p, this.q, this.sc);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

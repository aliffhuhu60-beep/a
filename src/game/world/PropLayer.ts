import * as THREE from 'three';
import { Rng, hashString } from '../engine/rng';

export interface PartDef {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  local?: THREE.Matrix4;
  /** Apply the per-instance colour to this part. */
  colorize?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface Placement {
  matrix: THREE.Matrix4;
  color: THREE.Color;
  visible: boolean;
}

export type PlaceFn = (k: number, side: number, rng: Rng, out: Placement) => void;

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * A stateless, deterministic, instanced scenery layer.
 *
 * The track is split into lots of `spacing` metres. Lot k always produces the
 * same object (seeded by k), so recycling instances as the runner advances is
 * just "write the matrix for the lots that entered the window". One draw call
 * per part regardless of how many objects are visible.
 */
export class PropLayer {
  readonly meshes: THREE.InstancedMesh[] = [];
  private readonly slotK: Int32Array;
  private readonly capacity: number;
  private readonly tmp: Placement = { matrix: new THREE.Matrix4(), color: new THREE.Color(), visible: true };
  private readonly m = new THREE.Matrix4();
  private readonly seed: number;
  private version = 0;
  private slotVersion: Int32Array;

  constructor(
    parent: THREE.Object3D,
    name: string,
    private readonly parts: PartDef[],
    private readonly spacing: number,
    private readonly sides: number[],
    private readonly ahead: number,
    private readonly behind: number,
    private readonly place: PlaceFn,
  ) {
    const lots = Math.ceil((ahead + behind) / spacing) + 2;
    this.capacity = lots * sides.length;
    this.slotK = new Int32Array(this.capacity).fill(-999999);
    this.slotVersion = new Int32Array(this.capacity).fill(-1);
    this.seed = hashString(name);
    for (const p of parts) {
      const mesh = new THREE.InstancedMesh(p.geometry, p.material, this.capacity);
      mesh.name = `${name}`;
      mesh.frustumCulled = false;
      mesh.castShadow = !!p.castShadow;
      mesh.receiveShadow = !!p.receiveShadow;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < this.capacity; i++) mesh.setMatrixAt(i, ZERO);
      if (p.colorize) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3).fill(1), 3);
      }
      parent.add(mesh);
      this.meshes.push(mesh);
    }
  }

  /** Forces every lot to be re-placed (e.g. after a theme change ahead). */
  invalidate(): void {
    this.version++;
  }

  /** Re-places only lots with k >= kFrom (used to recolour what lies ahead). */
  invalidateFrom(s: number): void {
    const kFrom = Math.floor(s / this.spacing);
    for (let i = 0; i < this.capacity; i++) if (this.slotK[i] >= kFrom) this.slotK[i] = -999999;
  }

  update(playerS: number): void {
    const kMin = Math.floor((playerS - this.behind) / this.spacing);
    const kMax = Math.floor((playerS + this.ahead) / this.spacing);
    const lots = this.capacity / this.sides.length;
    let dirty = false;
    for (let k = kMin; k <= kMax; k++) {
      const lotSlot = ((k % lots) + lots) % lots;
      for (let si = 0; si < this.sides.length; si++) {
        const slot = lotSlot * this.sides.length + si;
        if (this.slotK[slot] === k && this.slotVersion[slot] === this.version) continue;
        this.slotK[slot] = k;
        this.slotVersion[slot] = this.version;
        const side = this.sides[si];
        const rng = new Rng(this.seed ^ Math.imul(k + 7919, 2654435761) ^ (side > 0 ? 0x5bd1e995 : 0));
        this.tmp.visible = true;
        this.tmp.color.setRGB(1, 1, 1);
        this.tmp.matrix.identity();
        this.place(k, side, rng, this.tmp);
        for (let p = 0; p < this.parts.length; p++) {
          const mesh = this.meshes[p];
          if (!this.tmp.visible) {
            mesh.setMatrixAt(slot, ZERO);
          } else {
            const local = this.parts[p].local;
            if (local) this.m.multiplyMatrices(this.tmp.matrix, local);
            else this.m.copy(this.tmp.matrix);
            mesh.setMatrixAt(slot, this.m);
            if (mesh.instanceColor) mesh.setColorAt(slot, this.tmp.color);
          }
        }
        dirty = true;
      }
    }
    if (dirty) {
      for (const mesh of this.meshes) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  setVisible(v: boolean): void {
    for (const m of this.meshes) m.visible = v;
  }

  dispose(): void {
    for (const m of this.meshes) {
      m.removeFromParent();
      m.dispose();
    }
  }
}

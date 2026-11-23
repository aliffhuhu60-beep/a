import * as THREE from 'three';
import { LANE_WIDTH, THEME_LENGTH, TUNNEL_LENGTH } from '../engine/constants';
import { clamp, damp, lerp, smoothstep } from '../engine/math';
import type { Quality } from '../engine/types';
import { createBuildingMaterial, type BuildingUniforms } from './materials';
import { PropLayer } from './PropLayer';
import { AD_COUNT, adTexture, concreteTexture, glowTexture, pavementTexture, signTexture, skyTexture, skylineTexture, stripeTexture, trackTexture, tunnelTexture } from './textures';
import { THEMES, themeAt, type ThemeDef } from './themes';

const SNAP = 4;
const TRACK_AHEAD = 470;
const TRACK_BEHIND = 50;

/** Theme index active at a track position. Deterministic so every system agrees. */
export const themeIndexAt = (s: number, start: number): number => start + Math.max(0, Math.floor(s / THEME_LENGTH));

/** Tunnel k (k >= 1) is centred on the theme boundary k * THEME_LENGTH. */
export const tunnelAt = (s: number): { start: number; end: number } | null => {
  const k = Math.round(s / THEME_LENGTH);
  if (k < 1) return null;
  const start = k * THEME_LENGTH - TUNNEL_LENGTH / 2;
  const end = start + TUNNEL_LENGTH;
  return s >= start && s <= end ? { start, end } : null;
};

const inTunnelZone = (s: number, margin = 6): boolean => {
  const k = Math.round(s / THEME_LENGTH);
  if (k < 1) return false;
  const start = k * THEME_LENGTH - TUNNEL_LENGTH / 2 - margin;
  return s >= start && s <= start + TUNNEL_LENGTH + margin * 2;
};

interface QualityProfile {
  ahead: number;
  towers: boolean;
  props: number;
}

const QUALITY: Record<Quality, QualityProfile> = {
  low: { ahead: 200, towers: false, props: 0.6 },
  medium: { ahead: 260, towers: true, props: 1 },
  high: { ahead: 300, towers: true, props: 1 },
};

const col = new THREE.Color();
const col2 = new THREE.Color();

/**
 * Builds and streams the city around the track: ground, rails, buildings,
 * props, billboards, stations, tunnels, sky and theme lighting.
 */
export class EnvironmentGenerator {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private readonly trackGroup = new THREE.Group();
  private readonly layers: PropLayer[] = [];
  private buildingLayers: PropLayer[] = [];
  private readonly buildingUniforms: BuildingUniforms[] = [];
  private readonly groundMat: THREE.MeshLambertMaterial;
  private readonly trackMat: THREE.MeshLambertMaterial;
  private readonly wallMat: THREE.MeshLambertMaterial;
  private readonly neonStripMat: THREE.MeshBasicMaterial;
  private readonly lampHeadMat: THREE.MeshBasicMaterial;
  private readonly skylineMats: THREE.MeshBasicMaterial[] = [];
  private readonly skylines: THREE.Mesh[] = [];
  private readonly billboards: { mesh: THREE.Group; k: number; mat: THREE.MeshBasicMaterial }[] = [];
  private readonly billboardMats: THREE.MeshBasicMaterial[] = [];
  private readonly tunnel: THREE.Group;
  private readonly tunnelLights: THREE.MeshBasicMaterial;
  private readonly station: THREE.Group;
  private stationK = -1;
  private readonly clouds: THREE.Sprite[] = [];
  private readonly drones: THREE.InstancedMesh;
  private readonly droneLights: THREE.InstancedMesh;
  private readonly droneData: { x: number; y: number; s: number; v: number }[] = [];
  private readonly catenaryWires: THREE.Mesh;
  private readonly neonStrips: THREE.Mesh;
  private readonly skyTextures: THREE.Texture[];

  private from: ThemeDef = THEMES[0];
  private to: ThemeDef = THEMES[0];
  private blend = 1;
  private currentIndex = 0;
  startTheme = 0;
  tunnelFactor = 0;
  private time = 0;
  private profile: QualityProfile;
  private readonly fog: THREE.Fog;
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpS = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    quality: Quality,
  ) {
    this.profile = QUALITY[quality];
    scene.add(this.group);
    this.group.add(this.trackGroup);

    this.fog = new THREE.Fog(0xcfe3f5, 60, 260);
    scene.fog = this.fog;
    this.skyTextures = THEMES.map((t) => skyTexture(t.skyTop, t.skyBottom, t.id));
    scene.background = this.skyTextures[0];

    this.hemi = new THREE.HemisphereLight(0xbfdcff, 0x6d6a60, 1.2);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.position.set(12, 26, 8);
    this.sun.shadow.camera.left = -14;
    this.sun.shadow.camera.right = 14;
    this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // --- Track bed, pavement, walls, rails (snapped meshes, look infinite) ---
    const len = TRACK_AHEAD + TRACK_BEHIND;
    const trackTex = trackTexture().clone();
    trackTex.needsUpdate = true;
    trackTex.repeat.set(1, len / 4);
    this.trackMat = new THREE.MeshLambertMaterial({ map: trackTex });
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(LANE_WIDTH * 3.55, len), this.trackMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, 0.001, TRACK_BEHIND - len / 2);
    bed.receiveShadow = true;
    this.trackGroup.add(bed);

    const pave = pavementTexture().clone();
    pave.needsUpdate = true;
    pave.repeat.set(70 / 4, len / 4);
    this.groundMat = new THREE.MeshLambertMaterial({ map: pave });
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(70, len), this.groundMat);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (LANE_WIDTH * 1.775 + 35), 0, TRACK_BEHIND - len / 2);
      g.receiveShadow = true;
      this.trackGroup.add(g);
    }

    const conc = concreteTexture().clone();
    conc.needsUpdate = true;
    conc.repeat.set(len / 4, 1);
    this.wallMat = new THREE.MeshLambertMaterial({ map: conc });
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, len), this.wallMat);
      w.position.set(side * 4.85, 0.4, TRACK_BEHIND - len / 2);
      w.receiveShadow = true;
      this.trackGroup.add(w);
    }

    this.neonStripMat = new THREE.MeshBasicMaterial({ color: 0xff2fb4 });
    const strips: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.06, 0.08, len);
      g.translate(side * 4.66, 0.62, TRACK_BEHIND - len / 2);
      strips.push(g);
    }
    this.neonStrips = new THREE.Mesh(mergeBoxes(strips), this.neonStripMat);
    this.trackGroup.add(this.neonStrips);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.35 });
    const railGeos: THREE.BufferGeometry[] = [];
    for (let lane = -1; lane <= 1; lane++) {
      for (const off of [-0.72, 0.72]) {
        const g = new THREE.BoxGeometry(0.1, 0.14, len);
        g.translate(lane * LANE_WIDTH + off, 0.07, TRACK_BEHIND - len / 2);
        railGeos.push(g);
      }
    }
    const rails = new THREE.Mesh(mergeBoxes(railGeos), railMat);
    rails.receiveShadow = true;
    this.trackGroup.add(rails);

    // Catenary wires (railway district)
    const wireGeos: THREE.BufferGeometry[] = [];
    for (let lane = -1; lane <= 1; lane++) {
      const g = new THREE.BoxGeometry(0.04, 0.04, len);
      g.translate(lane * LANE_WIDTH, 6.1, TRACK_BEHIND - len / 2);
      wireGeos.push(g);
    }
    this.catenaryWires = new THREE.Mesh(mergeBoxes(wireGeos), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    this.trackGroup.add(this.catenaryWires);

    this.lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
    this.buildLayers();

    // --- Far skyline (follows the runner; parallax via texture offset) ---
    for (let i = 0; i < 3; i++) {
      const tex = skylineTexture(100 + i).clone();
      tex.needsUpdate = true;
      tex.repeat.set(i === 2 ? 2 : 3, 1);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false, color: 0x9cb8d4 });
      this.skylineMats.push(mat);
      const w = i === 2 ? 1400 : 1600;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 170), mat);
      mesh.renderOrder = -10;
      if (i < 2) {
        mesh.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      this.skylines.push(mesh);
      this.group.add(mesh);
    }

    // --- Billboards (digital ads, 2-frame animated) ---
    for (let i = 0; i < AD_COUNT; i++) {
      const t = adTexture(i).clone();
      t.needsUpdate = true;
      t.repeat.set(1, 0.5);
      this.billboardMats.push(new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    }
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f47 });
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 8), poleMat);
      pole.position.y = 4.5;
      g.add(pole);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.6, 0.4), poleMat);
      frame.position.set(0, 11, 0.05);
      g.add(frame);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), this.billboardMats[0]);
      screen.position.set(0, 11, 0.27);
      g.add(screen);
      g.visible = false;
      this.group.add(g);
      this.billboards.push({ mesh: g, k: -1, mat: this.billboardMats[0] });
    }

    this.tunnel = this.buildTunnel();
    this.tunnelLights = (this.tunnel.userData.lights as THREE.MeshBasicMaterial) ?? new THREE.MeshBasicMaterial();
    this.station = this.buildStation();

    // --- Sky movers: clouds (day themes) and drones (neon) ---
    const cloudTex = cloudTexture();
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
      sp.scale.set(70, 30, 1);
      sp.userData = { x: (Math.random() - 0.5) * 400, y: 55 + Math.random() * 40, ds: Math.random() * 500, v: 1 + Math.random() * 2 };
      this.clouds.push(sp);
      this.group.add(sp);
    }
    this.drones = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.35, 1.2), new THREE.MeshLambertMaterial({ color: 0x20202a }), 14);
    this.droneLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 28);
    this.droneLights.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(28 * 3), 3);
    this.drones.frustumCulled = false;
    this.droneLights.frustumCulled = false;
    for (let i = 0; i < 14; i++) {
      this.droneData.push({ x: (Math.random() - 0.5) * 160, y: 16 + Math.random() * 26, s: Math.random() * 300, v: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 8) });
      const c = i % 2 ? 0xff2fb4 : 0x00f0ff;
      col.set(c);
      this.droneLights.setColorAt(i * 2, col);
      this.droneLights.setColorAt(i * 2 + 1, col.set(0xff3030));
    }
    this.group.add(this.drones, this.droneLights);

    this.applyTheme(THEMES[0], 1);
  }

  setQuality(q: Quality): void {
    this.profile = QUALITY[q];
    for (const l of this.layers) l.invalidate();
  }

  get theme(): ThemeDef {
    return this.blend < 0.5 ? this.from : this.to;
  }

  get bloomStrength(): number {
    return lerp(this.from.bloom, this.to.bloom, this.blend) * (1 + this.tunnelFactor * 0.3);
  }

  get themeIndex(): number {
    return this.currentIndex;
  }

  private themeFor(s: number): ThemeDef {
    return themeAt(themeIndexAt(s, this.startTheme));
  }

  /** Resets the world for a new run (or the menu) starting at theme `start`. */
  reset(start: number): void {
    this.startTheme = start;
    this.currentIndex = start;
    this.from = themeAt(start);
    this.to = this.from;
    this.blend = 1;
    this.stationK = -1;
    this.station.visible = false;
    this.tunnel.visible = false;
    for (const b of this.billboards) {
      b.k = -1;
      b.mesh.visible = false;
    }
    for (const l of this.layers) l.invalidate();
    this.applyTheme(this.to, 1);
  }

  private buildLayers(): void {
    const ahead = 300;
    const behind = 30;
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    unitBox.translate(0, 0.5, 0);

    // Near buildings: shops at street level, offices above.
    const near = createBuildingMaterial({ shopFronts: true });
    this.buildingUniforms.push(near.uniforms);
    const nearLayer = new PropLayer(this.group, 'near-buildings', [{ geometry: unitBox, material: near.material, colorize: true, receiveShadow: false }], 12, [-1, 1], ahead, behind, (k, side, rng, out) => {
      const s = k * 12 + 6;
      const theme = this.themeFor(s);
      const w = rng.range(8, 11.6);
      const h = theme.id === 'railway' ? rng.range(7, 16) : rng.range(9, 26);
      const depth = rng.range(8, 12);
      const x = side * (11 + depth / 2 + rng.range(0, 1.5));
      out.matrix.compose(this.tmpV.set(x, 0, -s), this.tmpQ.identity(), this.tmpS.set(depth, h, w));
      out.color.set(rng.pick(theme.buildings));
    });
    // Roof details (AC units / water tanks) on top of near buildings.
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8c8f94 });
    const roofLayer = new PropLayer(this.group, 'near-buildings', [{ geometry: unitBox, material: roofMat }], 12, [-1, 1], ahead, behind, (k, side, rng, out) => {
      // Same seed as the building in this lot, so we can recompute its size.
      const s = k * 12 + 6;
      const theme = this.themeFor(s);
      const w = rng.range(8, 11.6);
      const h = theme.id === 'railway' ? rng.range(7, 16) : rng.range(9, 26);
      const depth = rng.range(8, 12);
      const x = side * (11 + depth / 2 + rng.range(0, 1.5));
      const visible = rng.chance(0.6);
      out.visible = visible;
      out.matrix.compose(this.tmpV.set(x + rng.range(-2, 2), h, -s + rng.range(-2, 2)), this.tmpQ.identity(), this.tmpS.set(rng.range(1.5, 3), rng.range(0.8, 2), w * 0.3));
    });
    this.layers.push(nearLayer, roofLayer);
    this.buildingLayers.push(nearLayer);

    // Towers: the skyline layer behind the shops.
    const tower = createBuildingMaterial({ shopFronts: false });
    this.buildingUniforms.push(tower.uniforms);
    const towerLayer = new PropLayer(this.group, 'towers', [{ geometry: unitBox, material: tower.material, colorize: true }], 16, [-1, 1], ahead + 40, behind, (k, side, rng, out) => {
      const s = k * 16 + 8;
      const theme = this.themeFor(s);
      if (!this.profile.towers && rng.chance(0.5)) {
        out.visible = false;
        return;
      }
      const w = rng.range(9, 15);
      const h = theme.id === 'railway' ? rng.range(14, 40) : theme.id === 'neon' ? rng.range(40, 110) : rng.range(28, 85);
      const depth = rng.range(10, 18);
      const x = side * (27 + depth / 2 + rng.range(0, 14));
      out.matrix.compose(this.tmpV.set(x, 0, -s), this.tmpQ.identity(), this.tmpS.set(depth, h, w));
      out.color.set(rng.pick(theme.towers));
    });
    this.layers.push(towerLayer);
    this.buildingLayers.push(towerLayer);

    // Street lamps.
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 5.4, 6);
    poleGeo.translate(0, 2.7, 0);
    const armGeo = new THREE.BoxGeometry(1.4, 0.1, 0.12);
    armGeo.translate(-0.65, 5.35, 0);
    const headGeo = new THREE.BoxGeometry(0.6, 0.12, 0.3);
    headGeo.translate(-1.25, 5.25, 0);
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x3b4048 });
    const lampLayer = new PropLayer(
      this.group,
      'lamps',
      [
        { geometry: poleGeo, material: lampMat, castShadow: false },
        { geometry: armGeo, material: lampMat },
        { geometry: headGeo, material: this.lampHeadMat },
      ],
      18,
      [-1, 1],
      ahead,
      behind,
      (k, side, _rng, out) => {
        const s = k * 18 + (side > 0 ? 9 : 0);
        if (inTunnelZone(s) || (this.station.visible && Math.abs(s - this.stationS) < 26)) {
          out.visible = false;
          return;
        }
        // Arm points towards the track: mirror for the right-hand side.
        this.tmpQ.setFromAxisAngle(this.tmpV.set(0, 1, 0), side > 0 ? 0 : Math.PI);
        out.matrix.compose(this.tmpV.set(side * 5.5, 0, -s), this.tmpQ, this.tmpS.set(1, 1, 1));
      },
    );
    this.layers.push(lampLayer);

    // Trees (Modern City).
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6);
    trunkGeo.translate(0, 1.1, 0);
    const crownGeo = new THREE.IcosahedronGeometry(1.5, 1);
    crownGeo.translate(0, 3.2, 0);
    const treeLayer = new PropLayer(
      this.group,
      'trees',
      [
        { geometry: trunkGeo, material: new THREE.MeshLambertMaterial({ color: 0x6b4a2f }) },
        { geometry: crownGeo, material: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), colorize: true },
      ],
      14,
      [-1, 1],
      ahead,
      behind,
      (k, side, rng, out) => {
        const s = k * 14 + rng.range(0, 6);
        const theme = this.themeFor(s);
        if (!theme.props.trees || inTunnelZone(s) || rng.chance(1 - 0.85 * this.profile.props)) {
          out.visible = false;
          return;
        }
        const sc = rng.range(0.8, 1.3);
        out.matrix.compose(this.tmpV.set(side * rng.range(7.5, 9.5), 0, -s), this.tmpQ.setFromAxisAngle(this.tmpS.set(0, 1, 0), rng.range(0, 6)), this.tmpS.set(sc, sc, sc));
        out.color.setHSL(rng.range(0.24, 0.33), 0.55, rng.range(0.28, 0.4));
      },
    );
    this.layers.push(treeLayer);

    // Shipping containers (Railway District).
    const contGeo = new THREE.BoxGeometry(2.4, 2.6, 6);
    contGeo.translate(0, 1.3, 0);
    const contLayer = new PropLayer(
      this.group,
      'containers',
      [{ geometry: contGeo, material: new THREE.MeshLambertMaterial({ map: stripeTexture('#ffffff', '#d8d8d8'), color: 0xffffff }), colorize: true }],
      7,
      [-1, 1],
      ahead,
      behind,
      (k, side, rng, out) => {
        const s = k * 7;
        const theme = this.themeFor(s);
        if (!theme.props.containers || inTunnelZone(s, 10) || rng.chance(0.25)) {
          out.visible = false;
          return;
        }
        const stack = rng.int(0, 2);
        out.matrix.compose(this.tmpV.set(side * rng.range(7.2, 8.5), 0, -s), this.tmpQ.setFromAxisAngle(this.tmpS.set(0, 1, 0), rng.range(-0.08, 0.08)), this.tmpS.set(1, stack + 1, 1));
        out.color.set(rng.pick([0xc0392b, 0x2e86c1, 0x27ae60, 0xf39c12, 0x7f8c8d, 0x8e44ad]));
      },
    );
    this.layers.push(contLayer);

    // Catenary masts spanning the track (Railway District).
    const mastGeo = new THREE.BoxGeometry(0.3, 6.8, 0.3);
    mastGeo.translate(0, 3.4, 0);
    const mastL = new THREE.Matrix4().makeTranslation(-4.6, 0, 0);
    const mastR = new THREE.Matrix4().makeTranslation(4.6, 0, 0);
    const beamGeo = new THREE.BoxGeometry(9.6, 0.25, 0.25);
    beamGeo.translate(0, 6.6, 0);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x5a5f66 });
    const catLayer = new PropLayer(
      this.group,
      'catenary',
      [
        { geometry: mastGeo, material: mastMat, local: mastL },
        { geometry: mastGeo, material: mastMat, local: mastR },
        { geometry: beamGeo, material: mastMat },
      ],
      30,
      [0],
      ahead,
      behind,
      (k, _side, _rng, out) => {
        const s = k * 30 + 15;
        const theme = this.themeFor(s);
        if (!theme.props.catenary || inTunnelZone(s, 4)) {
          out.visible = false;
          return;
        }
        out.matrix.makeTranslation(0, 0, -s);
      },
    );
    this.layers.push(catLayer);

    // Neon signs on building fronts (Neon Cyber City).
    const signGeo = new THREE.BoxGeometry(0.25, 1, 1);
    const neonLayer = new PropLayer(
      this.group,
      'neon-signs',
      [{ geometry: signGeo, material: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), colorize: true }],
      9,
      [-1, 1],
      ahead,
      behind,
      (k, side, rng, out) => {
        const s = k * 9 + rng.range(0, 3);
        const theme = this.themeFor(s);
        if (!theme.props.neonSigns || inTunnelZone(s, 0) || rng.chance(0.2)) {
          out.visible = false;
          return;
        }
        const vertical = rng.chance(0.5);
        const h = vertical ? rng.range(3, 6) : rng.range(0.5, 0.9);
        const w = vertical ? rng.range(0.6, 0.9) : rng.range(3, 6);
        out.matrix.compose(this.tmpV.set(side * 10.85, rng.range(4.5, 9), -s), this.tmpQ.identity(), this.tmpS.set(1, h, w));
        out.color.set(rng.pick(theme.neon));
      },
    );
    this.layers.push(neonLayer);
  }

  private stationS = 0;

  private buildStation(): THREE.Group {
    const g = new THREE.Group();
    const plat = new THREE.MeshLambertMaterial({ map: concreteTexture(), color: 0xcfcac2 });
    const edge = new THREE.MeshLambertMaterial({ map: stripeTexture('#f2c014', '#2a2a2a') });
    const roof = new THREE.MeshLambertMaterial({ color: 0x2f4f6f });
    const pillar = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(5, 1.0, 48), plat);
      p.position.set(side * 7.5, 0.5, -24);
      p.receiveShadow = true;
      g.add(p);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 48), edge);
      e.position.set(side * 5.2, 1.03, -24);
      g.add(e);
      const r = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 46), roof);
      r.position.set(side * 7.6, 5.6, -24);
      r.castShadow = true;
      g.add(r);
      for (let i = 0; i < 5; i++) {
        const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.6, 8), pillar);
        pl.position.set(side * 8.8, 3.3, -4 - i * 10);
        g.add(pl);
        const bench = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 2), roof);
        bench.position.set(side * 8.2, 1.22, -9 - i * 10);
        g.add(bench);
      }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: signTexture('DASH CENTRAL', '#0d3b66', '#ffffff') }));
      sign.position.set(side * 5.6, 4.4, -24);
      sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(sign);
    }
    g.visible = false;
    this.group.add(g);
    return g;
  }

  private buildTunnel(): THREE.Group {
    const g = new THREE.Group();
    const tex = tunnelTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(TUNNEL_LENGTH / 6, 1.2);
    const wall = new THREE.MeshLambertMaterial({ map: tex, color: 0xb0b0b8 });
    const lights = new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false });
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1, 7, TUNNEL_LENGTH), wall);
      w.position.set(side * 5.7, 3.5, -TUNNEL_LENGTH / 2);
      g.add(w);
    }
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(12.4, 1, TUNNEL_LENGTH), wall);
    ceil.position.set(0, 7.5, -TUNNEL_LENGTH / 2);
    g.add(ceil);
    // Light strips: one merged geometry.
    const lg: THREE.BufferGeometry[] = [];
    for (let i = 0; i < TUNNEL_LENGTH / 8; i++) {
      for (const side of [-1, 1]) {
        const b = new THREE.BoxGeometry(0.1, 0.25, 3.5);
        b.translate(side * 5.15, 5.2, -4 - i * 8);
        lg.push(b);
      }
      const c = new THREE.BoxGeometry(0.4, 0.08, 4);
      c.translate(0, 6.95, -4 - i * 8);
      lg.push(c);
    }
    g.add(new THREE.Mesh(mergeBoxes(lg), lights));
    // Portals (entrance + exit facades with an opening).
    const facade = new THREE.MeshLambertMaterial({ map: concreteTexture(), color: 0x8d8478 });
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture('METRO LINE', '#1b1b1b', '#ffd23f') });
    for (const end of [0, -TUNNEL_LENGTH]) {
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 2.5), facade);
        b.position.set(side * (6.2 + 20), 8, end + (end === 0 ? -1.2 : 1.2));
        g.add(b);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(12.4, 8, 2.5), facade);
      top.position.set(0, 12, end + (end === 0 ? -1.2 : 1.2));
      g.add(top);
      if (end === 0) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.2), signMat);
        sign.position.set(0, 10.2, 0.06);
        g.add(sign);
      }
    }
    g.userData.lights = lights;
    g.visible = false;
    this.group.add(g);
    return g;
  }

  private applyTheme(theme: ThemeDef, t: number): void {
    void t;
    this.to = theme;
  }

  /** Called every frame. `playerS` drives streaming; `dt` drives animation. */
  update(dt: number, playerS: number, playerX: number): void {
    this.time += dt;
    this.trackGroup.position.z = -Math.floor(playerS / SNAP) * SNAP;

    // Theme switching happens in the middle of each tunnel.
    const idx = themeIndexAt(playerS, this.startTheme);
    if (idx !== this.currentIndex) {
      this.currentIndex = idx;
      this.from = this.blend < 0.5 ? this.from : this.to;
      this.to = themeAt(idx);
      this.blend = 0;
      this.scene.background = this.skyTextures[THEMES.indexOf(this.to)];
      for (const l of this.layers) l.invalidateFrom(playerS + 30);
    }
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / 1.5);
    const b = smoothstep(this.blend);

    // Tunnel lighting.
    const tun = tunnelAt(playerS + 4);
    let tf = 0;
    if (tun) tf = clamp(Math.min(playerS + 4 - tun.start, tun.end - playerS) / 10, 0, 1);
    this.tunnelFactor += (tf - this.tunnelFactor) * damp(5, dt);
    const tunnelVis = tunnelAt(playerS) ?? tunnelAt(playerS + 260);
    const k = Math.round((playerS + 130) / THEME_LENGTH);
    if (k >= 1) {
      const start = k * THEME_LENGTH - TUNNEL_LENGTH / 2;
      const near = playerS > start - 300 && playerS < start + TUNNEL_LENGTH + 40;
      this.tunnel.visible = near;
      this.tunnel.position.z = -start;
    } else this.tunnel.visible = false;
    void tunnelVis;

    const A = this.from;
    const B = this.to;
    const tfk = this.tunnelFactor;
    this.fog.color.copy(col.set(A.fog).lerp(col2.set(B.fog), b)).lerp(col2.set(0x0d0d12), tfk * 0.85);
    this.fog.near = lerp(A.fogNear, B.fogNear, b) * (1 - tfk * 0.5);
    this.fog.far = lerp(A.fogFar, B.fogFar, b) * (this.profile.ahead / 260) * (1 - tfk * 0.35);
    this.hemi.color.copy(col.set(A.hemiSky).lerp(col2.set(B.hemiSky), b));
    this.hemi.groundColor.copy(col.set(A.hemiGround).lerp(col2.set(B.hemiGround), b));
    this.hemi.intensity = lerp(A.hemiIntensity, B.hemiIntensity, b) * (1 - tfk * 0.55);
    this.sun.color.copy(col.set(A.sun).lerp(col2.set(B.sun), b));
    this.sun.intensity = lerp(A.sunIntensity, B.sunIntensity, b) * (1 - tfk * 0.9);
    this.groundMat.color.copy(col.set(A.ground).lerp(col2.set(B.ground), b));
    this.trackMat.color.copy(col.set(A.track).lerp(col2.set(B.track), b));
    this.wallMat.color.copy(col.set(A.wall).lerp(col2.set(B.wall), b));
    this.lampHeadMat.color.copy(col.set(A.lampLight).lerp(col2.set(B.lampLight), b));
    this.tunnelLights.color.set(B.id === 'neon' ? 0xff6be0 : B.id === 'railway' ? 0xffc070 : 0xfff3c4);
    this.neonStrips.visible = B.props.neonSigns;
    this.neonStripMat.color.setHSL((this.time * 0.05) % 1, 1, 0.55);
    this.catenaryWires.visible = B.props.catenary && !tun;
    for (const u of this.buildingUniforms) {
      u.uGlass.value.copy(col.set(A.glass).lerp(col2.set(B.glass), b));
      u.uWinColor.value.copy(col.set(A.windowLight).lerp(col2.set(B.windowLight), b));
      u.uLit.value = lerp(A.windowLit, B.windowLit, b);
      u.uWinIntensity.value = lerp(A.windowIntensity, B.windowIntensity, b);
    }
    for (let i = 0; i < this.skylineMats.length; i++) {
      const m = this.skylineMats[i];
      m.color.copy(col.set(A.skyline).lerp(col2.set(B.skyline), b));
      m.opacity = 1 - tfk;
      if (m.map) m.map.offset.x = (playerS * (i === 2 ? 0 : 0.0004)) % 1;
    }

    // Sun & shadow camera follow the runner.
    this.sun.position.set(playerX + 10, 28, -playerS + 6);
    this.sun.target.position.set(playerX, 0, -playerS - 14);

    // Skyline planes.
    this.skylines[0].position.set(-170, 70, -playerS - 200);
    this.skylines[1].position.set(170, 70, -playerS - 200);
    this.skylines[2].position.set(0, 70, -playerS - 420);

    for (const l of this.layers) l.update(playerS);
    this.updateBillboards(playerS);
    this.updateStation(playerS);
    this.updateSky(dt, playerS);
  }

  private updateBillboards(playerS: number): void {
    const spacing = 70;
    const frame = Math.floor(this.time / 2.5) % 2;
    for (const m of this.billboardMats) if (m.map) m.map.offset.y = frame * 0.5;
    const kMin = Math.floor((playerS - 30) / spacing);
    for (let i = 0; i < this.billboards.length; i++) {
      const k = kMin + i;
      const bb = this.billboards[(k % this.billboards.length + this.billboards.length) % this.billboards.length];
      if (bb.k === k) continue;
      bb.k = k;
      const s = k * spacing + 35;
      const side = k % 2 === 0 ? -1 : 1;
      const theme = this.themeFor(s);
      bb.mesh.visible = !inTunnelZone(s, 20) && k > 0;
      bb.mesh.position.set(side * (theme.id === 'railway' ? 13.5 : 12.5), 0, -s);
      bb.mesh.rotation.y = side * -0.55;
      const mat = this.billboardMats[(k * 7 + 3) % this.billboardMats.length];
      const screen = bb.mesh.children[2] as THREE.Mesh;
      screen.material = mat;
    }
  }

  private updateStation(playerS: number): void {
    const spacing = 540;
    const k = Math.floor((playerS + 260) / spacing);
    if (k === this.stationK) return;
    this.stationK = k;
    const s = k * spacing + 200;
    const theme = this.themeFor(s);
    const ok = k > 0 && !inTunnelZone(s, 60) && !inTunnelZone(s + 48, 60) && theme.id !== 'neon';
    this.station.visible = ok;
    this.stationS = s + 24;
    this.station.position.z = -s;
    if (ok) for (const l of this.layers) l.invalidateFrom(s - 30);
  }

  private updateSky(dt: number, playerS: number): void {
    const theme = this.to;
    for (const c of this.clouds) {
      const d = c.userData as { x: number; y: number; ds: number; v: number };
      d.x += d.v * dt;
      if (d.x > 220) d.x = -220;
      let rel = d.ds - (playerS * 0.15) % 600;
      if (rel < 0) rel += 600;
      c.position.set(d.x, d.y, -playerS - 60 - rel);
      c.visible = theme.props.clouds && this.tunnelFactor < 0.5;
      (c.material as THREE.SpriteMaterial).color.set(theme.id === 'railway' ? 0xffd9c0 : 0xffffff);
    }
    const showDrones = theme.props.drones && this.tunnelFactor < 0.5;
    this.drones.visible = showDrones;
    this.droneLights.visible = showDrones;
    if (!showDrones) return;
    const blink = Math.sin(this.time * 8) > 0 ? 1 : 0.2;
    for (let i = 0; i < this.droneData.length; i++) {
      const d = this.droneData[i];
      d.x += d.v * dt;
      if (d.x > 90) d.x = -90;
      if (d.x < -90) d.x = 90;
      let rel = d.s - (playerS * 0.6) % 320;
      if (rel < 0) rel += 320;
      const z = -playerS - 20 - rel;
      this.tmpM.compose(this.tmpV.set(d.x, d.y + Math.sin(this.time + i) * 0.5, z), this.tmpQ.identity(), this.tmpS.set(1, 1, 1));
      this.drones.setMatrixAt(i, this.tmpM);
      this.tmpM.compose(this.tmpV.set(d.x - 0.8, d.y, z), this.tmpQ, this.tmpS.set(blink, blink, blink));
      this.droneLights.setMatrixAt(i * 2, this.tmpM);
      this.tmpM.compose(this.tmpV.set(d.x + 0.8, d.y, z), this.tmpQ, this.tmpS.set(1 - blink * 0.7, 1 - blink * 0.7, 1 - blink * 0.7));
      this.droneLights.setMatrixAt(i * 2 + 1, this.tmpM);
    }
    this.drones.instanceMatrix.needsUpdate = true;
    this.droneLights.instanceMatrix.needsUpdate = true;
    if (this.droneLights.instanceColor) this.droneLights.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    for (const l of this.layers) l.dispose();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.scene.remove(this.group, this.hemi, this.sun, this.sun.target);
  }
}

const mergeBoxes = (geos: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  // Minimal merge for non-indexed-compatible boxes (all share the same attribute layout).
  const merged = new THREE.BufferGeometry();
  const attrs = ['position', 'normal', 'uv'] as const;
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : 0;
  }
  for (const a of attrs) {
    const size = geos[0].attributes[a].itemSize;
    const arr = new Float32Array(vCount * size);
    let off = 0;
    for (const g of geos) {
      arr.set(g.attributes[a].array as Float32Array, off);
      off += g.attributes[a].array.length;
    }
    merged.setAttribute(a, new THREE.BufferAttribute(arr, size));
  }
  const idx = new Uint32Array(iCount);
  let io = 0;
  let vo = 0;
  for (const g of geos) {
    const gi = g.index!;
    for (let i = 0; i < gi.count; i++) idx[io++] = gi.getX(i) + vo;
    vo += g.attributes.position.count;
    g.dispose();
  }
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  merged.computeBoundingSphere();
  return merged;
};

export { mergeBoxes };

const cloudTexture = (): THREE.Texture => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 14; i++) {
    const x = 40 + Math.random() * 176;
    const y = 50 + Math.random() * 40;
    const r = 20 + Math.random() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const glowSprite = glowTexture;

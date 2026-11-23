import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FIXED_DT, MAX_FRAME_DT, PHYSICS, SPAWN, SPEED, STUMBLE, laneX, toWorldZ, type Lane } from './constants';
import { InputManager, type InputAction } from './Input';
import { clamp, damp } from './math';
import { emptyRunStats, type CharacterLook, type EngineCallbacks, type GameState, type HudSnapshot, type ObstacleKind, type PowerUpStatus, type PowerUpType, type Quality, type RunStats, type StatKey } from './types';
import { speedAt } from '../difficulty/Difficulty';
import { classifyHit, overlaps } from '../collision/CollisionSystem';
import { ScoreSystem } from '../score/ScoreSystem';
import { PlayerController } from '../player/PlayerController';
import { createCharacter, type CharacterRig } from '../player/CharacterFactory';
import { CharacterAnimator, JUMP_CLIP } from '../player/CharacterAnimator';
import { CameraController } from '../camera/CameraController';
import { EnvironmentGenerator } from '../world/EnvironmentGenerator';
import { setTextureAnisotropy } from '../world/textures';
import { PatternGenerator } from '../obstacles/PatternGenerator';
import { ObstacleManager, type ActiveObstacle } from '../obstacles/ObstacleManager';
import { CoinManager } from '../collectibles/CoinManager';
import { PowerUpManager } from '../powerups/PowerUpManager';
import { MAGNET_RADIUS, POWER_UPS } from '../powerups/powerupDefs';
import { ParticleSystem } from '../fx/ParticleSystem';
import { SpeedLines } from '../fx/SpeedLines';
import type { PostFX } from '../fx/PostFX';
import { AudioManager } from '../../audio/AudioManager';
import { THEMES } from '../world/themes';

export interface EngineOptions {
  container: HTMLElement;
  quality: Quality;
  callbacks: EngineCallbacks;
  seed?: number;
  noObstacles?: boolean;
}

interface QualitySettings {
  pixelRatio: number;
  shadows: boolean;
  shadowMap: number;
  post: boolean;
  antialias: boolean;
  particles: number;
}

const QUALITY: Record<Quality, QualitySettings> = {
  low: { pixelRatio: 0.85, shadows: false, shadowMap: 512, post: false, antialias: false, particles: 0.5 },
  medium: { pixelRatio: 1.25, shadows: true, shadowMap: 1024, post: false, antialias: true, particles: 1 },
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, post: true, antialias: true, particles: 1 },
};

const COUNTDOWN = 3;
const DYING_TIME = 1.6;

/**
 * Owns the Three.js renderer and every gameplay system.
 * Simulation runs at a fixed 120 Hz; rendering runs at display rate.
 */
export class GameEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: CameraController;
  readonly env: EnvironmentGenerator;
  readonly obstacles: ObstacleManager;
  readonly coins: CoinManager;
  readonly powerUps: PowerUpManager;
  readonly particles: ParticleSystem;
  readonly player = new PlayerController();
  readonly score = new ScoreSystem();
  private readonly speedLines: SpeedLines;
  private postfx: PostFX | null = null;
  private rig!: CharacterRig;
  private animator!: CharacterAnimator;
  private generator!: PatternGenerator;
  private readonly input: InputManager;
  private readonly callbacks: EngineCallbacks;
  private quality: Quality;

  state: GameState = 'loading';
  private raf = 0;
  private last = 0;
  private acc = 0;
  private countdown = 0;
  private lastCountdownTick = 0;
  private dyingT = 0;
  private runTime = 0;
  private invuln = 0;
  private lastStumble = -100;
  private stats: RunStats = emptyRunStats();
  private generatedUntil = 0;
  private hudTimer = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private prevX = 0;
  private landSquash = 0;
  private maxSpeed = 0;
  private character: CharacterLook | null = null;
  private seed: number;
  private readonly noObstacles: boolean;
  private roofAcc = 0;
  private stepSoundAcc = 0;
  private runCount = 0;
  private menuMode: 'menu' | 'showcase' = 'menu';
  private readonly hud: HudSnapshot = { score: 0, coins: 0, distance: 0, speed: 0, multiplier: 1, powerUps: [], stumbleWarning: false };
  private readonly statuses: PowerUpStatus[] = [];
  private readonly tmpV = new THREE.Vector3();
  private disposed = false;
  private resizeObs: ResizeObserver | null = null;
  invincible = false;
  timeScale = 1;

  constructor(private readonly opts: EngineOptions) {
    this.callbacks = opts.callbacks;
    this.quality = opts.quality;
    this.seed = opts.seed ?? (Math.random() * 1e9) | 0;
    this.noObstacles = !!opts.noObstacles;
    const q = QUALITY[this.quality];
    this.renderer = new THREE.WebGLRenderer({ antialias: q.antialias, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = 'game-canvas';
    opts.container.appendChild(this.renderer.domElement);
    setTextureAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));

    const { clientWidth: w, clientHeight: h } = opts.container;
    this.renderer.setSize(w || window.innerWidth, h || window.innerHeight);
    this.cam = new CameraController((w || 16) / (h || 9));
    this.scene.add(this.cam.camera);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.env = new EnvironmentGenerator(this.scene, this.quality);
    this.applyShadowSettings();
    this.obstacles = new ObstacleManager(this.scene);
    this.coins = new CoinManager(this.scene);
    this.powerUps = new PowerUpManager(this.scene);
    this.powerUps.attachEffects(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.particles.scale = q.particles;
    this.speedLines = new SpeedLines(this.cam.camera);

    this.wireCallbacks();
    this.input = new InputManager(opts.container, (a) => this.handleAction(a));
    this.input.attach();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(opts.container);
  }

  /** Loads (generates) assets, compiles shaders and starts the render loop. */
  async init(look: CharacterLook, onProgress?: (p: number, label: string) => void): Promise<void> {
    onProgress?.(0.1, 'Building the city');
    this.setCharacter(look);
    this.generator = new PatternGenerator({ seed: this.seed, noObstacles: this.noObstacles });
    await nextFrame();
    onProgress?.(0.3, 'Preparing trains');
    const release = this.obstacles.prewarm();
    // Prewarm a few coins and every power-up so shader programs exist before play.
    for (let i = 0; i < 6; i++) this.coins.spawn(laneX(((i % 3) - 1) as Lane), 1, 12 + i * 2);
    (['magnet', 'jetpack', 'multiplier', 'shield'] as PowerUpType[]).forEach((t, i) => this.powerUps.spawnAt(t, (i - 1.5) * 2, 1.1, 16));
    this.env.update(0, 0, 0);
    this.coins.update(0);
    this.cam.update(0, this.cameraTarget());
    onProgress?.(0.55, 'Compiling shaders');
    await nextFrame();
    try {
      await this.renderer.compileAsync(this.scene, this.cam.camera);
    } catch {
      this.renderer.compile(this.scene, this.cam.camera);
    }
    this.renderer.render(this.scene, this.cam.camera);
    release();
    this.coins.clear();
    this.powerUps.clear();
    onProgress?.(0.75, 'Tuning engines');
    if (QUALITY[this.quality].post) await this.enablePost(true);
    this.setState('menu');
    this.resetWorld();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    onProgress?.(1, 'Ready');
  }

  // ---------------------------------------------------------------- setup ---

  private wireCallbacks(): void {
    this.coins.onCollect = (x, y, s) => {
      this.particles.emit(x, y, toWorldZ(s), { count: 8, color: 0xffd23f, color2: 0xfff6b0, speed: 4, life: 0.4, size: 0.18, gravity: 2 });
      AudioManager.play('coin', { rate: 1 + Math.min(0.25, (this.stats.coins % 10) * 0.025) });
      this.animator.overlay('collect', 0.8);
    };
    this.powerUps.onPickup = (type, x, y, s) => {
      this.particles.emit(x, y, toWorldZ(s), { count: 40, color: POWER_UPS[type].color, color2: 0xffffff, speed: 7, life: 0.7, size: 0.3 });
      AudioManager.play('powerup');
      this.bumpStat('powerUps', 1);
      if (type === 'jetpack') this.startJetpack();
      if (type === 'multiplier') this.score.powerUpActive = true;
      this.callbacks.onEvent?.({ type: 'powerUp', powerUp: type });
    };
    this.powerUps.onExpire = (type) => {
      if (type === 'jetpack') this.endJetpack();
      if (type === 'multiplier') this.score.powerUpActive = false;
    };
    this.obstacles.onTrainActivated = (o) => {
      const dist = o.box.minS - this.player.s;
      if (dist < 200) AudioManager.play('horn', { volume: 0.7 });
    };
  }

  private applyShadowSettings(): void {
    const q = QUALITY[this.quality];
    this.renderer.shadowMap.enabled = q.shadows;
    this.env.sun.castShadow = q.shadows;
    this.env.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    if (this.env.sun.shadow.map) {
      this.env.sun.shadow.map.dispose();
      this.env.sun.shadow.map = null;
    }
  }

  private async enablePost(on: boolean): Promise<void> {
    if (on && !this.postfx) {
      const { PostFX } = await import('../fx/PostFX');
      this.postfx = new PostFX(this.renderer, this.scene, this.cam.camera);
      const size = this.renderer.getSize(new THREE.Vector2());
      this.postfx.setSize(size.x, size.y, this.renderer.getPixelRatio());
    } else if (!on && this.postfx) {
      this.postfx.dispose();
      this.postfx = null;
    }
  }

  async setQuality(q: Quality): Promise<void> {
    if (q === this.quality) return;
    this.quality = q;
    const s = QUALITY[q];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.pixelRatio));
    this.applyShadowSettings();
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
      else if (m) m.needsUpdate = true;
    });
    this.particles.scale = s.particles;
    this.env.setQuality(q);
    await this.enablePost(s.post);
    this.resize();
  }

  setCharacter(look: CharacterLook): void {
    if (this.character && this.character.id === look.id && this.character.skin === look.skin && this.rig) return;
    const prevPos = this.rig?.root.position.clone();
    if (this.rig) {
      this.powerUps.jetpackModel.removeFromParent();
      this.animator.dispose();
      this.rig.dispose();
    }
    this.character = look;
    this.rig = createCharacter(look);
    this.animator = new CharacterAnimator(this.rig);
    this.scene.add(this.rig.root);
    if (prevPos) this.rig.root.position.copy(prevPos);
    const jp = this.powerUps.jetpackModel;
    jp.position.set(0, 0.05, 0.28);
    jp.rotation.set(0, Math.PI, 0);
    this.rig.bones.Chest.add(jp);
    if (this.state === 'menu') this.animator.play(this.menuMode === 'showcase' ? 'victory' : 'idle', 0);
  }

  setPowerUpLevels(levels: Record<PowerUpType, number>): void {
    this.powerUps.levels = { ...levels };
  }

  setInputSensitivity(v: number): void {
    this.input.sensitivity = v;
  }

  setShake(on: boolean): void {
    this.cam.shakeEnabled = on;
  }

  /** 'menu' frames the runner idling; 'showcase' frames them for character selection. */
  setMenuMode(mode: 'menu' | 'showcase'): void {
    this.menuMode = mode;
    if (this.state !== 'menu') return;
    this.cam.mode = mode;
    this.animator.play(mode === 'showcase' ? 'victory' : 'idle', 0.25);
  }

  /** Celebrate (e.g. a new high score) while the game-over panel is up. */
  celebrate(): void {
    if (this.state === 'gameover') {
      this.animator.play('victory', 0.3);
      this.particles.emit(this.player.x, this.player.y + 2, toWorldZ(this.player.s), { count: 60, color: 0xffd23f, color2: 0xff2fb4, speed: 8, life: 1.2, size: 0.3, gravity: 4 });
    }
  }

  // ---------------------------------------------------------------- flow ----

  private setState(s: GameState): void {
    if (this.state === s) return;
    this.state = s;
    this.input.enabled = s === 'running' || s === 'countdown';
    this.callbacks.onState?.(s);
  }

  private resetWorld(): void {
    this.obstacles.clear();
    this.coins.clear();
    this.powerUps.clear();
    this.particles.clear();
    AudioManager.stopAllLoops();
    this.player.reset();
    this.env.reset(0);
    this.generatedUntil = 0;
    this.generator = new PatternGenerator({ seed: this.seed + this.runCount * 7919, noObstacles: this.noObstacles });
    this.rig.root.position.set(0, 0, 0);
    this.rig.body.rotation.set(0, 0, 0);
    this.rig.root.rotation.set(0, 0, 0);
    this.powerUps.jetpackModel.visible = false;
    this.cam.mode = this.menuMode;
    this.cam.snap();
    this.animator.play(this.menuMode === 'showcase' ? 'victory' : 'idle', 0);
  }

  /** Starts a new run with a 3-2-1 countdown. */
  startRun(baseMultiplier = 1): void {
    this.runCount++;
    this.resetWorld();
    this.score.reset(baseMultiplier);
    this.stats = emptyRunStats();
    this.runTime = 0;
    this.invuln = 0;
    this.lastStumble = -100;
    this.maxSpeed = SPEED.start;
    this.acc = 0;
    this.roofAcc = 0;
    this.ensureContent();
    this.cam.mode = 'run';
    this.countdown = COUNTDOWN;
    this.lastCountdownTick = COUNTDOWN + 1;
    this.animator.play('idle', 0.2);
    this.setState('countdown');
    this.emitHud();
    void AudioManager.playMusic('modern');
  }

  pause(): void {
    if (this.state !== 'running' && this.state !== 'countdown') return;
    this.setState('paused');
    AudioManager.stopLoop('jetpack');
    AudioManager.pauseMusic(true);
  }

  resume(): void {
    if (this.state !== 'paused') return;
    // Short countdown on resume so the player can re-orient.
    this.countdown = Math.min(COUNTDOWN, 2);
    this.lastCountdownTick = 3;
    this.setState('countdown');
    AudioManager.pauseMusic(false);
    if (this.player.jetpack) AudioManager.startLoop('jetpack', 'jetpack', 0.4);
  }

  quitToMenu(): void {
    this.setState('menu');
    this.resetWorld();
    void AudioManager.playMusic('menu');
  }

  private handleAction(a: InputAction): void {
    if (a === 'pause') {
      if (this.state === 'running' || this.state === 'countdown') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (this.state !== 'running') return;
    this.player.input(a);
  }

  /** Public entry for on-screen controls / tests. */
  action(a: InputAction): void {
    this.handleAction(a);
  }

  addBonus(points: number): void {
    if (this.state === 'running' || this.state === 'countdown') this.score.addBonus(points);
  }

  // -------------------------------------------------------------- content ---

  private ensureContent(): void {
    const need = this.player.s + SPAWN.ahead;
    if (need <= this.generatedUntil) return;
    const until = need + 30;
    const chunk = this.generator.generateUntil(until);
    this.generatedUntil = until;
    for (const o of chunk.obstacles) this.obstacles.spawn(o);
    for (const c of chunk.coins) this.coins.spawn(laneX(c.lane), c.y, c.s);
    for (const p of chunk.powerUps) this.powerUps.spawn(p);
  }

  private startJetpack(): void {
    this.player.setJetpack(true);
    this.bumpStat('jetpacks', 1);
    const st = this.powerUps.timers.get('jetpack');
    const dur = st?.duration ?? 6;
    const speed = speedAt(this.player.s);
    this.coins.spawnTrail(this.player.s + 14, this.player.s + speed * (dur - 0.6), 7.2 - 0.9);
    AudioManager.startLoop('jetpack', 'jetpack', 0.4);
    this.powerUps.jetpackModel.visible = true;
  }

  private endJetpack(): void {
    this.player.setJetpack(false);
    const speed = speedAt(this.player.s);
    // Fair landing zone: nothing to crash into while descending.
    this.obstacles.clearRange(this.player.s - 2, this.player.s + speed * 1.7);
    this.invuln = Math.max(this.invuln, 1.2);
    AudioManager.stopLoop('jetpack');
    this.powerUps.jetpackModel.visible = false;
  }

  // ------------------------------------------------------------- simulate ---

  private bumpStat(key: StatKey, amount: number): void {
    (this.stats[key] as number) += amount;
    this.callbacks.onStat?.(key, amount, this.stats[key] as number);
  }

  private fixedStep(dt: number): void {
    const p = this.player;
    const prevS = p.s;
    const speed = speedAt(p.s);
    this.runTime += dt;
    if (speed > this.maxSpeed) this.maxSpeed = speed;
    if (!this.stats.maxSpeedReached && speed >= SPEED.max - 0.5) this.stats.maxSpeedReached = true;

    p.step(dt, speed, this.obstacles.groundAt);
    this.handlePlayerEvents();
    this.obstacles.step(dt, p.s);
    if (this.invuln > 0) this.invuln -= dt;
    this.checkCollisions();
    if (this.state !== 'running') return;

    const magnet = this.powerUps.isActive('magnet') || p.jetpack ? MAGNET_RADIUS * (p.jetpack ? 0.6 : 1) : 0;
    const got = this.coins.step(dt, { x: p.x, y: p.y, s: p.s, height: p.height }, magnet);
    if (got) {
      this.score.addCoins(got);
      this.bumpStat('coins', got);
    }
    this.powerUps.step(dt, p.x, p.y, p.s, p.height);
    this.score.addDistance(p.s - prevS);

    if (p.grounded && p.y > 2) {
      this.roofAcc += p.s - prevS;
      if (this.roofAcc >= 10) {
        this.bumpStat('roofDistance', Math.floor(this.roofAcc));
        this.roofAcc -= Math.floor(this.roofAcc);
      }
    }
    for (const o of this.obstacles.active) {
      if (!o.passed && !o.smashed && o.box.maxS < p.s - 1 && o.spec.kind !== 'ramp') {
        o.passed = true;
        this.bumpStat('dodged', 1);
      }
    }
    this.ensureContent();
  }

  private handlePlayerEvents(): void {
    const p = this.player;
    for (const ev of p.events) {
      switch (ev.type) {
        case 'jump':
          this.bumpStat('jumps', 1);
          AudioManager.play('jump', { rate: 0.95 + Math.random() * 0.1 });
          this.particles.emit(p.x, p.y + 0.05, toWorldZ(p.s), { count: 10, color: 0xd8d0c0, speed: 2.5, life: 0.35, size: 0.22, dir: [0, 0.4, 0.6] });
          break;
        case 'land':
          if (ev.impact > 4) {
            AudioManager.play('land', { volume: Math.min(1, ev.impact / 14) });
            this.particles.emit(p.x, p.y + 0.05, toWorldZ(p.s), { count: Math.round(6 + ev.impact), color: 0xcfc7b8, speed: 3, life: 0.4, size: 0.25, dir: [0, 0.2, 0.5] });
            this.landSquash = Math.min(0.22, ev.impact / 60);
            if (ev.impact > 15) this.cam.addTrauma(0.15);
          }
          break;
        case 'slide':
          this.bumpStat('slides', 1);
          AudioManager.play('slide');
          break;
        case 'lane':
          this.bumpStat('laneChanges', 1);
          AudioManager.play('lane', { rate: ev.dir > 0 ? 1.1 : 0.95 });
          this.animator.overlay(ev.dir > 0 ? 'dodgeRight' : 'dodgeLeft');
          break;
        case 'laneBlocked':
          this.animator.overlay(ev.dir > 0 ? 'dodgeRight' : 'dodgeLeft', 0.5);
          break;
        default:
          break;
      }
    }
    p.events.length = 0;
  }

  private checkCollisions(): void {
    const p = this.player;
    if (p.jetpack) return;
    for (const o of this.obstacles.active) {
      if (o.smashed) continue;
      if (o.box.maxS < p.s - 2 || o.box.minS > p.s + 2) continue;
      if (!overlaps(p.box, o.box)) continue;
      if (o.spec.walkable) {
        const top = this.obstacles.topAt(o, p.s);
        if (p.y >= top - PHYSICS.stepUp - 0.01) continue;
      }
      const hit = classifyHit(p.prevBox, p.box, o.prevBox, o.box);
      if (hit === 'none' || hit === 'top') continue;
      if (hit === 'side') {
        if (o.hitCooldown > 0) continue;
        o.hitCooldown = 0.6;
        this.stumble();
        if (this.state !== 'running') return;
        continue;
      }
      if (this.invuln > 0 || this.invincible) continue;
      this.crash(o);
      if (this.state !== 'running') return;
    }
  }

  private stumble(): void {
    const p = this.player;
    p.bounceBack();
    AudioManager.play('stumble');
    this.animator.overlay('stumble');
    this.cam.addTrauma(0.35);
    this.particles.emit(p.x, p.y + 1, toWorldZ(p.s), { count: 14, color: 0xffffff, speed: 4, life: 0.35, size: 0.18 });
    this.callbacks.onEvent?.({ type: 'stumble' });
    if (this.runTime - this.lastStumble < STUMBLE.window && !this.invincible) {
      this.die();
      return;
    }
    this.lastStumble = this.runTime;
  }

  private crash(o: ActiveObstacle): void {
    const p = this.player;
    if (this.powerUps.isActive('shield')) {
      this.powerUps.consume('shield');
      this.obstacles.smash(o);
      this.invuln = 1.0;
      this.bumpStat('shieldsBroken', 1);
      AudioManager.play('shieldBreak');
      this.cam.addTrauma(0.45);
      this.particles.emit(p.x, p.y + 1, toWorldZ(p.s + 1), { count: 70, color: 0x4fd8ff, color2: 0xffffff, speed: 9, life: 0.8, size: 0.28, gravity: 6 });
      this.particles.emit(laneX(o.spec.lane), 1, toWorldZ(o.box.minS), { count: 40, color: 0x9a7b5a, color2: 0x555555, speed: 8, life: 0.9, size: 0.35, gravity: 14, dir: [0, 0.6, -0.4] });
      this.callbacks.onEvent?.({ type: 'shieldBreak' });
      return;
    }
    this.die();
  }

  private die(): void {
    const p = this.player;
    this.setState('dying');
    this.dyingT = 0;
    AudioManager.stopAllLoops();
    AudioManager.play('crash');
    this.cam.addTrauma(0.8);
    this.cam.mode = 'death';
    this.animator.play('death', 0.08);
    this.powerUps.jetpackModel.visible = false;
    this.particles.emit(p.x, p.y + 1, toWorldZ(p.s + 0.6), { count: 60, color: 0xffa040, color2: 0xffffff, speed: 8, life: 0.7, size: 0.3, gravity: 6 });
    this.callbacks.onEvent?.({ type: 'crash' });
    this.emitHud();
  }

  private finishRun(): void {
    this.setState('gameover');
    AudioManager.play('gameover');
    void AudioManager.playMusic('menu');
    this.callbacks.onRunEnd?.({
      score: this.score.score,
      coins: this.score.coins,
      distance: Math.floor(this.score.distance),
      durationMs: Math.round(this.runTime * 1000),
      character: this.character?.id ?? 'rio',
      maxSpeed: this.maxSpeed,
      stats: { ...this.stats, themesVisited: this.env.themeIndex + 1 },
    });
  }

  // -------------------------------------------------------------- frame -----

  private frame = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(MAX_FRAME_DT, dt) * this.timeScale;

    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.callbacks.onEvent?.({ type: 'fps', fps: Math.round(this.fpsFrames / this.fpsTime) });
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    if (this.state === 'countdown') {
      this.countdown -= dt;
      const tick = Math.ceil(this.countdown);
      if (tick !== this.lastCountdownTick) {
        this.lastCountdownTick = tick;
        if (tick > 0) {
          AudioManager.play('beep');
          this.callbacks.onCountdown?.(tick);
        }
      }
      if (this.countdown <= 0) {
        AudioManager.play('go');
        this.callbacks.onCountdown?.(0);
        this.setState('running');
        this.acc = 0;
      }
    } else if (this.state === 'running') {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= FIXED_DT && steps < 14) {
        this.fixedStep(FIXED_DT);
        this.acc -= FIXED_DT;
        steps++;
        if (this.state !== 'running') break;
      }
      if (steps >= 14) this.acc = 0;
    } else if (this.state === 'dying') {
      this.dyingT += dt;
      if (this.dyingT >= DYING_TIME) this.finishRun();
    }

    this.updateVisuals(dt);
    this.render(dt);

    if (this.state === 'running' || this.state === 'dying') {
      this.hudTimer += dt;
      if (this.hudTimer > 1 / 15) {
        this.hudTimer = 0;
        this.emitHud();
      }
    }
  };

  private cameraTarget(): { x: number; y: number; s: number; groundY: number; jetpack: boolean; speedFrac: number } {
    const p = this.player;
    const sf = clamp((speedAt(p.s) - SPEED.start) / (SPEED.max - SPEED.start), 0, 1);
    return { x: p.x, y: p.y, s: p.s, groundY: p.grounded ? p.y : p.groundY, jetpack: p.jetpack, speedFrac: this.state === 'running' ? sf : 0 };
  }

  private updateVisuals(dt: number): void {
    const p = this.player;
    const running = this.state === 'running';
    const speed = speedAt(p.s);
    const rig = this.rig;
    rig.root.position.set(p.x, p.y, toWorldZ(p.s));

    // Animation state selection.
    if (this.state === 'running') {
      if (p.jetpack) {
        this.animator.play('run', 0.2, 0.55);
      } else if (p.sliding) {
        this.animator.play('slide', 0.06);
      } else if (!p.grounded && p.airTime > 0.02) {
        this.animator.play('jump', 0.08, JUMP_CLIP / 0.73);
      } else {
        this.animator.play('run', 0.1, clamp(speed / 14, 1, 1.55));
        this.animator.setTimeScale('run', clamp(speed / 14, 1, 1.55));
      }
    } else if (this.state === 'countdown' && this.countdown < 0.35) {
      this.animator.play('run', 0.3, 1);
    }

    // Procedural lean into lane changes + landing squash.
    const vx = dt > 0 ? (p.x - this.prevX) / dt : 0;
    this.prevX = p.x;
    const lean = running ? clamp(-vx * 0.022, -0.35, 0.35) : 0;
    rig.body.rotation.z += (lean - rig.body.rotation.z) * damp(14, dt);
    rig.body.rotation.y += ((running ? -vx * 0.01 : 0) - rig.body.rotation.y) * damp(10, dt);
    rig.body.rotation.x = p.jetpack ? -0.35 : 0;
    this.landSquash = Math.max(0, this.landSquash - dt * 1.2);
    rig.body.scale.set(1 + this.landSquash * 0.6, 1 - this.landSquash, 1 + this.landSquash * 0.6);

    if (this.state !== 'paused') this.animator.update(dt);

    // Running footsteps.
    if (running && p.grounded && !p.sliding) {
      this.stepSoundAcc += dt * clamp(speed / 14, 1, 1.55);
      if (this.stepSoundAcc > 0.31) {
        this.stepSoundAcc = 0;
        AudioManager.play('step', { volume: 0.35, rate: 0.9 + Math.random() * 0.2 });
      }
    }

    // Jetpack flames / multiplier sparkles.
    if (p.jetpack && this.state === 'running') {
      this.powerUps.jetpackModel.getWorldPosition(this.tmpV);
      this.particles.emit(this.tmpV.x, this.tmpV.y - 0.45, this.tmpV.z + 0.15, { count: 3, color: 0xffa21a, color2: 0xff3b00, speed: 3, life: 0.35, size: 0.32, dir: [0, -1, 0.6], spread: 0.3 });
    }
    if (this.score.powerUpActive && running && Math.random() < 0.3) {
      this.particles.emit(p.x + (Math.random() - 0.5), p.y + Math.random() * 1.8, toWorldZ(p.s), { count: 1, color: 0x9dff3b, speed: 1, life: 0.5, size: 0.15 });
    }

    const tgt = this.cameraTarget();
    this.speedLines.intensity = running ? (p.jetpack ? 1 : clamp((tgt.speedFrac - 0.45) * 1.8, 0, 1)) : 0;
    this.speedLines.update(dt, running ? speed : 0);
    this.cam.update(dt, tgt);
    this.env.update(dt, p.s, p.x);
    if (this.state !== 'paused') {
      this.obstacles.update(dt, p.s, SPAWN.behind);
      this.coins.update(dt);
      this.powerUps.update(dt, rig.root);
      this.particles.update(dt);
    }
  }

  private render(dt: number): void {
    if (this.postfx) {
      this.postfx.bloomStrength = this.env.bloomStrength;
      this.postfx.motionBlur = this.state === 'running' ? this.speedLines.intensity * 0.9 : 0;
      this.postfx.render(dt);
    } else {
      this.renderer.render(this.scene, this.cam.camera);
    }
  }

  private emitHud(): void {
    const h = this.hud;
    h.score = this.score.score;
    h.coins = this.score.coins;
    h.distance = Math.floor(this.score.distance);
    h.speed = Math.round(speedAt(this.player.s) * 3.6);
    h.multiplier = this.score.multiplier;
    h.powerUps = this.powerUps.statuses(this.statuses).slice();
    h.stumbleWarning = this.runTime - this.lastStumble < STUMBLE.window;
    this.callbacks.onHud?.({ ...h });
  }

  private resize(): void {
    const w = this.opts.container.clientWidth || window.innerWidth;
    const h = this.opts.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.cam.camera.aspect = w / h;
    // Keep the horizontal field of view usable on tall/narrow screens.
    this.cam.camera.updateProjectionMatrix();
    this.postfx?.setSize(w, h, this.renderer.getPixelRatio());
    this.particles.setViewportHeight(h * this.renderer.getPixelRatio());
  }

  private onVisibility = (): void => {
    if (document.hidden) this.pause();
  };

  // ------------------------------------------------------------- testing ----

  /** Snapshot of internal state for automated tests and debugging. */
  debugState(): Record<string, unknown> {
    const p = this.player;
    return {
      state: this.state,
      s: p.s,
      x: p.x,
      y: p.y,
      lane: p.lane,
      grounded: p.grounded,
      sliding: p.sliding,
      jetpack: p.jetpack,
      speed: speedAt(p.s),
      score: this.score.score,
      coins: this.score.coins,
      distance: this.score.distance,
      multiplier: this.score.multiplier,
      obstacles: this.obstacles.active.length,
      coinCount: this.coins.count,
      powerUps: [...this.powerUps.timers.keys()],
      theme: THEMES[this.env.themeIndex % THEMES.length].id,
      stats: { ...this.stats },
      character: this.character?.id,
    };
  }

  debugClearObstacles(): void {
    this.obstacles.clear();
  }

  debugSpawnObstacle(kind: ObstacleKind, lane: Lane, ahead: number): void {
    this.obstacles.spawnAt(kind, lane, this.player.s + ahead);
  }

  debugSpawnCoins(lane: Lane, ahead: number, count: number): void {
    for (let i = 0; i < count; i++) this.coins.spawn(laneX(lane), 1, this.player.s + ahead + i * 2);
  }

  debugSpawnPowerUp(type: PowerUpType, lane: Lane, ahead: number): void {
    this.powerUps.spawnAt(type, laneX(lane), 1.1, this.player.s + ahead);
  }

  /** Stops generating new obstacles (content already spawned stays). */
  debugDisableGeneration(): void {
    this.generatedUntil = Number.POSITIVE_INFINITY;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObs?.disconnect();
    AudioManager.stopAllLoops();
    this.postfx?.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

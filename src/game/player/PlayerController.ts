import { JETPACK, LANES, PHYSICS, PLAYER_DIMS, laneX, type Lane } from '../engine/constants';
import { clamp, easeOutCubic } from '../engine/math';
import type { Box } from '../collision/CollisionSystem';

export type PlayerAction = 'left' | 'right' | 'jump' | 'slide';

export type PlayerEvent =
  | { type: 'jump' }
  | { type: 'land'; impact: number }
  | { type: 'slide' }
  | { type: 'slideEnd' }
  | { type: 'lane'; dir: -1 | 1 }
  | { type: 'laneBlocked'; dir: -1 | 1 };

/** Returns the walkable ground height under the runner (0 = track). */
export type GroundProbe = (x: number, halfWidth: number, s: number, feetY: number) => number;

/**
 * Pure runner kinematics in track space. No rendering here, so it is unit
 * tested directly and always stepped at a fixed rate by the engine.
 */
export class PlayerController {
  lane: Lane = 0;
  private laneFrom = 0;
  private laneT = 1;
  private prevLane: Lane = 0;
  x = 0;
  y = 0;
  vy = 0;
  s = 0;
  grounded = true;
  groundY = 0;
  sliding = false;
  slideTimer = 0;
  private slidePending = false;
  private jumpBuffer = 0;
  private coyote = 0;
  jetpack = false;
  private jetT = 0;
  /** Seconds since takeoff (for the animation time scale). */
  airTime = 0;
  readonly events: PlayerEvent[] = [];
  private readonly queue: PlayerAction[] = [];

  readonly prevBox: Box = { minX: 0, maxX: 0, minY: 0, maxY: 0, minS: 0, maxS: 0 };
  readonly box: Box = { minX: 0, maxX: 0, minY: 0, maxY: 0, minS: 0, maxS: 0 };

  reset(): void {
    this.lane = 0;
    this.prevLane = 0;
    this.laneFrom = 0;
    this.laneT = 1;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.s = 0;
    this.grounded = true;
    this.groundY = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.slidePending = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.jetpack = false;
    this.jetT = 0;
    this.airTime = 0;
    this.events.length = 0;
    this.queue.length = 0;
    this.computeBox(this.box);
    this.computeBox(this.prevBox);
  }

  get height(): number {
    return this.sliding ? PLAYER_DIMS.slideHeight : PLAYER_DIMS.height;
  }

  /** Inputs are queued and consumed on the next fixed step (no frame-rate dependence). */
  input(action: PlayerAction): void {
    if (this.queue.length < 3) this.queue.push(action);
  }

  setJetpack(on: boolean): void {
    if (on === this.jetpack) return;
    this.jetpack = on;
    this.jetT = 0;
    if (on) {
      this.sliding = false;
      this.slidePending = false;
      this.grounded = false;
      this.vy = 0;
    } else {
      this.vy = 0;
    }
  }

  /** Bounce back to the lane we came from after a side collision. */
  bounceBack(): void {
    const back = this.prevLane;
    if (back === this.lane) return;
    this.laneFrom = this.x;
    this.lane = back;
    this.laneT = 0;
  }

  private changeLane(dir: -1 | 1): void {
    const target = clamp(this.lane + dir, -1, 1) as Lane;
    if (target === this.lane) {
      this.events.push({ type: 'laneBlocked', dir });
      return;
    }
    this.prevLane = this.lane;
    this.laneFrom = this.x;
    this.lane = target;
    this.laneT = 0;
    this.events.push({ type: 'lane', dir });
  }

  private doJump(): void {
    this.vy = PHYSICS.jumpVelocity;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.airTime = 0;
    if (this.sliding) {
      this.sliding = false;
      this.slideTimer = 0;
    }
    this.slidePending = false;
    this.events.push({ type: 'jump' });
  }

  private startSlide(): void {
    this.sliding = true;
    this.slideTimer = PHYSICS.slideDuration;
    this.slidePending = false;
    this.events.push({ type: 'slide' });
  }

  private consumeInputs(): void {
    while (this.queue.length) {
      const a = this.queue.shift()!;
      if (a === 'left') this.changeLane(-1);
      else if (a === 'right') this.changeLane(1);
      else if (this.jetpack) continue;
      else if (a === 'jump') {
        if (this.grounded || this.coyote > 0) this.doJump();
        else this.jumpBuffer = PHYSICS.jumpBuffer;
      } else if (a === 'slide') {
        if (this.grounded) this.startSlide();
        else {
          // Slam down quickly and slide on landing.
          this.vy = Math.min(this.vy, PHYSICS.fastFallVelocity);
          this.slidePending = true;
          this.jumpBuffer = 0;
        }
      }
    }
  }

  step(dt: number, speed: number, probe: GroundProbe): void {
    this.copyBox(this.box, this.prevBox);
    this.consumeInputs();

    this.s += speed * dt;

    // Lateral movement: eased, fixed-duration lane change.
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / PHYSICS.laneChangeTime);
      this.x = this.laneFrom + (laneX(this.lane) - this.laneFrom) * easeOutCubic(this.laneT);
    } else this.x = laneX(this.lane);

    if (this.jetpack) {
      this.jetT += dt;
      const target = JETPACK.altitude;
      this.y += (target - this.y) * Math.min(1, dt * 4);
      this.vy = 0;
      this.grounded = false;
    } else {
      const ground = probe(this.x, PLAYER_DIMS.halfWidth, this.s, this.y);
      this.groundY = ground;
      if (this.grounded) {
        if (ground < this.y - 0.02) {
          // Ran off an edge (train roof end / ramp top).
          this.grounded = false;
          this.coyote = PHYSICS.coyoteTime;
          this.vy = 0;
        } else this.y = ground;
      }
      if (!this.grounded) {
        this.airTime += dt;
        this.vy -= PHYSICS.gravity * dt;
        this.y += this.vy * dt;
        if (this.y <= ground) {
          const impact = -this.vy;
          this.y = ground;
          this.vy = 0;
          this.grounded = true;
          this.events.push({ type: 'land', impact });
          if (this.jumpBuffer > 0) this.doJump();
          else if (this.slidePending) this.startSlide();
        }
      }
      this.coyote = Math.max(0, this.coyote - dt);
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.sliding = false;
        this.events.push({ type: 'slideEnd' });
      }
    }
    this.computeBox(this.box);
  }

  computeBox(out: Box): void {
    out.minX = this.x - PLAYER_DIMS.halfWidth;
    out.maxX = this.x + PLAYER_DIMS.halfWidth;
    out.minY = this.y;
    out.maxY = this.y + this.height;
    out.minS = this.s - PLAYER_DIMS.halfDepth;
    out.maxS = this.s + PLAYER_DIMS.halfDepth;
  }

  private copyBox(a: Box, b: Box): void {
    b.minX = a.minX;
    b.maxX = a.maxX;
    b.minY = a.minY;
    b.maxY = a.maxY;
    b.minS = a.minS;
    b.maxS = a.maxS;
  }

  get laneProgress(): number {
    return this.laneT;
  }

  get validLanes(): readonly Lane[] {
    return LANES;
  }
}

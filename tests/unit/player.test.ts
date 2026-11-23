import { describe, expect, it } from 'vitest';
import { PlayerController, type GroundProbe } from '../../src/game/player/PlayerController';
import { FIXED_DT, LANE_WIDTH, PHYSICS, PLAYER_DIMS } from '../../src/game/engine/constants';

const flat = () => 0;
const steps = (p: PlayerController, seconds: number, speed = 14, probe: GroundProbe = flat) => {
  const n = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < n; i++) p.step(FIXED_DT, speed, probe);
};

describe('PlayerController', () => {
  it('runs forward automatically', () => {
    const p = new PlayerController();
    p.reset();
    steps(p, 1, 14);
    expect(p.s).toBeCloseTo(14, 1);
  });

  it('changes lane smoothly within the lane-change time and clamps at the edges', () => {
    const p = new PlayerController();
    p.reset();
    p.input('right');
    p.step(FIXED_DT, 14, flat);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(LANE_WIDTH);
    steps(p, PHYSICS.laneChangeTime);
    expect(p.x).toBeCloseTo(LANE_WIDTH, 5);
    p.input('right');
    steps(p, 0.3);
    expect(p.lane).toBe(1);
    expect(p.events.some((e) => e.type === 'laneBlocked')).toBe(true);
    p.input('left');
    p.input('left');
    steps(p, 0.4);
    expect(p.lane).toBe(-1);
    expect(p.x).toBeCloseTo(-LANE_WIDTH, 5);
  });

  it('jumps in a natural arc (~1.86 m peak, ~0.73 s airtime)', () => {
    const p = new PlayerController();
    p.reset();
    p.input('jump');
    let peak = 0;
    let t = 0;
    do {
      p.step(FIXED_DT, 14, flat);
      t += FIXED_DT;
      peak = Math.max(peak, p.y);
    } while (!p.grounded && t < 2);
    expect(peak).toBeGreaterThan(1.75);
    expect(peak).toBeLessThan(1.95);
    expect(t).toBeGreaterThan(0.68);
    expect(t).toBeLessThan(0.8);
    expect(p.events.some((e) => e.type === 'land')).toBe(true);
  });

  it('slides for the slide duration with a lower hitbox', () => {
    const p = new PlayerController();
    p.reset();
    p.input('slide');
    p.step(FIXED_DT, 14, flat);
    expect(p.sliding).toBe(true);
    expect(p.box.maxY - p.box.minY).toBeCloseTo(PLAYER_DIMS.slideHeight);
    steps(p, PHYSICS.slideDuration);
    expect(p.sliding).toBe(false);
    expect(p.box.maxY - p.box.minY).toBeCloseTo(PLAYER_DIMS.height);
  });

  it('slide in the air slams down and slides on landing; jump cancels a slide', () => {
    const p = new PlayerController();
    p.reset();
    p.input('jump');
    steps(p, 0.2);
    p.input('slide');
    steps(p, 0.15);
    expect(p.grounded).toBe(true);
    expect(p.sliding).toBe(true);
    p.input('jump');
    p.step(FIXED_DT, 14, flat);
    expect(p.sliding).toBe(false);
    expect(p.vy).toBeGreaterThan(0);
  });

  it('buffers a jump pressed just before landing', () => {
    const p = new PlayerController();
    p.reset();
    p.input('jump');
    steps(p, 0.66);
    expect(p.grounded).toBe(false);
    p.input('jump');
    steps(p, 0.1);
    expect(p.vy).toBeGreaterThan(0); // jumped again right after touching down
  });

  it('lands on and walks along platforms reported by the ground probe', () => {
    const p = new PlayerController();
    p.reset();
    // A 1.5 m platform from s=5 to s=15.
    const probe = (_x: number, _hw: number, s: number, feet: number) => (s >= 5 && s <= 15 && 1.5 <= feet + PHYSICS.stepUp ? 1.5 : 0);
    p.input('jump');
    steps(p, 0.6, 14, probe);
    expect(p.y).toBeCloseTo(1.5, 2);
    expect(p.grounded).toBe(true);
    steps(p, 0.5, 14, probe);
    expect(p.grounded).toBe(false); // ran off the end
    steps(p, 0.6, 14, probe);
    expect(p.y).toBe(0);
  });

  it('bounces back to the previous lane after a side hit', () => {
    const p = new PlayerController();
    p.reset();
    p.input('right');
    steps(p, 0.05);
    p.bounceBack();
    steps(p, 0.3);
    expect(p.lane).toBe(0);
    expect(p.x).toBeCloseTo(0, 5);
  });

  it('is frame-rate independent (fixed timestep accumulator)', () => {
    const simulate = (frameDt: number) => {
      const p = new PlayerController();
      p.reset();
      let acc = 0;
      let time = 0;
      let jumped = false;
      while (time < 2) {
        acc += frameDt;
        time += frameDt;
        if (!jumped && time >= 0.5) {
          p.input('jump');
          jumped = true;
        }
        while (acc >= FIXED_DT) {
          p.step(FIXED_DT, 20, flat);
          acc -= FIXED_DT;
        }
      }
      return p;
    };
    const a = simulate(1 / 30);
    const b = simulate(1 / 144);
    expect(Math.abs(a.s - b.s)).toBeLessThan(20 * (1 / 30) + 1e-6);
    expect(a.grounded).toBe(b.grounded);
  });

  it('flies at altitude with the jetpack and ignores jump/slide', () => {
    const p = new PlayerController();
    p.reset();
    p.setJetpack(true);
    steps(p, 2);
    expect(p.y).toBeGreaterThan(6.5);
    p.input('slide');
    steps(p, 0.1);
    expect(p.sliding).toBe(false);
    p.setJetpack(false);
    steps(p, 1.2);
    expect(p.y).toBe(0);
  });
});

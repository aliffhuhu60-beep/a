import { GameEngine } from '../game/engine/GameEngine';
import type { HudSnapshot, RunResult, StatKey } from '../game/engine/types';
import { lookFor } from '../data/characters';
import { missionLabel } from '../data/missions';
import { SCORE_RULES } from '../game/score/ScoreSystem';
import { AudioManager } from '../audio/AudioManager';
import { leaderboardService } from '../services/leaderboardService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { useGame } from './gameStore';
import { useProgress } from './progressStore';
import { useSettings } from './settingsStore';
import { useAuth } from './authStore';
import type { MissionUpdate } from './progressLogic';

let engine: GameEngine | null = null;
let lastRunValues = 0;

export const getEngine = (): GameEngine | null => engine;

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const isTestMode = params.has('e2e') || import.meta.env.DEV;

const handleMissions = (u: MissionUpdate): void => {
  const game = useGame.getState();
  for (const m of u.completed) {
    game.toast({ icon: '✅', title: 'Mission complete!', text: `${missionLabel(m)} · +${m.reward} coins` });
    engine?.addBonus(SCORE_RULES.missionBonus);
    AudioManager.play('achievement');
  }
  if (u.setCompleted) {
    game.toast({ icon: '🔥', title: 'Daily set complete!', text: `Score multiplier is now x${u.progress.missionMultiplier}` });
  }
};

const onStat = (key: StatKey, amount: number): void => {
  handleMissions(useProgress.getState().stat(key, amount));
};

const onHud = (h: HudSnapshot): void => {
  useGame.getState().setHud(h);
  const now = performance.now();
  if (now - lastRunValues > 1000) {
    lastRunValues = now;
    handleMissions(useProgress.getState().runValues({ runDistance: h.distance, runScore: h.score, runCoins: h.coins }));
  }
};

const onRunEnd = async (r: RunResult): Promise<void> => {
  const outcome = useProgress.getState().record(r);
  const game = useGame.getState();
  game.setRun(r, outcome);
  handleMissions({ progress: outcome.progress, completed: outcome.missions, setCompleted: outcome.setCompleted });
  for (const a of outcome.achievements) {
    game.toast({ icon: a.icon, title: `Achievement: ${a.name}`, text: `${a.description} · +${a.reward} coins` });
    AudioManager.play('achievement');
  }
  if (outcome.newBest) setTimeout(() => engine?.celebrate(), 300);
  if (!useSettings.getState().tutorialSeen) useSettings.getState().set({ tutorialSeen: true });

  if (!isSupabaseConfigured) return game.setSubmit({ state: 'offline' });
  if (useAuth.getState().status !== 'authed') return game.setSubmit({ state: 'guest' });
  game.setSubmit({ state: 'sending' });
  try {
    const res = await leaderboardService.submitRun(r);
    game.setSubmit({ state: 'sent', rank: res.rank, best: res.isBest });
  } catch (e) {
    game.setSubmit({ state: 'error', message: (e as Error).message });
  }
};

export const createEngine = async (container: HTMLElement): Promise<GameEngine> => {
  if (engine) return engine;
  const settings = useSettings.getState();
  const progress = useProgress.getState();
  engine = new GameEngine({
    container,
    quality: settings.quality,
    seed: params.has('seed') ? Number(params.get('seed')) : undefined,
    noObstacles: params.has('noObstacles'),
    callbacks: {
      onState: (s) => {
        useGame.getState().setGameState(s);
        if (s !== 'countdown') useGame.getState().setCountdown(null);
      },
      onHud,
      onStat,
      onCountdown: (n) => useGame.getState().setCountdown(n),
      onRunEnd: (r) => void onRunEnd(r),
      onEvent: (e) => {
        if (e.type === 'fps') useGame.getState().setFps(e.fps);
        if (e.type === 'stumble') useGame.getState().flashStumble();
      },
    },
  });
  if (isTestMode) (window as unknown as { __cityDash: unknown }).__cityDash = { engine, state: () => engine?.debugState() };

  const audioInit = AudioManager.init((p) => useGame.getState().setLoading(0.05 + p * 0.25, 'Mixing sounds'));
  await audioInit;
  await engine.init(lookFor(progress.selectedCharacter, progress.selectedSkins[progress.selectedCharacter]), (p, label) => useGame.getState().setLoading(0.3 + p * 0.7, label));
  applySettings();
  useSettings.subscribe(applySettings);
  useProgress.subscribe((s, prev) => {
    if (s.selectedCharacter !== prev.selectedCharacter || s.selectedSkins !== prev.selectedSkins) previewSelected();
  });
  return engine;
};

const applySettings = (): void => {
  const s = useSettings.getState();
  AudioManager.setVolumes(s.musicVolume, s.sfxVolume);
  if (!engine) return;
  void engine.setQuality(s.quality);
  engine.setShake(s.shake);
  engine.setInputSensitivity(s.sensitivity);
};

/** Shows the selected character (and skin) on the menu stage. */
export const previewSelected = (characterId?: string, skinId?: string): void => {
  const p = useProgress.getState();
  const id = characterId ?? p.selectedCharacter;
  engine?.setCharacter(lookFor(id, skinId ?? p.selectedSkins[id]));
};

export const startGame = (): void => {
  if (!engine) return;
  const p = useProgress.getState();
  p.ensureDaily();
  previewSelected();
  engine.setPowerUpLevels(p.upgrades);
  useGame.getState().setSubmit({ state: 'idle' });
  useGame.getState().setHud({ score: 0, coins: 0, distance: 0, speed: 0, multiplier: p.missionMultiplier, powerUps: [], stumbleWarning: false });
  engine.startRun(p.missionMultiplier);
};

import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { AudioManager } from './audio/AudioManager';
import { createEngine } from './state/engineBridge';
import { useAuth } from './state/authStore';
import { useGame } from './state/gameStore';
import { useProgress } from './state/progressStore';
import { Countdown, HUD, Toasts, Tutorial } from './ui/hud/HUD';
import { GameOver } from './ui/hud/GameOver';
import { PauseMenu } from './ui/hud/PauseMenu';
import { RotateHint } from './ui/hud/RotateHint';
import { LoadingScreen } from './ui/screens/LoadingScreen';
import { MainMenu } from './ui/screens/MainMenu';

// Secondary screens are code-split and loaded on demand.
const CharactersScreen = lazy(() => import('./ui/screens/CharactersScreen').then((m) => ({ default: m.CharactersScreen })));
const MissionsScreen = lazy(() => import('./ui/screens/MissionsScreen').then((m) => ({ default: m.MissionsScreen })));
const ShopScreen = lazy(() => import('./ui/screens/ShopScreen').then((m) => ({ default: m.ShopScreen })));
const LeaderboardScreen = lazy(() => import('./ui/screens/LeaderboardScreen').then((m) => ({ default: m.LeaderboardScreen })));
const SettingsScreen = lazy(() => import('./ui/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const ProfileScreen = lazy(() => import('./ui/screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));

const MenuScreens = () => {
  const screen = useGame((s) => s.screen);
  return (
    <AnimatePresence mode="wait">
      {screen === 'menu' && <MainMenu key="menu" />}
      {screen === 'characters' && <CharactersScreen key="characters" />}
      {screen === 'missions' && <MissionsScreen key="missions" />}
      {screen === 'shop' && <ShopScreen key="shop" />}
      {screen === 'leaderboard' && <LeaderboardScreen key="leaderboard" />}
      {screen === 'settings' && <SettingsScreen key="settings" />}
      {screen === 'profile' && <ProfileScreen key="profile" />}
    </AnimatePresence>
  );
};

export default function App() {
  const container = useRef<HTMLDivElement>(null);
  const loaded = useGame((s) => s.loading.done);
  const state = useGame((s) => s.gameState);
  const setLoaded = useGame((s) => s.setLoaded);
  const setLoadError = useGame((s) => s.setLoadError);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    useProgress.getState().ensureDaily();
    void useAuth.getState().init();
    createEngine(el)
      .then(() => {
        setLoaded();
        void AudioManager.playMusic('menu');
        AudioManager.preloadMusic(['modern', 'railway', 'neon']);
      })
      .catch((e: Error) => {
        console.error(e);
        setLoadError(e.message || 'WebGL is not available');
      });
  }, [setLoaded, setLoadError]);

  const inRun = state === 'countdown' || state === 'running' || state === 'dying' || state === 'paused';

  return (
    <div className="game-root" ref={container}>
      {loaded && (
        <Suspense fallback={null}>
          {state === 'menu' && <MenuScreens />}
          {inRun && <HUD />}
          {(state === 'countdown' || state === 'running') && (
            <>
              <Countdown />
              <Tutorial />
            </>
          )}
          <AnimatePresence>
            {state === 'paused' && <PauseMenu key="pause" />}
            {state === 'gameover' && <GameOver key="gameover" />}
          </AnimatePresence>
        </Suspense>
      )}
      <Toasts />
      <AnimatePresence>{!loaded && <LoadingScreen key="loading" />}</AnimatePresence>
      <RotateHint />
    </div>
  );
}

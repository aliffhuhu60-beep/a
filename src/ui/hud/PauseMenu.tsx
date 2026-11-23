import { motion } from 'framer-motion';
import { getEngine, startGame } from '../../state/engineBridge';
import { useGame } from '../../state/gameStore';
import { Button, Section } from '../components/ui';
import { AudioSettings } from '../components/AudioSettings';

export const PauseMenu = () => {
  const setScreen = useGame((s) => s.setScreen);
  return (
    <motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="pause-menu" data-no-swipe>
      <div className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-center font-display text-4xl text-dash-yellow text-stroke">PAUSED</h2>
        <Button variant="primary" size="lg" onClick={() => getEngine()?.resume()} data-testid="resume-button">
          ▶ Resume
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => startGame()} data-testid="restart-button">
            ⟲ Restart
          </Button>
          <Button
            onClick={() => {
              getEngine()?.quitToMenu();
              setScreen('menu');
            }}
            data-testid="menu-button"
          >
            ⌂ Main Menu
          </Button>
        </div>
        <Section title="Sound">
          <AudioSettings />
        </Section>
      </div>
    </motion.div>
  );
};

import { useSettings } from '../../state/settingsStore';
import { Slider } from './ui';

export const AudioSettings = () => {
  const s = useSettings();
  return (
    <>
      <Slider label="Music volume" value={s.musicVolume} onChange={(v) => s.set({ musicVolume: v })} />
      <Slider label="Sound effects volume" value={s.sfxVolume} onChange={(v) => s.set({ sfxVolume: v })} />
    </>
  );
};


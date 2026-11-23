import { useEffect } from 'react';
import { getEngine } from '../../state/engineBridge';
import { ScreenShell } from '../components/ui';
import { CharacterPicker } from './CharacterPicker';

export const useShowcase = (): void => {
  useEffect(() => {
    getEngine()?.setMenuMode('showcase');
    return () => getEngine()?.setMenuMode('menu');
  }, []);
};

export const CharactersScreen = () => {
  useShowcase();
  return (
    <ScreenShell title="Characters" testId="characters-screen">
      <CharacterPicker />
    </ScreenShell>
  );
};

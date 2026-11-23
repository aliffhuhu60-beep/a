import type { CharacterLook } from '../game/engine/types';

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  colors: Partial<CharacterLook['colors']>;
}

export interface CharacterDef {
  id: string;
  name: string;
  tagline: string;
  bio: string;
  price: number;
  hair: CharacterLook['hair'];
  accessory: CharacterLook['accessory'];
  build: CharacterLook['build'];
  colors: CharacterLook['colors'];
  skins: SkinDef[];
}

/** Original CITY DASH 3D crew. */
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'rio',
    name: 'Rio',
    tagline: 'Street Runner',
    bio: 'A courier who knows every shortcut in Modern City. Never late, never caught.',
    price: 0,
    hair: 'cap',
    accessory: 'backpack',
    build: { height: 1, bulk: 1 },
    colors: { skin: 0xc68a5e, hair: 0x1f6fd1, top: 0xff7a1a, topAccent: 0xffffff, pants: 0x2b3a55, shoes: 0xe8e8e8, accessory: 0x2f8f5b },
    skins: [
      { id: 'rio-default', name: 'Courier', price: 0, colors: {} },
      { id: 'rio-midnight', name: 'Midnight', price: 600, colors: { top: 0x1e2235, topAccent: 0x00e5ff, hair: 0x101010, pants: 0x111111, accessory: 0x00a3b8 } },
      { id: 'rio-gold', name: 'Gold Rush', price: 2500, colors: { top: 0xffc21a, topAccent: 0x8a5a00, hair: 0xb37300, accessory: 0xffe27a, shoes: 0xffd34d } },
    ],
  },
  {
    id: 'mika',
    name: 'Mika',
    tagline: 'Rail Skater',
    bio: 'Grew up skating the Railway District yards. Listens to beats only she can hear.',
    price: 1000,
    hair: 'ponytail',
    accessory: 'headphones',
    build: { height: 0.96, bulk: 0.92 },
    colors: { skin: 0xf0c8a0, hair: 0x5a2d82, top: 0x19b5a5, topAccent: 0xff4fa0, pants: 0x3d3d4f, shoes: 0xff4fa0, accessory: 0xf2f2f2 },
    skins: [
      { id: 'mika-default', name: 'Skater', price: 0, colors: {} },
      { id: 'mika-sunset', name: 'Sunset', price: 800, colors: { top: 0xff7b54, topAccent: 0xffd56b, hair: 0x8a1c1c, accessory: 0xffd56b } },
      { id: 'mika-frost', name: 'Frost', price: 2000, colors: { top: 0xdff6ff, topAccent: 0x47b5ff, hair: 0xe8f7ff, pants: 0x256d85, shoes: 0x47b5ff } },
    ],
  },
  {
    id: 'zane',
    name: 'Zane',
    tagline: 'Neon Ghost',
    bio: 'A cyber-athlete from Neon Cyber City whose visor reads the track before it appears.',
    price: 3000,
    hair: 'spiky',
    accessory: 'visor',
    build: { height: 1.04, bulk: 1.02 },
    colors: { skin: 0x8d5a3c, hair: 0xeeeeee, top: 0x22223a, topAccent: 0x00f0ff, pants: 0x151525, shoes: 0x00f0ff, accessory: 0x00f0ff, glow: 0x00c8ff },
    skins: [
      { id: 'zane-default', name: 'Ghost', price: 0, colors: {} },
      { id: 'zane-crimson', name: 'Crimson', price: 1200, colors: { topAccent: 0xff2d55, accessory: 0xff2d55, shoes: 0xff2d55, glow: 0xff2d55 } },
      { id: 'zane-toxic', name: 'Toxic', price: 3000, colors: { top: 0x1a2a12, topAccent: 0x9dff3b, accessory: 0x9dff3b, shoes: 0x9dff3b, hair: 0x9dff3b, glow: 0x7dff20 } },
    ],
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Courier Droid',
    bio: 'A delivery android that decided running was more fun than flying. Beep boop, go!',
    price: 6000,
    hair: 'helmet',
    accessory: 'antenna',
    build: { height: 1.0, bulk: 1.08 },
    colors: { skin: 0xb8c4d0, hair: 0xf4f4f4, top: 0xf4f4f4, topAccent: 0xff8a00, pants: 0x6a7480, shoes: 0x30343a, accessory: 0x8a96a3, glow: 0xff8a00 },
    skins: [
      { id: 'nova-default', name: 'Factory', price: 0, colors: {} },
      { id: 'nova-stealth', name: 'Stealth', price: 1500, colors: { top: 0x2a2d33, hair: 0x2a2d33, skin: 0x50565e, topAccent: 0xb04bff, glow: 0xb04bff } },
      { id: 'nova-royal', name: 'Royal', price: 4000, colors: { top: 0x1d3fa8, hair: 0xffc21a, topAccent: 0xffc21a, glow: 0xffc21a, pants: 0x0f1f5c } },
    ],
  },
];

export const getCharacter = (id: string): CharacterDef => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export const lookFor = (characterId: string, skinId?: string): CharacterLook => {
  const c = getCharacter(characterId);
  const skin = c.skins.find((s) => s.id === skinId) ?? c.skins[0];
  return {
    id: c.id,
    skin: skin.id,
    colors: { ...c.colors, ...skin.colors },
    hair: c.hair,
    accessory: c.accessory,
    build: c.build,
  };
};

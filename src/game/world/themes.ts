export type ThemeId = 'modern' | 'railway' | 'neon';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  skyTop: string;
  skyBottom: string;
  fog: number;
  fogNear: number;
  fogFar: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
  ground: number;
  track: number;
  wall: number;
  buildings: number[];
  towers: number[];
  glass: number;
  windowLight: number;
  windowLit: number;
  windowIntensity: number;
  skyline: number;
  lampLight: number;
  neon: number[];
  bloom: number;
  props: { trees: boolean; containers: boolean; catenary: boolean; neonSigns: boolean; drones: boolean; clouds: boolean };
}

export const THEMES: ThemeDef[] = [
  {
    id: 'modern',
    name: 'Modern City',
    skyTop: '#3d8fe0',
    skyBottom: '#cfe8ff',
    fog: 0xcfe3f5,
    fogNear: 60,
    fogFar: 260,
    sun: 0xfff1d6,
    sunIntensity: 2.6,
    hemiSky: 0xbfdcff,
    hemiGround: 0x6d6a60,
    hemiIntensity: 1.25,
    exposure: 1.0,
    ground: 0xc9c6bf,
    track: 0xffffff,
    wall: 0xd4d2cc,
    buildings: [0xe9e4d8, 0xc8d3de, 0xf2c9a0, 0x9fb7c9, 0xd9b38c, 0xb6c2b0, 0xe6d3c1],
    towers: [0x8fb2d6, 0xa9c4dd, 0x7d9cbf, 0xc1d4e6, 0x95a9bc],
    glass: 0x5d86ad,
    windowLight: 0xffe7b0,
    windowLit: 0.08,
    windowIntensity: 0.25,
    skyline: 0x9cb8d4,
    lampLight: 0xfff2cc,
    neon: [0xffb347, 0x6ec6ff],
    bloom: 0.25,
    props: { trees: true, containers: false, catenary: false, neonSigns: false, drones: false, clouds: true },
  },
  {
    id: 'railway',
    name: 'Railway District',
    skyTop: '#e0683d',
    skyBottom: '#ffd29a',
    fog: 0xf0bd8e,
    fogNear: 50,
    fogFar: 240,
    sun: 0xffb36b,
    sunIntensity: 2.4,
    hemiSky: 0xffc896,
    hemiGround: 0x4a3a30,
    hemiIntensity: 1.1,
    exposure: 1.0,
    ground: 0xa69585,
    track: 0xe6d6c6,
    wall: 0xa08b7a,
    buildings: [0x9c4a32, 0xb5653f, 0x7d3b2a, 0xc98b5a, 0x8a5a44, 0x6e4a3a],
    towers: [0x6c5a6e, 0x7d6a7a, 0x5e4e5c, 0x8a7480],
    glass: 0x3c3a44,
    windowLight: 0xffc070,
    windowLit: 0.28,
    windowIntensity: 0.7,
    skyline: 0x8a5a6a,
    lampLight: 0xffc070,
    neon: [0xff8a3d, 0xffd23f],
    bloom: 0.35,
    props: { trees: false, containers: true, catenary: true, neonSigns: false, drones: false, clouds: true },
  },
  {
    id: 'neon',
    name: 'Neon Cyber City',
    skyTop: '#07041a',
    skyBottom: '#3b1060',
    fog: 0x2a0c45,
    fogNear: 40,
    fogFar: 230,
    sun: 0x9d7bff,
    sunIntensity: 1.2,
    hemiSky: 0x6a4bff,
    hemiGround: 0x1a0830,
    hemiIntensity: 1.0,
    exposure: 1.1,
    ground: 0x4a4560,
    track: 0x8a84a8,
    wall: 0x3a3550,
    buildings: [0x2a2540, 0x33284d, 0x1f2a44, 0x3a2a4a, 0x252038],
    towers: [0x1c1830, 0x241e3c, 0x161428, 0x2a2244],
    glass: 0x141020,
    windowLight: 0x6ef9ff,
    windowLit: 0.45,
    windowIntensity: 1.6,
    skyline: 0x3a1f5e,
    lampLight: 0xff3fd0,
    neon: [0xff2fb4, 0x00f0ff, 0x9dff3b, 0xffd23f],
    bloom: 0.9,
    props: { trees: false, containers: false, catenary: false, neonSigns: true, drones: true, clouds: false },
  },
];

export const themeAt = (index: number): ThemeDef => THEMES[((index % THEMES.length) + THEMES.length) % THEMES.length];

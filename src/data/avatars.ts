export const AVATARS = ['🦊', '🐼', '🐯', '🤖', '👾', '🐸', '🦁', '🐧', '🐙', '🦄', '🐲', '🐺'] as const;
export const avatarFor = (key: string | null | undefined): string => (key && (AVATARS as readonly string[]).includes(key) ? key : AVATARS[0]);

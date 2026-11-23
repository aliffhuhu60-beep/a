export type InputAction = 'left' | 'right' | 'jump' | 'slide' | 'pause';

const KEYMAP: Record<string, InputAction> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'slide',
  KeyS: 'slide',
  Escape: 'pause',
  KeyP: 'pause',
};

/**
 * Keyboard + touch/mouse swipe input. Swipes fire as soon as the finger has
 * travelled far enough (during pointermove), not on release, so they feel
 * instant; the origin then resets so several swipes can chain in one touch.
 */
export class InputManager {
  enabled = true;
  /** 0.5 (less sensitive) .. 2 (very sensitive). */
  sensitivity = 1;
  private start: { id: number; x: number; y: number; t: number } | null = null;

  constructor(
    private readonly target: HTMLElement | Window,
    private readonly onAction: (a: InputAction) => void,
  ) {}

  attach(): void {
    window.addEventListener('keydown', this.onKey, { passive: false });
    this.target.addEventListener('pointerdown', this.onDown as EventListener, { passive: true });
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp, { passive: true });
    window.addEventListener('pointercancel', this.onUp, { passive: true });
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKey);
    this.target.removeEventListener('pointerdown', this.onDown as EventListener);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }

  private onKey = (e: KeyboardEvent): void => {
    const action = KEYMAP[e.code];
    if (!action) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    if (!this.enabled && action !== 'pause') return;
    if (e.repeat && action !== 'left' && action !== 'right') return;
    if (e.repeat) return;
    e.preventDefault();
    this.onAction(action);
  };

  private get threshold(): number {
    const base = Math.min(window.innerWidth, window.innerHeight) * 0.06;
    return Math.max(18, Math.min(60, base)) / this.sensitivity;
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('[data-no-swipe]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onMove = (e: PointerEvent): void => {
    const s = this.start;
    if (!s || s.id !== e.pointerId || !this.enabled) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const th = this.threshold;
    if (Math.abs(dx) < th && Math.abs(dy) < th) return;
    let action: InputAction;
    if (Math.abs(dx) > Math.abs(dy)) action = dx > 0 ? 'right' : 'left';
    else action = dy > 0 ? 'slide' : 'jump';
    this.onAction(action);
    s.x = e.clientX;
    s.y = e.clientY;
    s.t = performance.now();
  };

  private onUp = (e: PointerEvent): void => {
    if (this.start?.id === e.pointerId) this.start = null;
  };
}

/**
 * Every keyboard binding in the game, in one place. The input dispatch, the rulebook, the sidebar legend,
 * the HUD "super ready" tag, the coach tips and the README all read from this table, so a key printed
 * anywhere is the key that really works.
 *
 * Codes are `KeyboardEvent.code` values (layout independent), labels are what a player reads.
 */

export type PlayerSlot = 'p1' | 'p2';

export type ControlAction =
  | 'left' | 'right' | 'jump' | 'block'
  | 'strike' | 'kick' | 'special' | 'line' | 'super';

export interface KeyBinding {
  /** KeyboardEvent.code */
  code: string;
  /** Short label for the keycap: "J", "Space", "\u2191" */
  label: string;
}

const k = (code: string, label: string): KeyBinding => ({ code, label });

export const CONTROLS: Record<PlayerSlot, Record<ControlAction, KeyBinding[]>> = {
  p1: {
    left: [k('KeyA', 'A')],
    right: [k('KeyD', 'D')],
    jump: [k('KeyW', 'W')],
    block: [k('KeyS', 'S')],
    strike: [k('KeyJ', 'J'), k('Space', 'Space')],
    kick: [k('KeyU', 'U'), k('KeyI', 'I')],
    special: [k('KeyK', 'K')],
    line: [k('KeyF', 'F')],
    super: [k('KeyQ', 'Q'), k('KeyL', 'L')]
  },
  p2: {
    left: [k('ArrowLeft', '\u2190')],
    right: [k('ArrowRight', '\u2192')],
    jump: [k('ArrowUp', '\u2191')],
    block: [k('ArrowDown', '\u2193')],
    strike: [k('Enter', 'Enter')],
    kick: [k('Slash', '/')],
    special: [k('KeyP', 'P')],
    line: [k('Period', '.')],
    super: [k('KeyO', 'O')]
  }
};

/** Pause keys: Esc always; P only in single-player, because P is Player 2's special in 2-Player. */
export const PAUSE_CODES = { always: 'Escape', singlePlayerOnly: 'KeyP' } as const;

/** How the pause keys read in text. */
export const PAUSE_LABELS = { always: 'Esc', singlePlayerOnly: 'P' } as const;

/** Key states keyed by KeyboardEvent.code (the shape of `keyboardStateRef` / `justPressedRef`). */
export type KeyState = Record<string, boolean | undefined>;

export function codesFor(slot: PlayerSlot, action: ControlAction): string[] {
  return CONTROLS[slot][action].map(b => b.code);
}

/** True when any key bound to this action is set in the given state. */
export function isActive(slot: PlayerSlot, action: ControlAction, state: KeyState): boolean {
  return CONTROLS[slot][action].some(b => !!state[b.code]);
}

/** "J / Space" style label list for an action. */
export function labelsFor(slot: PlayerSlot, action: ControlAction): string[] {
  return CONTROLS[slot][action].map(b => b.label);
}

/** The first (main) key label, for compact spots such as the HUD tag: "Q". */
export function primaryLabel(slot: PlayerSlot, action: ControlAction): string {
  return CONTROLS[slot][action][0].label;
}

/** "[J] / [Space]" for running text. */
export function bracketLabels(slot: PlayerSlot, action: ControlAction): string {
  return labelsFor(slot, action).map(l => `[${l}]`).join(' / ');
}

/** Every key that belongs to a player, for "does this key do anything in the match". */
export function allCodes(slot: PlayerSlot): string[] {
  return (Object.keys(CONTROLS[slot]) as ControlAction[]).flatMap(a => codesFor(slot, a));
}

/**
 * Keys the browser would otherwise act on while fighting, so the game swallows them:
 * Space and the arrows (page scroll / button activation), and "/" in 2-Player (Firefox quick find).
 */
export function swallowedInMatch(code: string, twoPlayer: boolean): boolean {
  if (code === 'Space' || code.startsWith('Arrow')) return true;
  return twoPlayer && code === CONTROLS.p2.kick[0].code;
}

/** One-line summary of a player's keys for the sidebar legend. */
export function controlsSummary(slot: PlayerSlot): string {
  const move = slot === 'p1'
    ? 'WASD Move/Jump/Block'
    : '\u2190\u2192 Move | \u2191 Jump | \u2193 Block';
  const part = (name: string, action: ControlAction) => `${labelsFor(slot, action).join('/')} ${name}`;
  return [
    move,
    part('Strike', 'strike'),
    part('Kick', 'kick'),
    part('Special', 'special'),
    part('Super', 'super'),
    part('Pickup Line', 'line')
  ].join(' | ');
}

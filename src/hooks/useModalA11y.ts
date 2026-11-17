import { RefObject, useEffect, useRef } from 'react';
import { focusTrapTarget } from '../game/logic';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0);
}

interface Options {
  /** True while the dialog is open (and, for the drawer, only in its overlay form). */
  active: boolean;
  /** Called on Esc. Leave out for a dialog that must not be dismissed with Esc (the game-over screen). */
  onClose?: () => void;
}

/**
 * Keyboard behaviour every modal shares: focus moves in when it opens and back to where it was when it closes,
 * Tab / Shift+Tab stay inside, and Esc closes it. Esc is taken in the capture phase and stopped, so the game's
 * own Esc (pause) does not also fire.
 */
export function useModalA11y(ref: RefObject<HTMLElement | null>, { active, onClose }: Options): void {
  // The caller usually passes a new function every render; keep the latest one without re-running the effect
  // (re-running would pull focus back to the first control on every re-render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const hasClose = !!onClose;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    const items = focusables(root);
    (items[0] ?? root).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && closeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.code !== 'Tab') return;
      const list = focusables(root);
      const idx = list.indexOf(document.activeElement as HTMLElement);
      const target = focusTrapTarget(list.length, idx, e.shiftKey);
      if (target === null) return;
      e.preventDefault();
      (target === 'container' ? root : list[target]).focus();
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, hasClose, ref]);
}

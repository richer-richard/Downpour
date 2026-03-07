import { useEffect } from 'react';

interface UseKeyboardInputOptions {
  enabled: boolean;
  onPrintable: (value: string) => void;
  onBackspace: () => void;
  onEscape: () => void;
  onAnyKey?: () => void;
}

export function useKeyboardInput(options: UseKeyboardInputOptions): void {
  const { enabled, onPrintable, onBackspace, onEscape, onAnyKey } = options;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (onAnyKey) {
        onAnyKey();
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackspace();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key.length === 1 && /^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        onPrintable(event.key.toLowerCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, onAnyKey, onBackspace, onEscape, onPrintable]);
}

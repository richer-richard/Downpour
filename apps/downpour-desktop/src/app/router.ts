export type AppView = 'start' | 'playing' | 'paused' | 'ended' | 'records' | 'settings';

export type AppEvent =
  | 'START_GAME'
  | 'OPEN_RECORDS'
  | 'OPEN_SETTINGS'
  | 'END_GAME'
  | 'BACK_TO_START'
  | 'RESUME';

export function transitionView(current: AppView, event: AppEvent): AppView {
  switch (event) {
    case 'START_GAME':
      return 'playing';
    case 'OPEN_RECORDS':
      return 'records';
    case 'OPEN_SETTINGS':
      return 'settings';
    case 'END_GAME':
      return 'ended';
    case 'BACK_TO_START':
      return 'start';
    case 'RESUME':
      return current === 'paused' ? 'playing' : current;
    default:
      return current;
  }
}

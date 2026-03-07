export type SessionState = 'start' | 'playing' | 'paused' | 'ended' | 'records' | 'settings';

export type SessionEvent =
  | 'begin'
  | 'pause'
  | 'resume'
  | 'end'
  | 'records'
  | 'settings'
  | 'home';

export function transitionSessionState(current: SessionState, event: SessionEvent): SessionState {
  if (event === 'home') {
    return 'start';
  }

  if (event === 'records') {
    return 'records';
  }

  if (event === 'settings') {
    return 'settings';
  }

  if (event === 'begin') {
    return 'playing';
  }

  if (event === 'pause') {
    return current === 'playing' ? 'paused' : current;
  }

  if (event === 'resume') {
    return current === 'paused' ? 'playing' : current;
  }

  if (event === 'end') {
    return 'ended';
  }

  return current;
}

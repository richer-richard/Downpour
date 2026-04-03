import { isAppCommandError } from '@downpour/shared';

export function toErrorMessage(value: unknown, fallback: string): string {
  if (isAppCommandError(value)) {
    return value.message;
  }
  if (value instanceof Error && value.message) {
    return value.message;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

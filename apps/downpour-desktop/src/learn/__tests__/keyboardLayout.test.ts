import { describe, expect, it } from 'vitest';
import { baseKey, requiresShift, shiftKeyFor, shiftFingerFor } from '../keyboardLayout';

describe('keyboardLayout helpers', () => {
  it('baseKey returns lowercase for letters', () => {
    expect(baseKey('F')).toBe('f');
    expect(baseKey('a')).toBe('a');
  });

  it('baseKey unshifts symbols', () => {
    expect(baseKey('!')).toBe('1');
    expect(baseKey('?')).toBe('/');
    expect(baseKey(':')).toBe(';');
    expect(baseKey('"')).toBe("'");
  });

  it('requiresShift identifies shifted characters', () => {
    expect(requiresShift('F')).toBe(true);
    expect(requiresShift('f')).toBe(false);
    expect(requiresShift('!')).toBe(true);
    expect(requiresShift('1')).toBe(false);
    expect(requiresShift(';')).toBe(false);
    expect(requiresShift(':')).toBe(true);
  });

  it('shiftKeyFor picks the opposite-hand shift', () => {
    // F is left-hand -> right shift
    expect(shiftKeyFor('F')).toBe('shift_r');
    // J is right-hand -> left shift
    expect(shiftKeyFor('J')).toBe('shift_l');
    // ! uses left pinky on 1 -> right shift
    expect(shiftKeyFor('!')).toBe('shift_r');
    // ? uses right pinky on / -> left shift
    expect(shiftKeyFor('?')).toBe('shift_l');
  });

  it('shiftFingerFor returns the pinky that holds shift', () => {
    expect(shiftFingerFor('F')).toBe('R_PINKY');
    expect(shiftFingerFor('J')).toBe('L_PINKY');
    expect(shiftFingerFor('f')).toBeUndefined();
  });
});

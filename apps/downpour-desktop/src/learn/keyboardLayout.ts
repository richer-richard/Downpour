export type FingerId =
  | 'L_PINKY'
  | 'L_RING'
  | 'L_MIDDLE'
  | 'L_INDEX'
  | 'R_INDEX'
  | 'R_MIDDLE'
  | 'R_RING'
  | 'R_PINKY'
  | 'THUMB';

export const FINGER_LABELS: Record<FingerId, string> = {
  L_PINKY: 'left pinky',
  L_RING: 'left ring finger',
  L_MIDDLE: 'left middle finger',
  L_INDEX: 'left index finger',
  R_INDEX: 'right index finger',
  R_MIDDLE: 'right middle finger',
  R_RING: 'right ring finger',
  R_PINKY: 'right pinky',
  THUMB: 'thumb',
};

export interface KeyDef {
  key: string;
  label: string;
  row: number;
  col: number;
  width: number;
  finger: FingerId;
}

// Col/width in "units" where a normal key = 1u. Row 0 = top (numbers), row 3 = bottom, row 4 = space.
export const KEYBOARD_KEYS: KeyDef[] = [
  // Row 0 — numbers
  { key: '`', label: '`', row: 0, col: 0, width: 1, finger: 'L_PINKY' },
  { key: '1', label: '1', row: 0, col: 1, width: 1, finger: 'L_PINKY' },
  { key: '2', label: '2', row: 0, col: 2, width: 1, finger: 'L_RING' },
  { key: '3', label: '3', row: 0, col: 3, width: 1, finger: 'L_MIDDLE' },
  { key: '4', label: '4', row: 0, col: 4, width: 1, finger: 'L_INDEX' },
  { key: '5', label: '5', row: 0, col: 5, width: 1, finger: 'L_INDEX' },
  { key: '6', label: '6', row: 0, col: 6, width: 1, finger: 'R_INDEX' },
  { key: '7', label: '7', row: 0, col: 7, width: 1, finger: 'R_INDEX' },
  { key: '8', label: '8', row: 0, col: 8, width: 1, finger: 'R_MIDDLE' },
  { key: '9', label: '9', row: 0, col: 9, width: 1, finger: 'R_RING' },
  { key: '0', label: '0', row: 0, col: 10, width: 1, finger: 'R_PINKY' },
  { key: '-', label: '-', row: 0, col: 11, width: 1, finger: 'R_PINKY' },
  { key: '=', label: '=', row: 0, col: 12, width: 1, finger: 'R_PINKY' },

  // Row 1 — top letters
  { key: 'q', label: 'q', row: 1, col: 1.5, width: 1, finger: 'L_PINKY' },
  { key: 'w', label: 'w', row: 1, col: 2.5, width: 1, finger: 'L_RING' },
  { key: 'e', label: 'e', row: 1, col: 3.5, width: 1, finger: 'L_MIDDLE' },
  { key: 'r', label: 'r', row: 1, col: 4.5, width: 1, finger: 'L_INDEX' },
  { key: 't', label: 't', row: 1, col: 5.5, width: 1, finger: 'L_INDEX' },
  { key: 'y', label: 'y', row: 1, col: 6.5, width: 1, finger: 'R_INDEX' },
  { key: 'u', label: 'u', row: 1, col: 7.5, width: 1, finger: 'R_INDEX' },
  { key: 'i', label: 'i', row: 1, col: 8.5, width: 1, finger: 'R_MIDDLE' },
  { key: 'o', label: 'o', row: 1, col: 9.5, width: 1, finger: 'R_RING' },
  { key: 'p', label: 'p', row: 1, col: 10.5, width: 1, finger: 'R_PINKY' },
  { key: '[', label: '[', row: 1, col: 11.5, width: 1, finger: 'R_PINKY' },
  { key: ']', label: ']', row: 1, col: 12.5, width: 1, finger: 'R_PINKY' },

  // Row 2 — home row
  { key: 'a', label: 'a', row: 2, col: 1.75, width: 1, finger: 'L_PINKY' },
  { key: 's', label: 's', row: 2, col: 2.75, width: 1, finger: 'L_RING' },
  { key: 'd', label: 'd', row: 2, col: 3.75, width: 1, finger: 'L_MIDDLE' },
  { key: 'f', label: 'f', row: 2, col: 4.75, width: 1, finger: 'L_INDEX' },
  { key: 'g', label: 'g', row: 2, col: 5.75, width: 1, finger: 'L_INDEX' },
  { key: 'h', label: 'h', row: 2, col: 6.75, width: 1, finger: 'R_INDEX' },
  { key: 'j', label: 'j', row: 2, col: 7.75, width: 1, finger: 'R_INDEX' },
  { key: 'k', label: 'k', row: 2, col: 8.75, width: 1, finger: 'R_MIDDLE' },
  { key: 'l', label: 'l', row: 2, col: 9.75, width: 1, finger: 'R_RING' },
  { key: ';', label: ';', row: 2, col: 10.75, width: 1, finger: 'R_PINKY' },
  { key: "'", label: "'", row: 2, col: 11.75, width: 1, finger: 'R_PINKY' },

  // Row 3 — bottom letters
  { key: 'z', label: 'z', row: 3, col: 2.25, width: 1, finger: 'L_PINKY' },
  { key: 'x', label: 'x', row: 3, col: 3.25, width: 1, finger: 'L_RING' },
  { key: 'c', label: 'c', row: 3, col: 4.25, width: 1, finger: 'L_MIDDLE' },
  { key: 'v', label: 'v', row: 3, col: 5.25, width: 1, finger: 'L_INDEX' },
  { key: 'b', label: 'b', row: 3, col: 6.25, width: 1, finger: 'L_INDEX' },
  { key: 'n', label: 'n', row: 3, col: 7.25, width: 1, finger: 'R_INDEX' },
  { key: 'm', label: 'm', row: 3, col: 8.25, width: 1, finger: 'R_INDEX' },
  { key: ',', label: ',', row: 3, col: 9.25, width: 1, finger: 'R_MIDDLE' },
  { key: '.', label: '.', row: 3, col: 10.25, width: 1, finger: 'R_RING' },
  { key: '/', label: '/', row: 3, col: 11.25, width: 1, finger: 'R_PINKY' },

  // Row 4 — space
  { key: ' ', label: 'space', row: 4, col: 3.75, width: 6, finger: 'THUMB' },
];

export function findKey(char: string): KeyDef | undefined {
  const lower = char.toLowerCase();
  return KEYBOARD_KEYS.find((k) => k.key === lower);
}

export function fingerFor(char: string): FingerId | undefined {
  return findKey(char)?.finger;
}

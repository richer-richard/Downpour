import { KEYBOARD_KEYS, type FingerId } from '../../learn/keyboardLayout';

interface KeyboardHandsProps {
  highlightKey?: string | string[];
  highlightFinger?: FingerId | FingerId[];
  pressedKey?: string;
}

const UNIT = 40;
const GAP = 4;
const KEYBOARD_COLS = 15;
const KEYBOARD_ROWS = 5;
const WIDTH = KEYBOARD_COLS * UNIT + GAP * 2;
const HEIGHT = KEYBOARD_ROWS * UNIT + GAP * 2;

// Home-row finger anchor points (x in key units, y in keyboard units from top).
// These are the tips of each finger, positioned on the home row (row 2).
const FINGER_ANCHORS: Record<FingerId, { x: number; y: number } | null> = {
  L_PINKY: { x: 2.25, y: 2.5 },
  L_RING: { x: 3.25, y: 2.5 },
  L_MIDDLE: { x: 4.25, y: 2.5 },
  L_INDEX: { x: 5.25, y: 2.5 },
  R_INDEX: { x: 8.25, y: 2.5 },
  R_MIDDLE: { x: 9.25, y: 2.5 },
  R_RING: { x: 10.25, y: 2.5 },
  R_PINKY: { x: 11.25, y: 2.5 },
  THUMB: { x: 6.75, y: 4.5 },
};

function keyX(col: number): number {
  return GAP + col * UNIT;
}
function keyY(row: number): number {
  return GAP + row * UNIT;
}

interface HandProps {
  side: 'left' | 'right';
  highlightFingers: Set<FingerId>;
}

// Simplified hand: palm as a rounded rect, five tapered fingers extending up to the home row.
// Fingers are grouped so we can highlight one.
function Hand({ side, highlightFingers }: HandProps) {
  const fingers: Array<{ id: FingerId; label: string }> =
    side === 'left'
      ? [
          { id: 'L_PINKY', label: 'pinky' },
          { id: 'L_RING', label: 'ring' },
          { id: 'L_MIDDLE', label: 'middle' },
          { id: 'L_INDEX', label: 'index' },
        ]
      : [
          { id: 'R_INDEX', label: 'index' },
          { id: 'R_MIDDLE', label: 'middle' },
          { id: 'R_RING', label: 'ring' },
          { id: 'R_PINKY', label: 'pinky' },
        ];

  // Palm center sits below the bottom row; fingers reach up to the home row.
  const palmY = keyY(5.2);
  const palmHeight = UNIT * 1.6;

  // Use the first and last finger tip positions to anchor the palm horizontally.
  const firstTip = FINGER_ANCHORS[fingers[0].id]!;
  const lastTip = FINGER_ANCHORS[fingers[fingers.length - 1].id]!;
  const palmLeft = keyX(Math.min(firstTip.x, lastTip.x) - 0.3);
  const palmRight = keyX(Math.max(firstTip.x, lastTip.x) + 0.8);
  const palmWidth = palmRight - palmLeft;

  return (
    <g>
      {/* palm */}
      <rect
        x={palmLeft}
        y={palmY}
        width={palmWidth}
        height={palmHeight}
        rx={UNIT * 0.5}
        ry={UNIT * 0.55}
        fill="rgba(124, 220, 255, 0.06)"
        stroke="rgba(124, 220, 255, 0.35)"
        strokeWidth={1.5}
      />

      {/* fingers */}
      {fingers.map((finger) => {
        const anchor = FINGER_ANCHORS[finger.id]!;
        const tipX = keyX(anchor.x + 0.5);
        const tipY = keyY(anchor.y);
        const baseY = palmY + palmHeight * 0.15;
        const isHighlighted = highlightFingers.has(finger.id);
        const stroke = isHighlighted ? 'rgba(124, 220, 255, 1)' : 'rgba(124, 220, 255, 0.35)';
        const fill = isHighlighted ? 'rgba(124, 220, 255, 0.25)' : 'rgba(124, 220, 255, 0.05)';
        const width = UNIT * 0.55;

        return (
          <g key={finger.id}>
            <path
              d={`M ${tipX - width / 2} ${baseY}
                  Q ${tipX - width / 2} ${tipY + UNIT * 0.4}, ${tipX - width * 0.35} ${tipY + UNIT * 0.1}
                  Q ${tipX} ${tipY - UNIT * 0.05}, ${tipX + width * 0.35} ${tipY + UNIT * 0.1}
                  Q ${tipX + width / 2} ${tipY + UNIT * 0.4}, ${tipX + width / 2} ${baseY}
                  Z`}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              style={isHighlighted ? { filter: 'drop-shadow(0 0 8px rgba(124, 220, 255, 0.85))' } : undefined}
            />
          </g>
        );
      })}

      {/* thumb */}
      {(() => {
        const thumbId: FingerId = 'THUMB';
        const isHighlighted = highlightFingers.has(thumbId);
        const thumbTipX = side === 'left' ? palmRight - UNIT * 0.3 : palmLeft + UNIT * 0.3;
        const thumbTipY = keyY(4.6);
        const thumbBaseX = side === 'left' ? palmRight - UNIT * 0.1 : palmLeft + UNIT * 0.1;
        const thumbBaseY = palmY + palmHeight * 0.35;
        const stroke = isHighlighted ? 'rgba(124, 220, 255, 1)' : 'rgba(124, 220, 255, 0.35)';
        const fill = isHighlighted ? 'rgba(124, 220, 255, 0.25)' : 'rgba(124, 220, 255, 0.05)';
        return (
          <path
            d={`M ${thumbBaseX} ${thumbBaseY}
                Q ${(thumbBaseX + thumbTipX) / 2} ${thumbBaseY - UNIT * 0.2}, ${thumbTipX} ${thumbTipY}
                Q ${thumbTipX + (side === 'left' ? -UNIT * 0.3 : UNIT * 0.3)} ${thumbTipY + UNIT * 0.3}, ${thumbBaseX + (side === 'left' ? -UNIT * 0.2 : UNIT * 0.2)} ${thumbBaseY + UNIT * 0.2}
                Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={isHighlighted ? 2.5 : 1.5}
            style={isHighlighted ? { filter: 'drop-shadow(0 0 8px rgba(124, 220, 255, 0.85))' } : undefined}
          />
        );
      })()}
    </g>
  );
}

export function KeyboardHands({ highlightKey, highlightFinger, pressedKey }: KeyboardHandsProps) {
  const highlightKeys = new Set(
    (Array.isArray(highlightKey) ? highlightKey : highlightKey ? [highlightKey] : []).map((k) =>
      k.toLowerCase(),
    ),
  );
  const highlightFingers = new Set<FingerId>(
    Array.isArray(highlightFinger) ? highlightFinger : highlightFinger ? [highlightFinger] : [],
  );
  const normalizedPressed = pressedKey?.toLowerCase();

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT + UNIT * 2.5}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="On-screen keyboard with hand guides"
      className="w-full max-w-3xl"
    >
      {/* keyboard frame */}
      <rect
        x={0}
        y={0}
        width={WIDTH}
        height={HEIGHT}
        rx={12}
        ry={12}
        fill="rgba(5, 16, 28, 0.6)"
        stroke="rgba(124, 220, 255, 0.25)"
        strokeWidth={1.5}
      />

      {/* keys */}
      {KEYBOARD_KEYS.map((keyDef) => {
        const isHighlighted = highlightKeys.has(keyDef.key);
        const isPressed = normalizedPressed === keyDef.key;
        const x = keyX(keyDef.col);
        const y = keyY(keyDef.row);
        const width = keyDef.width * UNIT - GAP;
        const height = UNIT - GAP;

        let fill = 'rgba(5, 16, 28, 0.9)';
        let stroke = 'rgba(124, 220, 255, 0.35)';
        let textColor = 'rgba(223, 248, 255, 0.8)';
        let filter: string | undefined;

        if (isHighlighted) {
          fill = 'rgba(124, 220, 255, 0.35)';
          stroke = 'rgba(124, 220, 255, 1)';
          textColor = '#ffffff';
          filter = 'drop-shadow(0 0 10px rgba(124, 220, 255, 0.9))';
        }
        if (isPressed) {
          fill = 'rgba(255, 255, 255, 0.45)';
          stroke = '#ffffff';
          textColor = '#020510';
          filter = 'drop-shadow(0 0 14px rgba(255, 255, 255, 0.95))';
        }

        return (
          <g key={`${keyDef.key}-${keyDef.row}-${keyDef.col}`} style={filter ? { filter } : undefined}>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={5}
              ry={5}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHighlighted || isPressed ? 2 : 1}
            />
            <text
              x={x + width / 2}
              y={y + height / 2 + 5}
              textAnchor="middle"
              fontSize={keyDef.width > 1 ? 13 : 15}
              fontFamily="'Rajdhani', sans-serif"
              fontWeight={600}
              fill={textColor}
            >
              {keyDef.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* hands overlaid on keyboard */}
      <g opacity={0.9}>
        <Hand side="left" highlightFingers={highlightFingers} />
        <Hand side="right" highlightFingers={highlightFingers} />
      </g>
    </svg>
  );
}

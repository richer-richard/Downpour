import type { FingerId } from './keyboardLayout';

export type LessonStep =
  | { kind: 'intro_key'; key: string; finger: FingerId; description: string }
  | { kind: 'drill'; prompt: string; hint?: string }
  | { kind: 'word_drill'; words: string[]; hint?: string }
  | { kind: 'practice'; durationSeconds: number; pool: string[] };

export interface Lesson {
  id: string;
  unit: string;
  order: number;
  title: string;
  summary: string;
  steps: LessonStep[];
  unlockRequires?: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'home-row.01.intro-f',
    unit: 'Home Row',
    order: 1,
    title: 'Key: F',
    summary: 'Meet the F key — your left index finger home.',
    steps: [
      {
        kind: 'intro_key',
        key: 'f',
        finger: 'L_INDEX',
        description: 'Rest your left index finger on F. Feel the small bump — this is home.',
      },
      { kind: 'drill', prompt: 'f f f f f f', hint: 'Tap F with your left index finger.' },
      { kind: 'drill', prompt: 'fff fff fff' },
    ],
  },
  {
    id: 'home-row.02.intro-j',
    unit: 'Home Row',
    order: 2,
    title: 'Key: J',
    summary: 'Meet the J key — your right index finger home.',
    unlockRequires: 'home-row.01.intro-f',
    steps: [
      {
        kind: 'intro_key',
        key: 'j',
        finger: 'R_INDEX',
        description: 'Rest your right index finger on J. Feel the bump — this is its home.',
      },
      { kind: 'drill', prompt: 'j j j j j j', hint: 'Tap J with your right index finger.' },
      { kind: 'drill', prompt: 'jjj jjj jjj' },
    ],
  },
  {
    id: 'home-row.03.fj',
    unit: 'Home Row',
    order: 3,
    title: 'Keys: F & J',
    summary: 'Alternate between F and J without looking down.',
    unlockRequires: 'home-row.02.intro-j',
    steps: [
      { kind: 'drill', prompt: 'fj fj fj fj' },
      { kind: 'drill', prompt: 'fff jjj fjf jfj' },
      { kind: 'drill', prompt: 'fj jf fj jf fj jf' },
    ],
  },
  {
    id: 'home-row.04.intro-d',
    unit: 'Home Row',
    order: 4,
    title: 'Key: D',
    summary: 'Meet the D key — your left middle finger home.',
    unlockRequires: 'home-row.03.fj',
    steps: [
      {
        kind: 'intro_key',
        key: 'd',
        finger: 'L_MIDDLE',
        description: 'Rest your left middle finger on D, right next to F.',
      },
      { kind: 'drill', prompt: 'd d d d d d' },
      { kind: 'drill', prompt: 'dd df fd df fd' },
    ],
  },
  {
    id: 'home-row.05.intro-k',
    unit: 'Home Row',
    order: 5,
    title: 'Key: K',
    summary: 'Meet the K key — your right middle finger home.',
    unlockRequires: 'home-row.04.intro-d',
    steps: [
      {
        kind: 'intro_key',
        key: 'k',
        finger: 'R_MIDDLE',
        description: 'Rest your right middle finger on K, right next to J.',
      },
      { kind: 'drill', prompt: 'k k k k k k' },
      { kind: 'drill', prompt: 'kk kj jk kj jk' },
    ],
  },
  {
    id: 'home-row.06.dk',
    unit: 'Home Row',
    order: 6,
    title: 'Keys: D & K',
    summary: 'Mix D, K, F, and J.',
    unlockRequires: 'home-row.05.intro-k',
    steps: [
      { kind: 'drill', prompt: 'dk dk dk dk' },
      { kind: 'drill', prompt: 'fdk jkf fdk jkf' },
      { kind: 'drill', prompt: 'dfjk kjfd dfjk kjfd' },
    ],
  },
  {
    id: 'home-row.07.sl',
    unit: 'Home Row',
    order: 7,
    title: 'Keys: S & L',
    summary: 'Add the ring fingers — S and L.',
    unlockRequires: 'home-row.06.dk',
    steps: [
      {
        kind: 'intro_key',
        key: 's',
        finger: 'L_RING',
        description: 'Rest your left ring finger on S, next to D.',
      },
      {
        kind: 'intro_key',
        key: 'l',
        finger: 'R_RING',
        description: 'Rest your right ring finger on L, next to K.',
      },
      { kind: 'drill', prompt: 'sss lll sls lsl' },
      { kind: 'drill', prompt: 'sdf jkl sdf jkl' },
    ],
  },
  {
    id: 'home-row.08.words',
    unit: 'Home Row',
    order: 8,
    title: 'First Words',
    summary: 'Your first real words, all from home-row keys.',
    unlockRequires: 'home-row.07.sl',
    steps: [
      { kind: 'word_drill', words: ['fall', 'all', 'lad', 'ask', 'dad', 'flask', 'jall'] },
      {
        kind: 'practice',
        durationSeconds: 60,
        pool: ['fall', 'all', 'lad', 'ask', 'dad', 'flask', 'falls', 'jaks', 'sad', 'lass', 'lads'],
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

export function isLessonUnlocked(
  lesson: Lesson,
  progress: Record<string, { completed: boolean }>,
): boolean {
  if (!lesson.unlockRequires) {
    return true;
  }
  return Boolean(progress[lesson.unlockRequires]?.completed);
}

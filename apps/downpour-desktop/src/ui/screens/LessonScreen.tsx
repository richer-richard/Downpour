import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NeonButton } from '../components/NeonButton';
import { KeyboardHands } from '../components/KeyboardHands';
import {
  PracticeController,
  type PracticeState,
} from '../../learn/practiceController';
import {
  baseKey,
  findKey,
  FINGER_LABELS,
  shiftFingerFor,
  shiftKeyFor,
  type FingerId,
} from '../../learn/keyboardLayout';
import type { Lesson, LessonStep } from '../../learn/lessons';
import type { LessonCompletionInput } from '../../app/useLearnProgress';

interface LessonScreenProps {
  lesson: Lesson;
  onBack: () => void;
  onComplete: (result: LessonCompletionInput) => void | Promise<void>;
}

interface StepMetrics {
  correct: number;
  typed: number;
  mistakes: number;
  startedAt: number | null;
  endedAt: number | null;
}

const EMPTY_METRICS: StepMetrics = {
  correct: 0,
  typed: 0,
  mistakes: 0,
  startedAt: null,
  endedAt: null,
};

interface LessonMetrics {
  correct: number;
  typed: number;
  mistakes: number;
  elapsedSeconds: number;
  practiceWpm: number;
}

export function LessonScreen({ lesson, onBack, onComplete }: LessonScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [pressedKey, setPressedKey] = useState<string | undefined>(undefined);
  const pressedTimeout = useRef<number | null>(null);

  const metricsRef = useRef<LessonMetrics>({
    correct: 0,
    typed: 0,
    mistakes: 0,
    elapsedSeconds: 0,
    practiceWpm: 0,
  });

  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;

  const flashKey = useCallback((char: string) => {
    setPressedKey(char);
    if (pressedTimeout.current !== null) {
      window.clearTimeout(pressedTimeout.current);
    }
    pressedTimeout.current = window.setTimeout(() => {
      setPressedKey(undefined);
    }, 140);
  }, []);

  useEffect(() => {
    return () => {
      if (pressedTimeout.current !== null) {
        window.clearTimeout(pressedTimeout.current);
      }
    };
  }, []);

  const finalizeLesson = useCallback(
    (extra: Partial<LessonMetrics> = {}) => {
      const totals = { ...metricsRef.current, ...extra };
      const accuracy = totals.typed > 0 ? totals.correct / totals.typed : 1;
      const stars = accuracy >= 0.95 ? 3 : accuracy >= 0.85 ? 2 : 1;
      void onComplete({
        lessonId: lesson.id,
        stars,
        bestWpm: totals.practiceWpm,
        bestAccuracy: accuracy,
      });
    },
    [lesson.id, onComplete],
  );

  const advanceStep = useCallback(
    (stepContribution: StepMetrics, practiceWpm?: number) => {
      const elapsed =
        stepContribution.startedAt !== null && stepContribution.endedAt !== null
          ? (stepContribution.endedAt - stepContribution.startedAt) / 1000
          : 0;

      metricsRef.current = {
        correct: metricsRef.current.correct + stepContribution.correct,
        typed: metricsRef.current.typed + stepContribution.typed,
        mistakes: metricsRef.current.mistakes + stepContribution.mistakes,
        elapsedSeconds: metricsRef.current.elapsedSeconds + elapsed,
        practiceWpm:
          practiceWpm !== undefined
            ? Math.max(metricsRef.current.practiceWpm, practiceWpm)
            : metricsRef.current.practiceWpm,
      };

      if (isLastStep) {
        finalizeLesson();
      } else {
        setStepIndex((i) => i + 1);
      }
    },
    [finalizeLesson, isLastStep],
  );

  const handleSkip = useCallback(() => {
    if (isLastStep) {
      finalizeLesson();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [finalizeLesson, isLastStep]);

  const handlePrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const progress = ((stepIndex + 1) / lesson.steps.length) * 100;

  return (
    <div className="flex h-screen flex-col items-center gap-6 overflow-y-auto p-8">
      <header className="flex w-full max-w-4xl items-center justify-between">
        <button
          onClick={onBack}
          className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/80 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="font-display text-lg uppercase tracking-[0.24em] text-cyan-100">
          {lesson.unit} · {lesson.title}
        </h1>
        <div className="w-12" />
      </header>

      <div className="h-1 w-full max-w-4xl overflow-hidden rounded-full bg-cyan-300/10">
        <div
          className="h-full bg-cyan-300/70 shadow-neon transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex w-full max-w-4xl flex-1 flex-col items-center gap-6">
        <StepBody
          key={`${lesson.id}-${stepIndex}`}
          step={step}
          onAdvance={advanceStep}
          flashKey={flashKey}
          pressedKey={pressedKey}
        />
      </div>

      <footer className="flex w-full max-w-4xl items-center justify-between">
        <NeonButton onClick={handlePrev} disabled={stepIndex === 0}>
          Previous
        </NeonButton>
        <span className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/60">
          Step {stepIndex + 1} / {lesson.steps.length}
        </span>
        <NeonButton onClick={handleSkip}>Skip</NeonButton>
      </footer>
    </div>
  );
}

interface StepBodyProps {
  step: LessonStep;
  onAdvance: (metrics: StepMetrics, practiceWpm?: number) => void;
  flashKey: (char: string) => void;
  pressedKey: string | undefined;
}

function StepBody({ step, onAdvance, flashKey, pressedKey }: StepBodyProps) {
  switch (step.kind) {
    case 'intro_key':
      return (
        <IntroKeyStep step={step} onAdvance={onAdvance} flashKey={flashKey} pressedKey={pressedKey} />
      );
    case 'drill':
      return (
        <DrillStep
          prompt={step.prompt}
          hint={step.hint}
          onAdvance={onAdvance}
          flashKey={flashKey}
          pressedKey={pressedKey}
        />
      );
    case 'word_drill':
      return (
        <DrillStep
          prompt={step.words.join(' ')}
          hint={step.hint}
          onAdvance={onAdvance}
          flashKey={flashKey}
          pressedKey={pressedKey}
        />
      );
    case 'practice':
      return <PracticeStep step={step} onAdvance={onAdvance} flashKey={flashKey} pressedKey={pressedKey} />;
  }
}

function useLessonKeyListener(handler: (char: string) => void, onBackspace?: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackspace?.();
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        handler(event.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, onBackspace]);
}

function highlightsFor(char: string | undefined): {
  keys: string[];
  fingers: FingerId[];
} {
  if (!char) return { keys: [], fingers: [] };
  const base = baseKey(char);
  const keyDef = findKey(base);
  const keys: string[] = [base];
  const fingers: FingerId[] = keyDef ? [keyDef.finger] : [];
  const sKey = shiftKeyFor(char);
  const sFinger = shiftFingerFor(char);
  if (sKey) keys.push(sKey);
  if (sFinger) fingers.push(sFinger);
  return { keys, fingers };
}

interface IntroKeyStepProps {
  step: Extract<LessonStep, { kind: 'intro_key' }>;
  onAdvance: (metrics: StepMetrics, practiceWpm?: number) => void;
  flashKey: (char: string) => void;
  pressedKey: string | undefined;
}

function IntroKeyStep({ step, onAdvance, flashKey, pressedKey }: IntroKeyStepProps) {
  const metricsRef = useRef<StepMetrics>({ ...EMPTY_METRICS });

  const handler = useCallback(
    (char: string) => {
      flashKey(char);
      const m = metricsRef.current;
      if (m.startedAt === null) m.startedAt = Date.now();
      m.typed += 1;
      if (char === step.key) {
        m.correct += 1;
        m.endedAt = Date.now();
        onAdvance({ ...m });
      } else {
        m.mistakes += 1;
      }
    },
    [flashKey, onAdvance, step.key],
  );

  useLessonKeyListener(handler);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/60">
        New key introduction
      </p>
      <h2 className="text-center text-2xl text-cyan-50">
        Type the{' '}
        <span className="mx-2 inline-block rounded-md border border-cyan-300/70 bg-cyan-300/20 px-3 py-1 font-display text-3xl text-white shadow-neon">
          {step.key.toUpperCase()}
        </span>{' '}
        key using your {FINGER_LABELS[step.finger]}.
      </h2>
      <p className="max-w-xl text-center text-sm text-cyan-100/70">{step.description}</p>
      {(() => {
        const h = highlightsFor(step.key);
        return (
          <KeyboardHands highlightKey={h.keys} highlightFinger={h.fingers} pressedKey={pressedKey} />
        );
      })()}
    </div>
  );
}

interface DrillStepProps {
  prompt: string;
  hint?: string;
  onAdvance: (metrics: StepMetrics, practiceWpm?: number) => void;
  flashKey: (char: string) => void;
  pressedKey: string | undefined;
}

function DrillStep({ prompt, hint, onAdvance, flashKey, pressedKey }: DrillStepProps) {
  const [typed, setTyped] = useState('');
  const metricsRef = useRef<StepMetrics>({ ...EMPTY_METRICS });

  const nextChar = prompt[typed.length];
  const nextHighlights = highlightsFor(nextChar);

  const handler = useCallback(
    (char: string) => {
      flashKey(char);
      const m = metricsRef.current;
      if (m.startedAt === null) m.startedAt = Date.now();
      m.typed += 1;
      const expected = prompt[typed.length];
      if (expected === undefined) return;
      if (char === expected) {
        m.correct += 1;
        const nextTyped = typed + char;
        setTyped(nextTyped);
        if (nextTyped.length === prompt.length) {
          m.endedAt = Date.now();
          onAdvance({ ...m });
        }
      } else {
        m.mistakes += 1;
      }
    },
    [flashKey, onAdvance, prompt, typed],
  );

  const onBackspace = useCallback(() => {
    setTyped((prev) => prev.slice(0, -1));
  }, []);

  useLessonKeyListener(handler, onBackspace);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {hint ? (
        <p className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/60">{hint}</p>
      ) : null}
      <div className="font-display text-3xl tracking-[0.3em] text-cyan-100/40">
        {prompt.split('').map((char, idx) => {
          let color = 'text-cyan-100/30';
          if (idx < typed.length) {
            color = typed[idx] === char ? 'text-cyan-200' : 'text-red-400';
          } else if (idx === typed.length) {
            color = 'text-white underline decoration-cyan-200';
          }
          return (
            <span key={idx} className={color}>
              {char === ' ' ? '\u00a0' : char}
            </span>
          );
        })}
      </div>
      <KeyboardHands
        highlightKey={nextHighlights.keys}
        highlightFinger={nextHighlights.fingers}
        pressedKey={pressedKey}
      />
    </div>
  );
}

interface PracticeStepProps {
  step: Extract<LessonStep, { kind: 'practice' }>;
  onAdvance: (metrics: StepMetrics, practiceWpm?: number) => void;
  flashKey: (char: string) => void;
  pressedKey: string | undefined;
}

function PracticeStep({ step, onAdvance, flashKey, pressedKey }: PracticeStepProps) {
  const controllerRef = useRef<PracticeController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new PracticeController({
      pool: step.pool,
      durationSeconds: step.durationSeconds,
    });
  }

  const [snapshot, setSnapshot] = useState<PracticeState>(() => controllerRef.current!.state());
  const finishedRef = useRef(false);

  const refresh = useCallback(() => {
    const state = controllerRef.current!.state();
    setSnapshot(state);
    if (state.finished && !finishedRef.current) {
      finishedRef.current = true;
      onAdvance(
        {
          correct: state.correctChars,
          typed: state.totalTyped,
          mistakes: state.mistakes,
          startedAt: 0,
          endedAt: Math.round(state.elapsedSeconds * 1000),
        },
        state.wpm,
      );
    }
  }, [onAdvance]);

  const handler = useCallback(
    (char: string) => {
      flashKey(char);
      controllerRef.current!.handlePrintable(char);
      refresh();
    },
    [flashKey, refresh],
  );

  const onBackspace = useCallback(() => {
    controllerRef.current!.handleBackspace();
    refresh();
  }, [refresh]);

  useLessonKeyListener(handler, onBackspace);

  useEffect(() => {
    const id = window.setInterval(() => {
      controllerRef.current!.tick();
      refresh();
    }, 500);
    return () => window.clearInterval(id);
  }, [refresh]);

  const remainingSeconds = useMemo(() => {
    return Math.max(0, Math.round(step.durationSeconds - snapshot.elapsedSeconds));
  }, [snapshot.elapsedSeconds, step.durationSeconds]);

  const nextChar = snapshot.currentWord[snapshot.typed.length] ?? ' ';
  const nextHighlights = highlightsFor(nextChar);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full max-w-2xl items-center justify-between font-display text-xs uppercase tracking-[0.24em] text-cyan-200/70">
        <span>WPM: {Math.round(snapshot.wpm)}</span>
        <span>Accuracy: {Math.round(snapshot.accuracy * 100)}%</span>
        <span>Time: {remainingSeconds}s</span>
      </div>

      <div className="font-display text-5xl tracking-[0.2em]">
        {snapshot.currentWord.split('').map((char, idx) => {
          let color = 'text-cyan-100/30';
          if (idx < snapshot.typed.length) {
            color = snapshot.typed[idx] === char ? 'text-cyan-200' : 'text-red-400';
          } else if (idx === snapshot.typed.length) {
            color = 'text-white underline decoration-cyan-200';
          }
          return (
            <span key={idx} className={color}>
              {char}
            </span>
          );
        })}
      </div>

      <KeyboardHands
        highlightKey={nextHighlights.keys}
        highlightFinger={nextHighlights.fingers}
        pressedKey={pressedKey}
      />
    </div>
  );
}

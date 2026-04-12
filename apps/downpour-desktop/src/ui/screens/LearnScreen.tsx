import { LESSONS, isLessonUnlocked, type Lesson } from '../../learn/lessons';
import type { LessonProgress } from '@downpour/shared';

interface LearnScreenProps {
  progress: Record<string, LessonProgress>;
  onSelectLesson: (id: string) => void;
  onBack: () => void;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={
            i <= count
              ? 'text-base text-cyan-200 drop-shadow-[0_0_6px_rgba(124,220,255,0.9)]'
              : 'text-base text-cyan-100/20'
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

function LessonCard({
  lesson,
  progress,
  unlocked,
  onSelect,
}: {
  lesson: Lesson;
  progress: LessonProgress | undefined;
  unlocked: boolean;
  onSelect: (id: string) => void;
}) {
  const stars = progress?.stars ?? 0;
  const completed = progress?.completed ?? false;

  return (
    <button
      disabled={!unlocked}
      onClick={() => onSelect(lesson.id)}
      aria-label={`${lesson.unit}: ${lesson.title}`}
      className={[
        'glass-panel relative flex aspect-[5/4] w-full flex-col items-center justify-center gap-3 rounded-xl p-4 text-center transition',
        unlocked
          ? 'hover:border-cyan-200 hover:shadow-neon'
          : 'cursor-not-allowed opacity-40',
      ].join(' ')}
    >
      <span className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/60">
        Lesson {lesson.order}
      </span>
      <span className="font-display text-xl uppercase tracking-[0.16em] text-cyan-50">
        {lesson.title}
      </span>
      <span className="text-[11px] text-cyan-100/60">{lesson.summary}</span>
      <Stars count={stars} />
      {!unlocked ? (
        <span className="absolute right-3 top-3 font-display text-xs uppercase tracking-[0.24em] text-cyan-100/50">
          🔒
        </span>
      ) : null}
      {completed ? (
        <span className="absolute left-3 top-3 font-display text-xs uppercase tracking-[0.24em] text-cyan-200">
          ✓
        </span>
      ) : null}
    </button>
  );
}

export function LearnScreen({ progress, onSelectLesson, onBack }: LearnScreenProps) {
  const totalStars = LESSONS.reduce((sum, lesson) => sum + (progress[lesson.id]?.stars ?? 0), 0);
  const maxStars = LESSONS.length * 3;
  const completionPct = Math.round((totalStars / Math.max(1, maxStars)) * 100);

  return (
    <div className="flex h-screen flex-col items-center gap-6 overflow-y-auto p-8">
      <header className="flex w-full max-w-5xl items-center justify-between">
        <button
          onClick={onBack}
          className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/80 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="font-display text-xl uppercase tracking-[0.24em] text-cyan-50">
          Learn to Type
        </h1>
        <span className="font-display text-xs uppercase tracking-[0.24em] text-cyan-200/70">
          {completionPct}% · {totalStars} stars
        </span>
      </header>

      {(() => {
        const units: string[] = [];
        for (const lesson of LESSONS) {
          if (!units.includes(lesson.unit)) units.push(lesson.unit);
        }
        return units.map((unit) => (
          <section key={unit} className="w-full max-w-5xl">
            <h2 className="mb-4 font-display text-sm uppercase tracking-[0.24em] text-cyan-200/80">
              {unit}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {LESSONS.filter((lesson) => lesson.unit === unit).map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  progress={progress[lesson.id]}
                  unlocked={isLessonUnlocked(lesson, progress)}
                  onSelect={onSelectLesson}
                />
              ))}
            </div>
          </section>
        ));
      })()}
    </div>
  );
}

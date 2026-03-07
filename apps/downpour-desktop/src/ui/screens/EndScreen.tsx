import type { SessionEndSummary } from '../../game/gameController';
import { NeonButton } from '../components/NeonButton';

interface EndScreenProps {
  summary: SessionEndSummary;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onRestart: () => void;
  onOpenRecords: () => void;
  onBackToStart: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function EndScreen(props: EndScreenProps) {
  const { summary, saveStatus, onRestart, onOpenRecords, onBackToStart } = props;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-7 sm:p-9">
        <h1 className="neon-text mb-6 font-display text-4xl uppercase tracking-[0.2em]">Storm Ended</h1>

        <div className="mb-6 grid grid-cols-1 gap-3 text-lg text-cyan-50/90 sm:grid-cols-2">
          <div>Score: {summary.score}</div>
          <div>Level Reached: {summary.levelReached}</div>
          <div>Session Best WPM: {summary.sessionBestWpm.toFixed(1)}</div>
          <div>Average WPM: {summary.averageWpm.toFixed(1)}</div>
          <div>Accuracy: {(summary.accuracy * 100).toFixed(1)}%</div>
          <div>Time Survived: {formatDuration(summary.durationSeconds)}</div>
          <div>Mistakes: {summary.mistakes}</div>
          <div>Misses: {summary.misses}</div>
        </div>

        <p className="mb-6 text-sm uppercase tracking-[0.2em] text-cyan-100/75">
          Save Status: {saveStatus === 'idle' ? 'Pending' : saveStatus}
        </p>

        <div className="flex flex-wrap gap-3">
          <NeonButton onClick={onRestart}>Restart</NeonButton>
          <NeonButton onClick={onOpenRecords}>Records</NeonButton>
          <NeonButton onClick={onBackToStart}>Home</NeonButton>
        </div>
      </div>
    </div>
  );
}

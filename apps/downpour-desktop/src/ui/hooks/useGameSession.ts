import type { GameSettings, GraphicsQuality } from '@downpour/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasRenderer } from '../../engine/canvasRenderer';
import { GameLoop } from '../../engine/gameLoop';
import { PerformanceProfile } from '../../engine/performanceProfile';
import { AudioEngine } from '../../game/audio';
import { GameController, type HudSnapshot, type SessionEndSummary } from '../../game/gameController';

interface UseGameSessionOptions {
  settings: GameSettings;
  globalBestWpm: number;
  onRunEnd: (summary: SessionEndSummary) => void;
}

interface UseGameSessionResult {
  setBgCanvas: (canvas: HTMLCanvasElement | null) => void;
  setFxCanvas: (canvas: HTMLCanvasElement | null) => void;
  setWordCanvas: (canvas: HTMLCanvasElement | null) => void;
  hud: HudSnapshot;
  paused: boolean;
  effectiveQuality: GraphicsQuality;
  togglePause: () => void;
  handlePrintable: (value: string) => void;
  handleBackspace: () => void;
  unlockAudio: () => Promise<void>;
}

function createInitialHud(globalBestWpm: number): HudSnapshot {
  return {
    elapsedSeconds: 0,
    level: 1,
    score: 0,
    combo: 0,
    lives: 5,
    waterLevel: 0,
    accuracy: 0,
    currentWpm: 0,
    sessionBestWpm: 0,
    globalBestWpm,
    isPaused: false,
    isGameOver: false,
  };
}

export function useGameSession(options: UseGameSessionOptions): UseGameSessionResult {
  const { settings, globalBestWpm, onRunEnd } = options;

  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null);
  const [fxCanvas, setFxCanvas] = useState<HTMLCanvasElement | null>(null);
  const [wordCanvas, setWordCanvas] = useState<HTMLCanvasElement | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => createInitialHud(globalBestWpm));
  const [paused, setPaused] = useState(false);
  const [effectiveQuality, setEffectiveQuality] = useState<GraphicsQuality>(settings.graphicsQuality);

  const controllerRef = useRef<GameController | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);

  const handlePrintable = useCallback((value: string) => {
    controllerRef.current?.handlePrintableInput(value);
    audioRef.current?.playKey();
  }, []);

  const handleBackspace = useCallback(() => {
    controllerRef.current?.handleBackspace();
  }, []);

  const togglePause = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller || controller.isGameOver()) {
      return;
    }

    if (controller.isPaused()) {
      controller.resume();
      setPaused(false);
      void audioRef.current?.unlock();
      return;
    }

    controller.pause();
    setPaused(true);
    audioRef.current?.suspend();
  }, []);

  const unlockAudio = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }
    await audioRef.current.unlock();
  }, []);

  useEffect(() => {
    if (!bgCanvas || !fxCanvas || !wordCanvas) {
      return undefined;
    }

    const controller = new GameController({ settings, globalBestWpm });
    const audio = new AudioEngine(settings.soundEnabled);
    const renderer = new CanvasRenderer({
      bgCanvas,
      fxCanvas,
      wordCanvas,
      quality: settings.graphicsQuality,
    });
    const profile = new PerformanceProfile({ initialQuality: settings.graphicsQuality });

    controllerRef.current = controller;
    audioRef.current = audio;
    setHud(controller.getHudSnapshot());
    setPaused(false);
    setEffectiveQuality(settings.graphicsQuality);

    let ended = false;
    let hudTick = 0;

    const loop = new GameLoop({
      fixedStepSeconds: 1 / 60,
      maxSubSteps: 5,
      update: (dtSeconds) => {
        controller.update(dtSeconds);
        hudTick += dtSeconds;

        if (hudTick >= 0.08) {
          hudTick = 0;
          setHud(controller.getHudSnapshot());
        }

        if (!ended && controller.isGameOver()) {
          ended = true;
          setHud(controller.getHudSnapshot());
          loop.stop();
          onRunEnd(controller.buildEndSummary());
        }
      },
      render: (_alpha, frameMs) => {
        const sampledQuality = profile.sampleFrame(frameMs);
        if (sampledQuality !== renderer.getQuality()) {
          renderer.setQuality(sampledQuality);
          setEffectiveQuality(sampledQuality);
        }

        const impacts = controller.consumeImpacts();
        for (const impact of impacts) {
          if (impact.type === 'miss') {
            audio.playMiss();
          } else {
            audio.playSuccess();
          }
        }

        renderer.render({
          snapshot: controller.getRenderSnapshot(),
          impacts,
          frameMs,
          quality: {
            quality: sampledQuality,
            reducedMotion: settings.reducedMotion,
          },
        });
      },
    });

    const onWindowBlur = (): void => {
      if (controller.isGameOver() || controller.isPaused()) {
        return;
      }

      controller.pause();
      setPaused(true);
      audio.suspend();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        onWindowBlur();
      }
    };

    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    loop.start();

    return () => {
      loop.stop();
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer.destroy();
      audio.destroy();
      controllerRef.current = null;
      audioRef.current = null;
    };
  }, [bgCanvas, fxCanvas, globalBestWpm, onRunEnd, settings, wordCanvas]);

  return {
    setBgCanvas,
    setFxCanvas,
    setWordCanvas,
    hud,
    paused,
    effectiveQuality,
    togglePause,
    handlePrintable,
    handleBackspace,
    unlockAudio,
  };
}

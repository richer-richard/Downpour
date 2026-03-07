import type {
  GameAction,
  GameSessionFrame,
  GameSettings,
  GraphicsQuality,
  HudSnapshot,
  SessionEndSummary,
} from '@downpour/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasRenderer } from '../../engine/canvasRenderer';
import { GameLoop } from '../../engine/gameLoop';
import { PerformanceProfile } from '../../engine/performanceProfile';
import { AudioEngine } from '../../game/audio';
import { GameController } from '../../game/gameController';
import {
  createGameSessionCommand,
  destroyGameSessionCommand,
  tickGameSessionCommand,
} from '../../tauri/commands';
import { isTauriRuntime } from '../../tauri/runtime';

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
  const hudRef = useRef<HudSnapshot>(createInitialHud(globalBestWpm));
  const pausedRef = useRef(false);
  const rustSessionIdRef = useRef<string | null>(null);
  const rustPendingActionsRef = useRef<GameAction[]>([]);
  const rustPendingDeltaRef = useRef(0);
  const rustFrameMsRef = useRef(16.67);
  const rustInFlightRef = useRef(false);
  const rustFlushRef = useRef<(() => void | Promise<void>) | null>(null);

  useEffect(() => {
    hudRef.current = hud;
  }, [hud]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handlePrintable = useCallback((value: string) => {
    if (isTauriRuntime()) {
      rustPendingActionsRef.current.push({ type: 'printable', value });
      void rustFlushRef.current?.();
    } else {
      controllerRef.current?.handlePrintableInput(value);
    }

    audioRef.current?.playKey();
  }, []);

  const handleBackspace = useCallback(() => {
    if (isTauriRuntime()) {
      rustPendingActionsRef.current.push({ type: 'backspace' });
      void rustFlushRef.current?.();
      return;
    }

    controllerRef.current?.handleBackspace();
  }, []);

  const togglePause = useCallback(() => {
    if (hudRef.current.isGameOver) {
      return;
    }

    const nextPaused = !hudRef.current.isPaused;
    setPaused(nextPaused);
    pausedRef.current = nextPaused;

    if (nextPaused) {
      audioRef.current?.suspend();
    } else {
      void audioRef.current?.unlock();
    }

    if (isTauriRuntime()) {
      rustPendingActionsRef.current.push({ type: 'setPaused', paused: nextPaused });
      void rustFlushRef.current?.();
      return;
    }

    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    if (nextPaused) {
      controller.pause();
    } else {
      controller.resume();
    }
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

    const audio = new AudioEngine(settings.soundEnabled);
    const renderer = new CanvasRenderer({
      bgCanvas,
      fxCanvas,
      wordCanvas,
      quality: settings.graphicsQuality,
    });
    const profile = new PerformanceProfile({ initialQuality: settings.graphicsQuality });

    audioRef.current = audio;
    controllerRef.current = null;
    rustSessionIdRef.current = null;
    rustPendingActionsRef.current = [];
    rustPendingDeltaRef.current = 0;
    rustInFlightRef.current = false;
    rustFrameMsRef.current = 16.67;
    rustFlushRef.current = null;
    setHud(createInitialHud(globalBestWpm));
    setPaused(false);
    pausedRef.current = false;
    setEffectiveQuality(settings.graphicsQuality);

    let destroyed = false;
    let ended = false;
    let lastHudSyncAt = 0;
    let hasPublishedHud = false;

    const publishFrame = (frame: GameSessionFrame): void => {
      hudRef.current = frame.hud;
      if (
        !hasPublishedHud ||
        frame.hud.isGameOver ||
        frame.hud.isPaused !== pausedRef.current ||
        frame.hud.elapsedSeconds - lastHudSyncAt >= 0.08
      ) {
        hasPublishedHud = true;
        lastHudSyncAt = frame.hud.elapsedSeconds;
        setHud(frame.hud);
      }

      if (frame.hud.isPaused !== pausedRef.current) {
        setPaused(frame.hud.isPaused);
        pausedRef.current = frame.hud.isPaused;
      }

      const sampledQuality = profile.sampleFrame(rustFrameMsRef.current);
      if (sampledQuality !== renderer.getQuality()) {
        renderer.setQuality(sampledQuality);
        setEffectiveQuality(sampledQuality);
      }

      for (const impact of frame.impacts) {
        if (impact.type === 'miss') {
          audio.playMiss();
        } else {
          audio.playSuccess();
        }
      }

      renderer.render({
        snapshot: frame.renderSnapshot,
        impacts: frame.impacts,
        frameMs: rustFrameMsRef.current,
        quality: {
          quality: sampledQuality,
          reducedMotion: settings.reducedMotion,
        },
      });

      if (!ended && frame.endSummary) {
        ended = true;
        setHud(frame.hud);
        setPaused(false);
        pausedRef.current = false;
        onRunEnd(frame.endSummary);
      }
    };

    if (!isTauriRuntime()) {
      const controller = new GameController({ settings, globalBestWpm });
      controllerRef.current = controller;
      setHud(controller.getHudSnapshot());

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
        pausedRef.current = true;
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
        destroyed = true;
        loop.stop();
        window.removeEventListener('blur', onWindowBlur);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        renderer.destroy();
        audio.destroy();
        controllerRef.current = null;
        audioRef.current = null;
      };
    }

    let rafId = 0;
    let lastTimestamp = performance.now();

    const flushRemoteFrame = async (): Promise<void> => {
      if (destroyed || rustInFlightRef.current || !rustSessionIdRef.current) {
        return;
      }

      const actions = rustPendingActionsRef.current.splice(0, rustPendingActionsRef.current.length);
      const deltaSeconds = rustPendingDeltaRef.current;

      if (deltaSeconds <= 0 && actions.length === 0) {
        return;
      }

      rustPendingDeltaRef.current = 0;
      rustInFlightRef.current = true;

      try {
        const frame = await tickGameSessionCommand(rustSessionIdRef.current, deltaSeconds, actions);
        publishFrame(frame);
      } catch (error) {
        console.error('Failed to tick Rust game session.', error);
      } finally {
        rustInFlightRef.current = false;
        if (!destroyed && (rustPendingDeltaRef.current > 0 || rustPendingActionsRef.current.length > 0)) {
          void flushRemoteFrame();
        }
      }
    };

    rustFlushRef.current = flushRemoteFrame;

    const onAnimationFrame = (timestamp: number): void => {
      rustFrameMsRef.current = Math.min(100, timestamp - lastTimestamp);
      lastTimestamp = timestamp;
      rustPendingDeltaRef.current += rustFrameMsRef.current / 1000;
      void flushRemoteFrame();
      rafId = requestAnimationFrame(onAnimationFrame);
    };

    const onWindowBlur = (): void => {
      if (hudRef.current.isGameOver || hudRef.current.isPaused) {
        return;
      }

      rustPendingActionsRef.current.push({ type: 'setPaused', paused: true });
      setPaused(true);
      pausedRef.current = true;
      audio.suspend();
      void flushRemoteFrame();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        onWindowBlur();
      }
    };

    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    void (async () => {
      try {
        const frame = await createGameSessionCommand(settings, globalBestWpm);
        if (destroyed) {
          return;
        }

        rustSessionIdRef.current = frame.sessionId;
        publishFrame(frame);
        rafId = requestAnimationFrame(onAnimationFrame);
      } catch (error) {
        console.error('Failed to create Rust game session.', error);
      }
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer.destroy();
      audio.destroy();
      audioRef.current = null;
      rustFlushRef.current = null;

      const sessionId = rustSessionIdRef.current;
      rustSessionIdRef.current = null;
      if (sessionId) {
        void destroyGameSessionCommand(sessionId);
      }
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

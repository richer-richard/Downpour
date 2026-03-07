import type { GraphicsQuality } from '@downpour/shared';

export type ImpactType = 'miss' | 'clear';

export interface ImpactEvent {
  x: number;
  y: number;
  strength: number;
  type: ImpactType;
}

export interface RenderWord {
  id: string;
  text: string;
  x: number;
  y: number;
  typedCount: number;
  speed: number;
  mistakeFlash: number;
}

export interface SessionRenderSnapshot {
  elapsedSeconds: number;
  waterLevel: number;
  wind: number;
  groundLine: number;
  words: RenderWord[];
}

export interface RenderQualitySettings {
  quality: GraphicsQuality;
  reducedMotion: boolean;
}

export interface RenderFrame {
  snapshot: SessionRenderSnapshot;
  impacts: ImpactEvent[];
  frameMs: number;
  quality: RenderQualitySettings;
}

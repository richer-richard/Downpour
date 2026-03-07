import type { GraphicsQuality, ImpactEvent, SessionRenderSnapshot } from '@downpour/shared';

export type { ImpactEvent, RenderWord, SessionRenderSnapshot } from '@downpour/shared';

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

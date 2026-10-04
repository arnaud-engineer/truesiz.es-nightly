// SPDX-License-Identifier: MPL-2.0
import type { CssPixels, Observation, RenderingContext } from './core.mjs';

export interface ContextHost {
  readonly screen?: { readonly width?: unknown; readonly height?: unknown } | null;
  readonly devicePixelRatio?: unknown;
  readonly visualViewport?: { readonly scale?: unknown } | null;
}
export function readBrowserContext(input: {
  window: ContextHost;
  zone: string;
  zoneGeometry: RenderingContext['zoneGeometry'];
  now?: () => number;
}): {
  context: RenderingContext;
  observations: {
    screenWidthCss: Observation<CssPixels>;
    screenHeightCss: Observation<CssPixels>;
    pageDpr: Observation<number>;
    visualScale: Observation<number>;
  };
};
export function acquireModel(input: {
  navigator: object;
  requested?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  now?: () => number;
}): Promise<Observation<string>>;

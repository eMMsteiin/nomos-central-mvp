import { getStroke } from 'perfect-freehand';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';
import type { Point, PenConfig } from './types';

function getFountainConfig(config: PenConfig) {
  const pressureMultiplier = config.pressureSensitivity / 100;
  const sharpnessMultiplier = config.tipSharpness / 100;

  return {
    size: config.width * 2,
    thinning: 0.35 * pressureMultiplier,
    smoothing: 0.65,
    streamline: 0.72,
    easing: (t: number) => t,
    simulatePressure: false,
    last: true,
    start: {
      cap: true,
      taper: sharpnessMultiplier * 25 + 5,
      easing: (t: number) => t * t,
    },
    end: {
      cap: true,
      taper: sharpnessMultiplier * 25 + 5,
      easing: (t: number) => t * t,
    },
  };
}

export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  const inputPoints = stroke.points.map(
    (p) => [p.x, p.y, p.pressure ?? 0.5] as [number, number, number]
  );

  const config = getFountainConfig({
    color: stroke.color,
    width: stroke.width,
    pressureSensitivity: 50,
    tipSharpness: 50,
  });

  const outline = getStroke(inputPoints, config);
  if (outline.length < 2) return;

  ctx.fillStyle = stroke.color;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

export function renderLiveStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  config: PenConfig
) {
  if (points.length === 0) return;

  const inputPoints = points.map(
    (p) => [p.x, p.y, p.pressure] as [number, number, number]
  );
  const cfg = getFountainConfig(config);
  const outline = getStroke(inputPoints, cfg);

  if (outline.length < 2) return;

  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

import { getStroke } from 'perfect-freehand';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';
import type { Point, PenConfig } from './types';

const outlineCache = new Map<string, number[][]>();

function getCacheKey(stroke: Stroke) {
  const lastPoint = stroke.points[stroke.points.length - 1];
  return `${stroke.id}:${stroke.color}:${stroke.width}:${stroke.points.length}:${lastPoint?.x ?? 0}:${lastPoint?.y ?? 0}:${lastPoint?.pressure ?? 0}`;
}

function getFountainConfig(config: PenConfig) {
  const pressureMultiplier = config.pressureSensitivity / 100;
  const sharpnessMultiplier = config.tipSharpness / 100;

  return {
    size: config.width * 2,
    thinning: config.pressureEnabled ? 0.35 * pressureMultiplier : 0,
    // Mais responsivo: streamline baixo = ponta segue a Pencil de perto.
    // smoothing alto = curva final lisa sem facetas.
    smoothing: 0.55,
    streamline: 0.18,
    easing: (t: number) => t,
    simulatePressure: false,
    last: true,
    start: {
      cap: true,
      taper: config.pressureEnabled ? sharpnessMultiplier * 25 + 5 : 0,
      easing: (t: number) => t * t,
    },
    end: {
      cap: true,
      taper: config.pressureEnabled ? sharpnessMultiplier * 25 + 5 : 0,
      easing: (t: number) => t * t,
    },
  };
}

/**
 * Desenha um polígono usando curvas quadráticas entre os pontos.
 * Técnica oficial recomendada pela documentação do perfect-freehand.
 * Cada ponto vira control point e o ponto médio até o próximo é o endpoint,
 * gerando curvas matematicamente contínuas em vez de facetas retas.
 */
function drawSmoothPolygon(ctx: CanvasRenderingContext2D, points: number[][]) {
  if (points.length < 2) return;

  if (points.length < 4) {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    return;
  }

  const first = points[0];
  const second = points[1];
  ctx.moveTo((first[0] + second[0]) / 2, (first[1] + second[1]) / 2);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current[0] + next[0]) / 2;
    const midY = (current[1] + next[1]) / 2;
    ctx.quadraticCurveTo(current[0], current[1], midX, midY);
  }

  const last = points[points.length - 1];
  ctx.quadraticCurveTo(last[0], last[1], first[0], first[1]);
  ctx.closePath();
}

export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  const cacheKey = getCacheKey(stroke);
  let outline = outlineCache.get(cacheKey);

  if (!outline) {
    const inputPoints = stroke.points.map(
      (p) => [p.x, p.y, p.pressure ?? 0.5] as [number, number, number]
    );

    const hasPressureVariation = stroke.points.some(
      (p) => p.pressure !== undefined && Math.abs((p.pressure ?? 0.5) - 0.5) > 0.01
    );

    const config = getFountainConfig({
      color: stroke.color,
      width: stroke.width,
      pressureSensitivity: 50,
      tipSharpness: 50,
      pressureEnabled: hasPressureVariation,
      jitterFilterEnabled: true,
      jitterStrength: 50,
      stabilizerStrength: 10,
    });

    outline = getStroke(inputPoints, config);
    if (outlineCache.size > 500) {
      const firstKey = outlineCache.keys().next().value;
      if (firstKey) outlineCache.delete(firstKey);
    }
    outlineCache.set(cacheKey, outline);
  }

  if (outline.length < 2) return;

  ctx.fillStyle = stroke.color;
  ctx.beginPath();
  drawSmoothPolygon(ctx, outline);
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
  drawSmoothPolygon(ctx, outline);
  ctx.fill();
}

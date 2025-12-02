import { Point } from '@/types/notebook';

// Catmull-Rom spline interpolation for smooth curves
export function catmullRomSpline(points: Point[], tension: number = 0.5): Point[] {
  if (points.length < 2) return points;
  if (points.length === 2) return points;

  const result: Point[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Add segments between p1 and p2
    const segments = Math.max(2, Math.ceil(distance(p1, p2) / 3));
    
    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const point = catmullRomPoint(p0, p1, p2, p3, s, tension);
      
      // Interpolate pressure if available
      if (p1.pressure !== undefined && p2.pressure !== undefined) {
        point.pressure = p1.pressure + (p2.pressure - p1.pressure) * s;
      }
      
      result.push(point);
    }
  }
  
  // Add the last point
  result.push(points[points.length - 1]);
  
  return result;
}

function catmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number, tension: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const v0x = (p2.x - p0.x) * tension;
  const v0y = (p2.y - p0.y) * tension;
  const v1x = (p3.x - p1.x) * tension;
  const v1y = (p3.y - p1.y) * tension;

  const x = (2 * p1.x - 2 * p2.x + v0x + v1x) * t3 +
            (-3 * p1.x + 3 * p2.x - 2 * v0x - v1x) * t2 +
            v0x * t +
            p1.x;

  const y = (2 * p1.y - 2 * p2.y + v0y + v1y) * t3 +
            (-3 * p1.y + 3 * p2.y - 2 * v0y - v1y) * t2 +
            v0y * t +
            p1.y;

  return { x, y };
}

// Simple moving average smoothing
export function smoothPoints(points: Point[], windowSize: number = 3): Point[] {
  if (points.length < windowSize) return points;

  const result: Point[] = [];
  const half = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let sumPressure = 0;
    let count = 0;
    let hasPressure = false;

    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      sumX += points[j].x;
      sumY += points[j].y;
      if (points[j].pressure !== undefined) {
        sumPressure += points[j].pressure;
        hasPressure = true;
      }
      count++;
    }

    const smoothedPoint: Point = {
      x: sumX / count,
      y: sumY / count,
    };

    if (hasPressure) {
      smoothedPoint.pressure = sumPressure / count;
    }

    result.push(smoothedPoint);
  }

  return result;
}

// Calculate distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate velocity-based pressure simulation for mouse
export function calculateVelocityPressure(
  currentPoint: Point,
  previousPoint: Point | null,
  deltaTime: number
): number {
  if (!previousPoint || deltaTime === 0) return 0.5;

  const dist = distance(currentPoint, previousPoint);
  const velocity = dist / deltaTime;
  
  // Map velocity to pressure (slower = more pressure)
  // Typical stylus velocity range: 0-1000 px/s
  const normalizedVelocity = Math.min(velocity / 500, 1);
  const pressure = 1 - normalizedVelocity * 0.6; // Keep pressure between 0.4 and 1.0
  
  return Math.max(0.2, Math.min(1, pressure));
}

// Simplify points using Ramer-Douglas-Peucker algorithm
export function simplifyPoints(points: Point[], epsilon: number = 1): Point[] {
  if (points.length < 3) return points;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (d > maxDistance) {
      maxDistance = d;
      maxIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [firstPoint, lastPoint];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return distance(point, lineStart);
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const closestPoint: Point = {
    x: lineStart.x + clampedT * dx,
    y: lineStart.y + clampedT * dy,
  };

  return distance(point, closestPoint);
}

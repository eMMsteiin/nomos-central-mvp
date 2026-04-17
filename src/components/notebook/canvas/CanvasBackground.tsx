import { PAGE_WIDTH, PAGE_HEIGHT } from './types';
import type { ViewportState } from './types';

interface CanvasBackgroundProps {
  paperTemplate: string;
  viewport: ViewportState;
}

export function CanvasBackground({ paperTemplate, viewport }: CanvasBackgroundProps) {
  const style: React.CSSProperties = {
    transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
    transformOrigin: '0 0',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div style={style} className="bg-white shadow-md">
        <svg
          width={PAGE_WIDTH}
          height={PAGE_HEIGHT}
          viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {renderTemplate(paperTemplate)}
        </svg>
      </div>
    </div>
  );
}

function renderTemplate(template: string) {
  const lineColor = '#E5E5E5';

  if (template === 'lined') {
    const lines = [];
    for (let y = 60; y < PAGE_HEIGHT; y += 40) {
      lines.push(
        <line
          key={`l-${y}`}
          x1={0}
          y1={y}
          x2={PAGE_WIDTH}
          y2={y}
          stroke={lineColor}
          strokeWidth={1}
        />
      );
    }
    return <>{lines}</>;
  }

  if (template === 'grid') {
    const elements = [];
    for (let x = 0; x <= PAGE_WIDTH; x += 40) {
      elements.push(
        <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={PAGE_HEIGHT} stroke={lineColor} strokeWidth={0.5} />
      );
    }
    for (let y = 0; y <= PAGE_HEIGHT; y += 40) {
      elements.push(
        <line key={`gy-${y}`} x1={0} y1={y} x2={PAGE_WIDTH} y2={y} stroke={lineColor} strokeWidth={0.5} />
      );
    }
    return <>{elements}</>;
  }

  if (template === 'dotted') {
    const dots = [];
    for (let x = 30; x <= PAGE_WIDTH; x += 30) {
      for (let y = 30; y <= PAGE_HEIGHT; y += 30) {
        dots.push(<circle key={`d-${x}-${y}`} cx={x} cy={y} r={1.2} fill={lineColor} />);
      }
    }
    return <>{dots}</>;
  }

  return null;
}

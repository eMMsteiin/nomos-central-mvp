import { jsPDF } from 'jspdf';
import { Notebook, NotebookPage, Stroke, PEN_STYLES } from '@/types/notebook';
import { catmullRomSpline, smoothPoints } from './strokeSmoothing';

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 2400;

/**
 * Renders a page to a canvas and returns the data URL
 */
export const renderPageToCanvas = (
  page: NotebookPage,
  dpr: number = 2
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    ctx.scale(dpr, dpr);

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw template
    drawTemplate(ctx, page.template);

    // Draw background image if present
    if (page.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawTemplate(ctx, page.template);
        page.strokes.forEach(stroke => drawStroke(ctx, stroke));
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.onerror = () => {
        page.strokes.forEach(stroke => drawStroke(ctx, stroke));
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.src = page.backgroundImage;
    } else {
      page.strokes.forEach(stroke => drawStroke(ctx, stroke));
      resolve(canvas.toDataURL('image/png', 1.0));
    }
  });
};

const drawTemplate = (ctx: CanvasRenderingContext2D, template: NotebookPage['template']) => {
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;

  if (template === 'lined') {
    const lineSpacing = 40;
    for (let y = lineSpacing; y < CANVAS_HEIGHT; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  } else if (template === 'grid') {
    const gridSize = 40;
    for (let x = gridSize; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = gridSize; y < CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  } else if (template === 'dotted') {
    const dotSpacing = 30;
    ctx.fillStyle = '#d1d5db';
    for (let x = dotSpacing; x < CANVAS_WIDTH; x += dotSpacing) {
      for (let y = dotSpacing; y < CANVAS_HEIGHT; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
};

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  if (stroke.points.length < 2) return;

  const styleConfig = stroke.penStyle ? PEN_STYLES[stroke.penStyle] : PEN_STYLES.ballpoint;
  
  const smoothedPoints = stroke.tool === 'pen' 
    ? catmullRomSpline(smoothPoints(stroke.points, 3), styleConfig.smoothing)
    : smoothPoints(stroke.points, 2);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    
    ctx.beginPath();
    ctx.moveTo(smoothedPoints[0].x, smoothedPoints[0].y);
    for (let i = 1; i < smoothedPoints.length; i++) {
      ctx.lineTo(smoothedPoints[i].x, smoothedPoints[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  ctx.strokeStyle = stroke.color;
  ctx.globalAlpha = styleConfig.opacity;

  for (let i = 1; i < smoothedPoints.length; i++) {
    const p0 = smoothedPoints[i - 1];
    const p1 = smoothedPoints[i];
    
    const pressure0 = p0.pressure ?? 0.5;
    const pressure1 = p1.pressure ?? 0.5;
    const avgPressure = (pressure0 + pressure1) / 2;
    
    const widthMultiplier = styleConfig.minWidth + 
      (styleConfig.maxWidth - styleConfig.minWidth) * 
      Math.pow(avgPressure, styleConfig.pressureSensitivity);
    
    const segmentWidth = stroke.width * widthMultiplier;
    
    ctx.lineWidth = segmentWidth;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    
    if (i < smoothedPoints.length - 1) {
      const p2 = smoothedPoints[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    } else {
      ctx.lineTo(p1.x, p1.y);
    }
    
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
};

/**
 * Download a single page as PNG
 */
export const downloadPageAsPng = async (
  page: NotebookPage,
  notebookTitle: string,
  pageNumber: number
): Promise<void> => {
  const dataUrl = await renderPageToCanvas(page);
  
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${notebookTitle}_pagina_${pageNumber}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download entire notebook as PDF
 */
export const downloadNotebookAsPdf = async (
  notebook: Notebook,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  // A4 dimensions in mm: 210 x 297
  // Our canvas ratio is 1600:2400 = 2:3, which is close to A4 (210:297 ≈ 1:1.41)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;

  for (let i = 0; i < notebook.pages.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    onProgress?.(i + 1, notebook.pages.length);

    const dataUrl = await renderPageToCanvas(notebook.pages[i]);
    
    // Add image to PDF, maintaining aspect ratio
    pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }

  pdf.save(`${notebook.title}.pdf`);
};

/**
 * Get canvas data URL directly from a canvas element
 */
export const getCanvasDataUrl = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png', 1.0);
};

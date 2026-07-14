import React, { useRef, useEffect, useState } from 'react';
import { EvaluationPoint } from '../mathSolver';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface ScientificPlotProps {
  points: EvaluationPoint[];
  directionField?: { x: number; y: number; dx: number; dy: number; slope: number }[];
  showCurve: boolean;
  showField: boolean;
  initialX: number;
  initialY: number;
  isHigherOrder: boolean;
  xRangeLimit: [number, number]; // initial range
}

export const ScientificPlot: React.FC<ScientificPlotProps> = ({
  points,
  directionField,
  showCurve,
  showField,
  initialX,
  initialY,
  isHigherOrder,
  xRangeLimit
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Plotting viewport bounds (math coordinates)
  const [xMin, setXMin] = useState(xRangeLimit[0]);
  const [xMax, setXMax] = useState(xRangeLimit[1]);
  const [yMin, setYMin] = useState(-5);
  const [yMax, setYMax] = useState(5);
  
  // Interactive states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Synchronize with external range updates (such as loading presets)
  useEffect(() => {
    setXMin(xRangeLimit[0]);
    setXMax(xRangeLimit[1]);
    
    // Auto-scale Y based on points if available
    if (points.length > 0) {
      const yValues = points.map(p => p.y).filter(y => !isNaN(y) && isFinite(y));
      if (yValues.length > 0) {
        const minVal = Math.min(...yValues);
        const maxVal = Math.max(...yValues);
        const padding = Math.max((maxVal - minVal) * 0.2, 2.0);
        setYMin(minVal - padding);
        setYMax(maxVal + padding);
      } else {
        setYMin(-5);
        setYMax(5);
      }
    } else {
      setYMin(-5);
      setYMax(5);
    }
  }, [xRangeLimit, points]);

  // Redraw whenever bounds or parameters change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays (Retina)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Helpers to convert Math coordinates -> Screen Pixel coordinates
    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Draw grid lines and labels
    drawGrid(ctx, width, height, toScreenX, toScreenY);

    // Draw main axes (X and Y = 0)
    ctx.strokeStyle = '#9CA3AF'; // Slate grey
    ctx.lineWidth = 1.5;

    const zeroY = toScreenY(0);
    const zeroX = toScreenX(0);

    // Draw X-axis
    if (zeroY >= 0 && zeroY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
    }

    // Draw Y-axis
    if (zeroX >= 0 && zeroX <= width) {
      ctx.beginPath();
      ctx.moveTo(zeroX, 0);
      ctx.lineTo(zeroX, height);
      ctx.stroke();
    }

    // Draw Direction Field (Slope vectors)
    if (showField && directionField && !isHigherOrder) {
      ctx.lineWidth = 1.2;
      directionField.forEach(vec => {
        const sx = toScreenX(vec.x);
        const sy = toScreenY(vec.y);

        // Render only if within bounds
        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          const arrowLength = 15; // pixels
          const halfL = arrowLength / 2;

          // Slope direction vector on screen
          // We must compute correct aspect-ratio compensated angles for visual correctness
          const screenDx = toScreenX(vec.x + vec.dx * 0.1) - sx;
          const screenDy = toScreenY(vec.y + vec.dy * 0.1) - sy;
          const len = Math.sqrt(screenDx * screenDx + screenDy * screenDy);
          
          if (len > 0) {
            const udx = screenDx / len;
            const udy = screenDy / len;

            ctx.beginPath();
            ctx.moveTo(sx - udx * halfL, sy - udy * halfL);
            ctx.lineTo(sx + udx * halfL, sy + udy * halfL);

            // Give a gorgeous, subtle scientific color coding: positive slopes blue, negative red/orange, neutral gray
            if (vec.slope > 0.05) {
              ctx.strokeStyle = `rgba(37, 99, 235, ${Math.min(0.15 + Math.abs(vec.slope) * 0.1, 0.45)})`; // Primary blue shade
            } else if (vec.slope < -0.05) {
              ctx.strokeStyle = `rgba(220, 38, 38, ${Math.min(0.15 + Math.abs(vec.slope) * 0.1, 0.45)})`; // Error red shade
            } else {
              ctx.strokeStyle = 'rgba(156, 163, 175, 0.25)'; // Neutral grey
            }
            ctx.stroke();
          }
        }
      });
    }

    // Draw Solution Curve
    if (showCurve && points.length > 0) {
      ctx.strokeStyle = '#2563EB'; // Primary Blue
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      let first = true;
      points.forEach(p => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        
        // Prevent drawing outside boundaries to avoid line distortion
        if (isNaN(sy) || !isFinite(sy)) return;
        
        if (first) {
          ctx.moveTo(sx, sy);
          first = false;
        } else {
          ctx.lineTo(sx, sy);
        }
      });
      ctx.stroke();
    }

    // Draw Initial Condition glowing node
    const icX = toScreenX(initialX);
    const icY = toScreenY(initialY);
    if (icX >= 0 && icX <= width && icY >= 0 && icY <= height) {
      // Halo
      ctx.beginPath();
      ctx.arc(icX, icY, 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(22, 163, 74, 0.18)'; // Success Green halo
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(icX, icY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#16A34A'; // Success Green center
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }

  }, [xMin, xMax, yMin, yMax, points, directionField, showCurve, showField, initialX, initialY, isHigherOrder]);

  // Grid tick auto-spacing and drawing helper
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number
  ) => {
    ctx.strokeStyle = '#F3F4F6'; // soft light gray
    ctx.lineWidth = 1;
    ctx.fillStyle = '#9CA3AF'; // grey for labels
    ctx.font = '10px "IBM Plex Sans", monospace';

    // X-grid lines
    const xSpan = xMax - xMin;
    let xSpacing = Math.pow(10, Math.floor(Math.log10(xSpan))) / 2;
    if (xSpan / xSpacing > 15) xSpacing *= 2;
    if (xSpan / xSpacing < 5) xSpacing /= 2;

    const firstGridX = Math.ceil(xMin / xSpacing) * xSpacing;
    for (let x = firstGridX; x <= xMax; x += xSpacing) {
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();

      // Print numeric tick labels neatly below the grid line
      if (Math.abs(x) > 1e-10) {
        ctx.fillText(x.toFixed(1).replace(/\.0$/, ''), sx - 6, height - 10);
      }
    }

    // Y-grid lines
    const ySpan = yMax - yMin;
    let ySpacing = Math.pow(10, Math.floor(Math.log10(ySpan))) / 2;
    if (ySpan / ySpacing > 15) ySpacing *= 2;
    if (ySpan / ySpacing < 5) ySpacing /= 2;

    const firstGridY = Math.ceil(yMin / ySpacing) * ySpacing;
    for (let y = firstGridY; y <= yMax; y += ySpacing) {
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();

      // Print numeric tick labels to the left of the axis grid line
      if (Math.abs(y) > 1e-10) {
        ctx.fillText(y.toFixed(1).replace(/\.0$/, ''), 8, sy + 3);
      }
    }

    // Label Origin neat notation
    const originX = toScreenX(0);
    const originY = toScreenY(0);
    if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
      ctx.fillText('0', originX + 5, originY - 5);
    }
  };

  // Panning & dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Convert pixel position back to math coordinates
    const mx = xMin + (px / rect.width) * (xMax - xMin);
    const my = yMin + ((rect.height - py) / rect.height) * (yMax - yMin);
    setHoverCoord({ x: mx, y: my });

    if (!isPanning) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    const mathDx = (dx / rect.width) * (xMax - xMin);
    const mathDy = (dy / rect.height) * (yMax - yMin);

    setXMin(prev => prev - mathDx);
    setXMax(prev => prev - mathDx);
    setYMin(prev => prev + mathDy);
    setYMax(prev => prev + mathDy);

    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  // Navigation utilities
  const handleZoom = (factor: number) => {
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const halfX = ((xMax - xMin) * factor) / 2;
    const halfY = ((yMax - yMin) * factor) / 2;

    setXMin(xCenter - halfX);
    setXMax(xCenter + halfX);
    setYMin(yCenter - halfY);
    setYMax(yCenter + halfY);
  };

  const handleReset = () => {
    setXMin(xRangeLimit[0]);
    setXMax(xRangeLimit[1]);
    
    if (points.length > 0) {
      const yValues = points.map(p => p.y).filter(y => !isNaN(y) && isFinite(y));
      if (yValues.length > 0) {
        const minVal = Math.min(...yValues);
        const maxVal = Math.max(...yValues);
        const padding = Math.max((maxVal - minVal) * 0.25, 2.0);
        setYMin(minVal - padding);
        setYMax(maxVal + padding);
      } else {
        setYMin(-5);
        setYMax(5);
      }
    } else {
      setYMin(-5);
      setYMax(5);
    }
  };

  return (
    <div className="relative border border-[#E5E7EB] rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-[400px]" id="scientific-plot-container">
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="w-full flex-1 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={() => {
          handleMouseUpOrLeave();
          setHoverCoord(null);
        }}
        id="mathematical-canvas"
      />

      {/* Hover Coordinate HUD (Heads-Up Display) */}
      {hoverCoord && (
        <div className="absolute top-4 left-4 bg-slate-900/90 text-slate-100 text-xs font-mono py-1.5 px-3 rounded-md shadow-md backdrop-blur-xs flex gap-3 pointer-events-none select-none border border-slate-700/50" id="plot-hud">
          <div>
            <span className="text-slate-400 font-semibold mr-1">X:</span>
            <span>{hoverCoord.x.toFixed(4)}</span>
          </div>
          <div className="border-l border-slate-700 h-4 my-auto"></div>
          <div>
            <span className="text-slate-400 font-semibold mr-1">Y:</span>
            <span>{hoverCoord.y.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Floating Axis Label indicators */}
      <div className="absolute right-4 bottom-14 bg-white/80 border border-slate-200 text-[10px] text-slate-500 font-mono py-1 px-2 rounded-md shadow-xs pointer-events-none flex flex-col gap-0.5" id="plot-axis-indicator">
        <div>Ordinate: <span className="text-blue-600 font-bold">y</span></div>
        <div className="border-t border-slate-100 my-0.5"></div>
        <div>Abscissa: <span className="text-slate-700 font-bold">x</span></div>
      </div>

      {/* Interactive Toolbar */}
      <div className="absolute right-4 top-4 flex gap-1 bg-white/90 p-1 rounded-lg shadow-sm border border-[#E5E7EB]" id="plot-controls-toolbar">
        <button
          onClick={() => handleZoom(0.7)}
          className="p-1.5 rounded-md hover:bg-[#F5F7FA] text-slate-600 hover:text-slate-900 transition-colors"
          title="Zoom In"
          id="btn-zoom-in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(1.4)}
          className="p-1.5 rounded-md hover:bg-[#F5F7FA] text-slate-600 hover:text-slate-900 transition-colors"
          title="Zoom Out"
          id="btn-zoom-out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-md hover:bg-[#F5F7FA] text-slate-600 hover:text-slate-900 transition-colors"
          title="Reset View"
          id="btn-zoom-reset"
        >
          <Maximize2 size={16} />
        </button>
        <div className="border-l border-[#E5E7EB] my-1 mx-0.5"></div>
        <span className="p-1.5 text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 select-none" id="label-pan-control">
          <Move size={12} /> drag to pan
        </span>
      </div>
    </div>
  );
};

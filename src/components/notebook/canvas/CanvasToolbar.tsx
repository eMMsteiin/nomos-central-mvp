import { Pen, Undo2, Redo2 } from 'lucide-react';
import { useState } from 'react';
import type { ToolType, PenConfig } from './types';

interface CanvasToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  penConfig: PenConfig;
  onPenConfigChange: (config: PenConfig) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const PEN_COLORS = ['#000000', '#404040', '#737373', '#1E3A8A', '#991B1B', '#166534'];
const PEN_WIDTHS = [1, 2, 4, 6];

export function CanvasToolbar(props: CanvasToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
      <button
        onClick={props.onUndo}
        disabled={!props.canUndo}
        className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
        title="Desfazer (Cmd/Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={props.onRedo}
        disabled={!props.canRedo}
        className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
        title="Refazer (Cmd/Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800 mx-1" />

      <button
        onClick={() => {
          if (props.activeTool === 'pen') setExpanded(!expanded);
          else props.onToolChange('pen');
        }}
        className={`p-2 rounded-md transition ${
          props.activeTool === 'pen'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        title="Caneta"
      >
        <Pen className="w-4 h-4" />
      </button>

      {props.activeTool === 'pen' && expanded && (
        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-1.5">
            {PEN_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => props.onPenConfigChange({ ...props.penConfig, color })}
                className={`w-5 h-5 rounded-full border-2 transition ${
                  props.penConfig.color === color
                    ? 'border-neutral-900 dark:border-neutral-100 scale-110'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`Cor ${color}`}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800" />

          <div className="flex items-center gap-1">
            {PEN_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => props.onPenConfigChange({ ...props.penConfig, width: w })}
                className={`flex items-center justify-center w-7 h-7 rounded transition ${
                  props.penConfig.width === w
                    ? 'bg-neutral-200 dark:bg-neutral-700'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title={`${w}px`}
                aria-label={`Espessura ${w}`}
              >
                <div
                  className="rounded-full bg-neutral-900 dark:bg-neutral-100"
                  style={{ width: w + 1, height: w + 1 }}
                />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800" />

          <button
            onClick={() =>
              props.onPenConfigChange({
                ...props.penConfig,
                pressureEnabled: !props.penConfig.pressureEnabled,
              })
            }
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition ${
              props.penConfig.pressureEnabled
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
            title={
              props.penConfig.pressureEnabled
                ? 'Pressão ativa (linha varia)'
                : 'Pressão desativada (linha uniforme)'
            }
            aria-pressed={props.penConfig.pressureEnabled}
          >
            <span className="relative w-3 h-3 flex items-center justify-center">
              <span
                className="rounded-full"
                style={{
                  width: props.penConfig.pressureEnabled ? 12 : 8,
                  height: props.penConfig.pressureEnabled ? 12 : 8,
                  background: props.penConfig.pressureEnabled
                    ? 'linear-gradient(135deg, currentColor 40%, transparent 100%)'
                    : 'currentColor',
                }}
              />
            </span>
            <span>Pressão</span>
          </button>
        </div>
      )}
    </div>
  );
}

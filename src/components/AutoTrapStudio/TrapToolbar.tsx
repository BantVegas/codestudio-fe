/**
 * GPCS CodeStudio - Trap Toolbar
 * Hlavný toolbar s nástrojmi - ESKO kompatibilný
 */

import React from 'react'

export type ToolType = 'SELECT' | 'DENSITOMETER' | 'PAN' | 'ZOOM'

interface TrapToolbarProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  onUpdateTrapLayer: () => void
  onShowRichBlack: () => void
  onShowWhiteUnderprint: () => void
  onShowColorPairs: () => void
  onExportTrapLayer: () => void
  showColorEdges: boolean
  onToggleColorEdges: () => void
  canUpdate: boolean
  canExport: boolean
}

export const TrapToolbar: React.FC<TrapToolbarProps> = ({
  activeTool,
  onToolChange,
  onUpdateTrapLayer,
  onShowRichBlack,
  onShowWhiteUnderprint,
  onShowColorPairs,
  onExportTrapLayer,
  showColorEdges,
  onToggleColorEdges,
  canUpdate,
  canExport
}) => {
  const tools: { id: ToolType; icon: string; label: string; shortcut: string }[] = [
    { id: 'SELECT', icon: '🎯', label: 'Trap Select', shortcut: 'V' },
    { id: 'DENSITOMETER', icon: '🔬', label: 'Densitometer', shortcut: 'D' },
    { id: 'PAN', icon: '✋', label: 'Pan', shortcut: 'H' },
    { id: 'ZOOM', icon: '🔍', label: 'Zoom', shortcut: 'Z' },
  ]

  return (
    <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-2 gap-1">
      {/* Tools */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-700">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded transition-colors ${
              activeTool === tool.id
                ? 'bg-pink-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <span className="text-lg">{tool.icon}</span>
          </button>
        ))}
      </div>

      {/* View Options */}
      <div className="flex items-center gap-1 px-3 border-r border-slate-700">
        <button
          onClick={onToggleColorEdges}
          className={`px-3 py-1.5 rounded text-xs transition-colors ${
            showColorEdges
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="Zobraziť Color Edges"
        >
          👁️ Edges
        </button>
        <button
          onClick={onShowColorPairs}
          className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded text-xs"
          title="Color Pairs Palette"
        >
          🎨 Pairs
        </button>
      </div>

      {/* Special Functions */}
      <div className="flex items-center gap-1 px-3 border-r border-slate-700">
        <button
          onClick={onShowRichBlack}
          className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded text-xs"
          title="Rich Black"
        >
          ⬛ Rich Black
        </button>
        <button
          onClick={onShowWhiteUnderprint}
          className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded text-xs"
          title="White Underprint"
        >
          ⬜ White
        </button>
      </div>

      {/* Update & Export */}
      <div className="flex items-center gap-1 px-3">
        <button
          onClick={onUpdateTrapLayer}
          disabled={!canUpdate}
          className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs flex items-center gap-1"
          title="Update Trap Layer (Ctrl+T)"
        >
          🔄 Update
          <kbd className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">⌘T</kbd>
        </button>
        <button
          onClick={onExportTrapLayer}
          disabled={!canExport}
          className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
          title="Export Trap Layer"
        >
          📤 Export
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Ctrl+T = Update</span>
        <span>|</span>
        <span>Del = Vymazať trap</span>
        <span>|</span>
        <span>I = Invertovať</span>
      </div>
    </div>
  )
}

export default TrapToolbar

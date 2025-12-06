/**
 * GPCS CodeStudio - Trap Select Tool
 * Výber a editácia jednotlivých trapov - ESKO kompatibilný
 */

import React, { useState } from 'react'
import type { TrapObject } from './TrapLayerManager'

interface TrapSelectToolProps {
  selectedTraps: TrapObject[]
  onInvertDirection: (trapIds: string[]) => void
  onAdjustDistance: (trapIds: string[], newDistance: number) => void
  onDeleteTraps: (trapIds: string[]) => void
  onToggleTrapTag: (trapIds: string[]) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  totalTraps: number
  taggedTrapsCount: number
}

export const TrapSelectTool: React.FC<TrapSelectToolProps> = ({
  selectedTraps,
  onInvertDirection,
  onAdjustDistance,
  onDeleteTraps,
  onToggleTrapTag,
  onSelectAll,
  onDeselectAll,
  totalTraps,
  taggedTrapsCount
}) => {
  const [adjustDistance, setAdjustDistance] = useState(0.15)
  const [showDistanceDialog, setShowDistanceDialog] = useState(false)

  const selectedIds = selectedTraps.map(t => t.id)
  const hasSelection = selectedTraps.length > 0

  const getDirectionStats = () => {
    const stats = { spread: 0, choke: 0, centerline: 0 }
    selectedTraps.forEach(t => {
      if (t.direction === 'SPREAD') stats.spread++
      else if (t.direction === 'CHOKE') stats.choke++
      else stats.centerline++
    })
    return stats
  }

  const stats = getDirectionStats()

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <span>🎯</span> Trap Select Tool
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Kliknutím vyberte trap, Shift+klik pre viacero
        </p>
      </div>

      {/* Selection Info */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Vybraných:</span>
          <span className="text-sm font-medium text-pink-400">
            {selectedTraps.length} / {totalTraps}
          </span>
        </div>

        {hasSelection && (
          <div className="grid grid-cols-3 gap-1 text-xs">
            <div className="bg-slate-800 rounded p-1.5 text-center">
              <div className="text-cyan-400">{stats.spread}</div>
              <div className="text-slate-500">Spread</div>
            </div>
            <div className="bg-slate-800 rounded p-1.5 text-center">
              <div className="text-orange-400">{stats.choke}</div>
              <div className="text-slate-500">Choke</div>
            </div>
            <div className="bg-slate-800 rounded p-1.5 text-center">
              <div className="text-purple-400">{stats.centerline}</div>
              <div className="text-slate-500">Center</div>
            </div>
          </div>
        )}

        {/* Select All / Deselect */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onSelectAll}
            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs"
          >
            ☑️ Vybrať všetky
          </button>
          <button
            onClick={onDeselectAll}
            disabled={!hasSelection}
            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs"
          >
            ⬜ Zrušiť výber
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Akcie</h4>

        {/* Invert Direction */}
        <button
          onClick={() => onInvertDirection(selectedIds)}
          disabled={!hasSelection}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
        >
          <span>↔️</span> Invertovať smer
        </button>

        {/* Adjust Distance */}
        <div className="relative">
          <button
            onClick={() => setShowDistanceDialog(!showDistanceDialog)}
            disabled={!hasSelection}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
          >
            <span>📏</span> Upraviť vzdialenosť
          </button>

          {showDistanceDialog && hasSelection && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 z-10 shadow-xl">
              <label className="block text-xs text-slate-400 mb-1">
                Nová vzdialenosť (mm)
              </label>
              <input
                type="number"
                value={adjustDistance}
                onChange={(e) => setAdjustDistance(parseFloat(e.target.value) || 0)}
                min={0.01}
                max={1}
                step={0.01}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onAdjustDistance(selectedIds, adjustDistance)
                    setShowDistanceDialog(false)
                  }}
                  className="flex-1 py-1.5 bg-pink-500 hover:bg-pink-400 rounded text-xs"
                >
                  Aplikovať
                </button>
                <button
                  onClick={() => setShowDistanceDialog(false)}
                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Trap Tag */}
        <button
          onClick={() => onToggleTrapTag(selectedIds)}
          disabled={!hasSelection}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
        >
          <span>🏷️</span> Toggle Trap Tag
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm(`Naozaj chcete vymazať ${selectedTraps.length} trapov?`)) {
              onDeleteTraps(selectedIds)
            }
          }}
          disabled={!hasSelection}
          className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
        >
          <span>🗑️</span> Vymazať trapy
        </button>
      </div>

      {/* Trap Tags Info */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Trap Tags:</span>
          <span className="text-cyan-400">{taggedTrapsCount} označených</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Trap Tags označujú objekty pre selektívne trapovanie
        </p>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Vybrať všetky</span>
            <kbd className="bg-slate-800 px-1.5 py-0.5 rounded">Ctrl+A</kbd>
          </div>
          <div className="flex justify-between">
            <span>Invertovať</span>
            <kbd className="bg-slate-800 px-1.5 py-0.5 rounded">I</kbd>
          </div>
          <div className="flex justify-between">
            <span>Vymazať</span>
            <kbd className="bg-slate-800 px-1.5 py-0.5 rounded">Delete</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrapSelectTool

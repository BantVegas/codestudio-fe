/**
 * GPCS CodeStudio - Color Pairs Palette
 * Zobrazenie a správa farebných párov - ESKO kompatibilný
 */

import React, { useState, useMemo } from 'react'

export interface ColorPair {
  id: string
  fromColor: {
    name: string
    rgb: { r: number; g: number; b: number }
    type: 'PROCESS' | 'SPOT' | 'IMAGE' | 'GRADIENT' | 'EMPTY'
    density: number
  }
  toColor: {
    name: string
    rgb: { r: number; g: number; b: number }
    type: 'PROCESS' | 'SPOT' | 'IMAGE' | 'GRADIENT' | 'EMPTY'
    density: number
  }
  trapDirection: 'FROM_TO' | 'TO_FROM' | 'BOTH' | 'NONE'
  trapDistance: number
  occurrences: number
  isCustom: boolean
}

interface ColorPairsPaletteProps {
  colorPairs: ColorPair[]
  selectedPairId: string | null
  onPairSelect: (pairId: string) => void
  onPairEdit: (pairId: string, updates: Partial<ColorPair>) => void
  onSaveColorPairs: () => void
  onLoadColorPairs: () => void
  showColorEdges: boolean
  onToggleColorEdges: () => void
}

export const ColorPairsPalette: React.FC<ColorPairsPaletteProps> = ({
  colorPairs,
  selectedPairId,
  onPairSelect,
  onPairEdit,
  onSaveColorPairs,
  onLoadColorPairs,
  showColorEdges,
  onToggleColorEdges
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PROCESS' | 'SPOT' | 'IMAGE' | 'CUSTOM'>('ALL')
  const [sortBy, setSortBy] = useState<'OCCURRENCES' | 'DISTANCE' | 'NAME'>('OCCURRENCES')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return '🖼️'
      case 'GRADIENT': return '🌈'
      case 'EMPTY': return '⬜'
      case 'SPOT': return '🎨'
      default: return '🔵'
    }
  }

  const getDirectionArrow = (direction: string) => {
    switch (direction) {
      case 'FROM_TO': return '→'
      case 'TO_FROM': return '←'
      case 'BOTH': return '↔'
      default: return '✕'
    }
  }

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  }

  const filteredPairs = useMemo(() => {
    let pairs = [...colorPairs]
    
    // Filter
    if (filter !== 'ALL') {
      pairs = pairs.filter(p => {
        if (filter === 'CUSTOM') return p.isCustom
        return p.fromColor.type === filter || p.toColor.type === filter
      })
    }

    // Sort
    pairs.sort((a, b) => {
      switch (sortBy) {
        case 'OCCURRENCES': return b.occurrences - a.occurrences
        case 'DISTANCE': return b.trapDistance - a.trapDistance
        case 'NAME': return a.fromColor.name.localeCompare(b.fromColor.name)
        default: return 0
      }
    })

    return pairs
  }, [colorPairs, filter, sortBy])

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <span>🎨</span> Color Pairs
            <span className="text-xs text-slate-500">({colorPairs.length})</span>
          </h3>
          <div className="flex gap-1">
            <button
              onClick={onSaveColorPairs}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs"
              title="Uložiť Color Pairs"
            >
              💾
            </button>
            <button
              onClick={onLoadColorPairs}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs"
              title="Načítať Color Pairs"
            >
              📂
            </button>
          </div>
        </div>

        {/* Show Color Edges Toggle */}
        <button
          onClick={onToggleColorEdges}
          className={`w-full py-1.5 rounded text-xs transition-colors ${
            showColorEdges
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {showColorEdges ? '👁️ Skryť Color Edges' : '👁️ Zobraziť Color Edges'}
        </button>
      </div>

      {/* Filters */}
      <div className="p-2 border-b border-slate-800 flex gap-1 flex-wrap">
        {(['ALL', 'PROCESS', 'SPOT', 'IMAGE', 'CUSTOM'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filter === f
                ? 'bg-pink-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {f === 'ALL' ? 'Všetky' : f === 'CUSTOM' ? 'Vlastné' : f}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 text-xs">
        <span className="text-slate-500">Zoradiť:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
        >
          <option value="OCCURRENCES">Počet výskytov</option>
          <option value="DISTANCE">Vzdialenosť</option>
          <option value="NAME">Názov</option>
        </select>
      </div>

      {/* Color Pairs List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredPairs.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            Žiadne farebné páry
          </div>
        ) : (
          filteredPairs.map(pair => (
            <div
              key={pair.id}
              onClick={() => onPairSelect(pair.id)}
              className={`p-2 border-b border-slate-800 cursor-pointer transition-colors ${
                selectedPairId === pair.id
                  ? 'bg-pink-500/10 border-l-2 border-l-pink-500'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* From Color */}
                <div className="flex items-center gap-1">
                  <span className="text-xs">{getTypeIcon(pair.fromColor.type)}</span>
                  <div
                    className="w-5 h-5 rounded border border-slate-600"
                    style={{ backgroundColor: rgbToHex(pair.fromColor.rgb.r, pair.fromColor.rgb.g, pair.fromColor.rgb.b) }}
                    title={pair.fromColor.name}
                  />
                </div>

                {/* Direction Arrow */}
                <span className={`text-sm font-bold ${
                  pair.trapDirection === 'NONE' ? 'text-red-400' : 'text-cyan-400'
                }`}>
                  {getDirectionArrow(pair.trapDirection)}
                </span>

                {/* To Color */}
                <div className="flex items-center gap-1">
                  <div
                    className="w-5 h-5 rounded border border-slate-600"
                    style={{ backgroundColor: rgbToHex(pair.toColor.rgb.r, pair.toColor.rgb.g, pair.toColor.rgb.b) }}
                    title={pair.toColor.name}
                  />
                  <span className="text-xs">{getTypeIcon(pair.toColor.type)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 text-right">
                  <div className="text-xs text-slate-400">
                    {pair.trapDistance.toFixed(2)} mm
                  </div>
                  <div className="text-xs text-slate-500">
                    {pair.occurrences}× {pair.isCustom && '⭐'}
                  </div>
                </div>
              </div>

              {/* Expanded info when selected */}
              {selectedPairId === pair.id && (
                <div className="mt-2 pt-2 border-t border-slate-700 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-slate-500">From</div>
                      <div className="text-white">{pair.fromColor.name}</div>
                      <div className="text-slate-500">Density: {pair.fromColor.density.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">To</div>
                      <div className="text-white">{pair.toColor.name}</div>
                      <div className="text-slate-500">Density: {pair.toColor.density.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const newDir = pair.trapDirection === 'FROM_TO' ? 'TO_FROM' : 'FROM_TO'
                        onPairEdit(pair.id, { trapDirection: newDir })
                      }}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs"
                    >
                      ↔️ Invertovať
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPairEdit(pair.id, { trapDirection: 'NONE' })
                      }}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs"
                    >
                      🚫 Bez trapu
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex flex-wrap gap-2">
          <span>🖼️ Obrázok</span>
          <span>🌈 Gradient</span>
          <span>⬜ Prázdne</span>
          <span>🎨 Spot</span>
        </div>
      </div>
    </div>
  )
}

export default ColorPairsPalette

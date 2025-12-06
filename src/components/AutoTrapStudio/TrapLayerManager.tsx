/**
 * GPCS CodeStudio - Trap Layer Manager
 * Správa trap vrstiev - ESKO kompatibilný
 */

import React, { useState } from 'react'

export interface TrapLayerInfo {
  id: string
  name: string
  type: 'AUTOMATIC' | 'REVERSE'
  visible: boolean
  locked: boolean
  trapCount: number
  createdAt: Date
  modifiedAt: Date
}

export interface TrapObject {
  id: string
  layerId: string
  path: string
  color: string
  width: number
  direction: 'SPREAD' | 'CHOKE' | 'CENTERLINE'
  fromColor: { r: number; g: number; b: number }
  toColor: { r: number; g: number; b: number }
  selected: boolean
  tagged: boolean  // Pre Trap Tags
  tagIds?: string[]  // Priradené tag IDs
  x: number
  y: number
}

interface TrapLayerManagerProps {
  layers: TrapLayerInfo[]
  selectedLayerId: string | null
  onLayerSelect: (layerId: string) => void
  onLayerVisibilityToggle: (layerId: string) => void
  onLayerLockToggle: (layerId: string) => void
  onLayerDelete: (layerId: string) => void
  onLayerRename: (layerId: string, newName: string) => void
  onCreateLayer: (type: 'AUTOMATIC' | 'REVERSE') => void
  onUpdateLayer: (layerId: string) => void
  hasAutomaticLayer: boolean
  hasReverseLayer: boolean
}

export const TrapLayerManager: React.FC<TrapLayerManagerProps> = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  onLayerDelete,
  onLayerRename,
  onCreateLayer,
  onUpdateLayer,
  hasAutomaticLayer,
  hasReverseLayer
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const startEditing = (layer: TrapLayerInfo) => {
    setEditingLayerId(layer.id)
    setEditingName(layer.name)
  }

  const finishEditing = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerRename(editingLayerId, editingName.trim())
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <span>📑</span> Trap Layers
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => onCreateLayer('AUTOMATIC')}
            disabled={hasAutomaticLayer && hasReverseLayer}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
            title="Vytvoriť Automatic Trap Layer"
          >
            ➕ Auto
          </button>
          <button
            onClick={() => onCreateLayer('REVERSE')}
            disabled={hasAutomaticLayer && hasReverseLayer}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
            title="Vytvoriť Reverse Trap Layer"
          >
            ➕ Rev
          </button>
        </div>
      </div>

      {/* Warning if both types exist */}
      {hasAutomaticLayer && hasReverseLayer && (
        <div className="px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-400">
          ⚠️ Súbor nemôže obsahovať súčasne Automatic + Reverse Layer
        </div>
      )}

      {/* Layers List */}
      <div className="max-h-48 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            Žiadne trap vrstvy
          </div>
        ) : (
          layers.map(layer => (
            <div
              key={layer.id}
              onClick={() => onLayerSelect(layer.id)}
              className={`p-2 border-b border-slate-800 cursor-pointer transition-colors ${
                selectedLayerId === layer.id
                  ? 'bg-pink-500/10 border-l-2 border-l-pink-500'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onLayerVisibilityToggle(layer.id)
                  }}
                  className="text-sm"
                  title={layer.visible ? 'Skryť' : 'Zobraziť'}
                >
                  {layer.visible ? '👁️' : '👁️‍🗨️'}
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onLayerLockToggle(layer.id)
                  }}
                  className="text-sm"
                  title={layer.locked ? 'Odomknúť' : 'Zamknúť'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>

                {/* Layer Name */}
                <div className="flex-1 min-w-0">
                  {editingLayerId === layer.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={finishEditing}
                      onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                      className="w-full bg-slate-800 border border-pink-500 rounded px-1 py-0.5 text-xs text-white"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-sm text-white truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        startEditing(layer)
                      }}
                    >
                      {layer.name}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className={layer.type === 'AUTOMATIC' ? 'text-cyan-400' : 'text-orange-400'}>
                      {layer.type === 'AUTOMATIC' ? '🎯 Auto' : '↩️ Reverse'}
                    </span>
                    <span>• {layer.trapCount} trapov</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateLayer(layer.id)
                    }}
                    className="p-1 hover:bg-slate-700 rounded text-xs"
                    title="Update Trap Layer (Ctrl+T)"
                  >
                    🔄
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Naozaj chcete vymazať túto vrstvu?')) {
                        onLayerDelete(layer.id)
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-xs text-red-400"
                    title="Vymazať vrstvu"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Non-destructive editing</span>
          <span>Ctrl+T = Update</span>
        </div>
      </div>
    </div>
  )
}

export default TrapLayerManager

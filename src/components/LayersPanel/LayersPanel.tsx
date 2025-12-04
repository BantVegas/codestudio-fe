// src/components/LayersPanel/LayersPanel.tsx
import React, { useState } from 'react'
import type {
  Layer,
  LayerType,
  LabelObject,
  ObjectType,
  BarcodeObject,
  TextObject,
  CodeType,
} from '../../types/barcodeTypes'

interface LayersPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  selectedObjectId: string | null
  onSelectLayer: (id: string | null) => void
  onSelectObject: (id: string | null) => void
  onAddLayer: (type: LayerType) => void
  onRemoveLayer: (id: string) => void
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void
  onReorderLayers: (fromIndex: number, toIndex: number) => void
  onAddObject: (layerId: string, type: ObjectType) => void
  onRemoveObject: (layerId: string, objectId: string) => void
  onUpdateObject: (layerId: string, objectId: string, updates: Partial<LabelObject>) => void
  onDuplicateObject: (layerId: string, objectId: string) => void
}

const LAYER_TYPES: { type: LayerType; name: string; icon: string; color: string }[] = [
  { type: 'WHITE_UNDERPRINT', name: 'White podtlač', icon: '⬜', color: 'bg-gray-100 text-gray-800' },
  { type: 'BACKGROUND', name: 'Pozadie', icon: '🎨', color: 'bg-slate-500' },
  { type: 'LOGO', name: 'Logo', icon: '🖼️', color: 'bg-purple-500' },
  { type: 'BARCODE', name: 'Čiarový kód', icon: '📊', color: 'bg-emerald-500' },
  { type: 'TEXT', name: 'Text', icon: '📝', color: 'bg-sky-500' },
  { type: 'GRAPHICS', name: 'Grafika', icon: '✏️', color: 'bg-amber-500' },
  { type: 'VARNISH', name: 'Lak', icon: '✨', color: 'bg-pink-500' },
]

const OBJECT_TYPES: { type: ObjectType; name: string; icon: string }[] = [
  { type: 'barcode', name: 'Čiarový kód', icon: '📊' },
  { type: 'qrcode', name: 'QR kód', icon: '⬛' },
  { type: 'text', name: 'Text', icon: '📝' },
  { type: 'image', name: 'Obrázok', icon: '🖼️' },
  { type: 'rectangle', name: 'Obdĺžnik', icon: '⬜' },
  { type: 'line', name: 'Čiara', icon: '➖' },
]

// Jednoduché type-guardy, aby boli špecifické typy objektov k dispozícii
const isBarcodeObject = (obj: LabelObject): obj is BarcodeObject => obj.type === 'barcode'
const isTextObject = (obj: LabelObject): obj is TextObject => obj.type === 'text'

// Helper pre budúce použitie pri filtrovaní vrstiev podľa typu kódu
const isLinearCodeType = (codeType: CodeType) =>
  ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'ITF14', 'GS1128', 'CODE128'].includes(codeType)

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  selectedObjectId,
  onSelectLayer,
  onSelectObject,
  onAddLayer,
  onRemoveLayer,
  onUpdateLayer,
  onReorderLayers,
  onAddObject,
  onRemoveObject,
  onUpdateObject,
  onDuplicateObject,
}) => {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set())
  const [showAddLayerMenu, setShowAddLayerMenu] = useState(false)
  const [showAddObjectMenu, setShowAddObjectMenu] = useState<string | null>(null)

  const toggleLayerExpanded = (layerId: string) => {
    const newExpanded = new Set(expandedLayers)
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId)
    } else {
      newExpanded.add(layerId)
    }
    setExpandedLayers(newExpanded)
  }

  const getLayerTypeInfo = (type: LayerType) => {
    return LAYER_TYPES.find(lt => lt.type === type) || LAYER_TYPES[0]
  }

  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < layers.length) {
      onReorderLayers(index, newIndex)
    }
  }

  // Zistí, či v scenári existuje aspoň jeden lineárny čiarový kód
  const hasLinearBarcode = layers.some(layer =>
    layer.objects.some(obj => isBarcodeObject(obj) && isLinearCodeType(obj.codeType))
  )

  // Počet textových objektov (využitie isTextObject)
  const textObjectCount = layers.reduce(
    (acc, layer) => acc + layer.objects.filter(obj => isTextObject(obj)).length,
    0,
  )

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Vrstvy
        </h2>
        <div className="relative">
          <button
            onClick={() => setShowAddLayerMenu(!showAddLayerMenu)}
            className="rounded bg-sky-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-sky-500"
          >
            + Vrstva
          </button>
          
          {showAddLayerMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-slate-600 bg-slate-800 py-1 shadow-lg">
              {LAYER_TYPES.map(lt => (
                <button
                  key={lt.type}
                  onClick={() => {
                    onAddLayer(lt.type)
                    setShowAddLayerMenu(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-700"
                >
                  <span>{lt.icon}</span>
                  <span>{lt.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layers list */}
      <div className="flex-1 overflow-y-auto p-2">
        {layers.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-500">
            Žiadne vrstvy. Klikni na "+ Vrstva" pre pridanie.
          </div>
        ) : (
          <div className="space-y-1">
            {layers.map((layer, index) => {
              const typeInfo = getLayerTypeInfo(layer.type)
              const isExpanded = expandedLayers.has(layer.id)
              const isSelected = selectedLayerId === layer.id

              return (
                <div
                  key={layer.id}
                  className={`rounded-md border ${
                    isSelected ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  {/* Layer header */}
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                    onClick={() => onSelectLayer(layer.id)}
                  >
                    {/* Expand/collapse */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayerExpanded(layer.id)
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <svg
                        className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6 6L14 10L6 14V6Z" />
                      </svg>
                    </button>

                    {/* Layer type icon */}
                    <span className="text-sm">{typeInfo.icon}</span>

                    {/* Layer name */}
                    <span className="flex-1 text-[11px] font-medium text-slate-200 truncate">
                      {layer.name}
                    </span>

                    {/* Object count */}
                    <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400">
                      {layer.objects.length}
                    </span>

                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateLayer(layer.id, { visible: !layer.visible })
                      }}
                      className={`text-[11px] ${layer.visible ? 'text-slate-300' : 'text-slate-600'}`}
                    >
                      {layer.visible ? '👁️' : '👁️‍🗨️'}
                    </button>

                    {/* Lock toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateLayer(layer.id, { locked: !layer.locked })
                      }}
                      className={`text-[11px] ${layer.locked ? 'text-amber-400' : 'text-slate-500'}`}
                    >
                      {layer.locked ? '🔒' : '🔓'}
                    </button>

                    {/* Move up/down */}
                    <div className="flex flex-col">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveLayer(index, 'up')
                        }}
                        disabled={index === 0}
                        className="text-[8px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveLayer(index, 'down')
                        }}
                        disabled={index === layers.length - 1}
                        className="text-[8px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Delete layer */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Odstrániť vrstvu "${layer.name}"?`)) {
                          onRemoveLayer(layer.id)
                        }
                      }}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Layer content (expanded) */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 px-2 py-2">
                      {/* Layer settings */}
                      <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Farba:</span>
                          <select
                            value={layer.colorMode}
                            onChange={(e) => onUpdateLayer(layer.id, { colorMode: e.target.value as any })}
                            className="rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
                          >
                            <option value="PROCESS">CMYK</option>
                            <option value="SPOT">Spot</option>
                          </select>
                        </div>
                        {layer.colorMode === 'SPOT' && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Názov:</span>
                            <input
                              type="text"
                              value={layer.spotColorName || ''}
                              onChange={(e) => onUpdateLayer(layer.id, { spotColorName: e.target.value })}
                              className="w-full rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
                              placeholder="SPOT_1"
                            />
                          </div>
                        )}
                        <label className="flex items-center gap-1 text-slate-400">
                          <input
                            type="checkbox"
                            checked={layer.overprint}
                            onChange={(e) => onUpdateLayer(layer.id, { overprint: e.target.checked })}
                            className="h-3 w-3"
                          />
                          Overprint
                        </label>
                        <label className="flex items-center gap-1 text-slate-400">
                          <input
                            type="checkbox"
                            checked={layer.knockout}
                            onChange={(e) => onUpdateLayer(layer.id, { knockout: e.target.checked })}
                            className="h-3 w-3"
                          />
                          Knockout
                        </label>
                      </div>

                      {/* Objects in layer */}
                      <div className="space-y-1">
                        {layer.objects.map(obj => (
                          <div
                            key={obj.id}
                            onClick={() => onSelectObject(obj.id)}
                            className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer ${
                              selectedObjectId === obj.id
                                ? 'bg-sky-500/20 border border-sky-500/50'
                                : 'bg-slate-800 hover:bg-slate-700'
                            }`}
                          >
                            <span className="text-[11px]">
                              {obj.type === 'barcode' ? '📊' : 
                               obj.type === 'text' ? '📝' : 
                               obj.type === 'image' ? '🖼️' : '⬜'}
                            </span>
                            <span className="flex-1 text-[10px] text-slate-300 truncate">
                              {obj.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateObject(layer.id, obj.id, { visible: !obj.visible })
                              }}
                              className={`text-[10px] ${obj.visible ? 'text-slate-300' : 'text-slate-600'}`}
                            >
                              {obj.visible ? '👁️' : '👁️‍🗨️'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDuplicateObject(layer.id, obj.id)
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-200"
                            >
                              📋
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Odstrániť objekt "${obj.name}"?`)) {
                                  onRemoveObject(layer.id, obj.id)
                                }
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {/* Add object button */}
                        <div className="relative">
                          <button
                            onClick={() => setShowAddObjectMenu(
                              showAddObjectMenu === layer.id ? null : layer.id
                            )}
                            className="w-full rounded border border-dashed border-slate-600 py-1 text-[10px] text-slate-500 hover:border-slate-500 hover:text-slate-400"
                          >
                            + Pridať objekt
                          </button>
                          
                          {showAddObjectMenu === layer.id && (
                            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-slate-600 bg-slate-800 py-1 shadow-lg">
                              {OBJECT_TYPES.map(ot => (
                                <button
                                  key={ot.type}
                                  onClick={() => {
                                    onAddObject(layer.id, ot.type)
                                    setShowAddObjectMenu(null)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] text-slate-200 hover:bg-slate-700"
                                >
                                  <span>{ot.icon}</span>
                                  <span>{ot.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick info */}
      <div className="border-t border-slate-700 px-3 py-2 text-[9px] text-slate-500 flex items-center justify-between">
        <span>
          {layers.length} vrstiev · {layers.reduce((acc, l) => acc + l.objects.length, 0)} objektov · {textObjectCount} textov
        </span>
        {hasLinearBarcode && (
          <span className="text-[8px] text-slate-400">
            Obsahuje lineárne kódy (EAN/UPC/ITF/GS1-128)
          </span>
        )}
      </div>
    </div>
  )
}

export default LayersPanel
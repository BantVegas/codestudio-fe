/**
 * GPCS CodeStudio - Rich Black Dialog
 * Nastavenia pre Rich Black - ESKO kompatibilný
 */

import React, { useState } from 'react'

export interface RichBlackSettings {
  enabled: boolean
  addInk: 'CYAN' | 'MAGENTA' | 'CUSTOM'
  customInkName: string
  density: number  // 0-100%
  offset: number   // mm - choke distance
  miterLimit: number
  cornerStyle: 'MITER' | 'BEVEL' | 'ROUND'
  minDensityFilter: number  // Minimum density to apply
}

interface RichBlackDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: RichBlackSettings
  onApply: (settings: RichBlackSettings) => void
}

export const RichBlackDialog: React.FC<RichBlackDialogProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onApply
}) => {
  const [settings, setSettings] = useState<RichBlackSettings>(initialSettings)

  if (!isOpen) return null

  const handleApply = () => {
    onApply(settings)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[500px] max-h-[80vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>⬛</span> Rich Black
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Enable */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-pink-500"
            />
            <div>
              <div className="text-sm text-white">Povoliť Rich Black</div>
              <div className="text-xs text-slate-500">Pridá podporný atrament pod čiernu</div>
            </div>
          </label>

          {settings.enabled && (
            <>
              {/* Add Ink */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pridať atrament</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CYAN', 'MAGENTA', 'CUSTOM'] as const).map(ink => (
                    <button
                      key={ink}
                      onClick={() => setSettings({ ...settings, addInk: ink })}
                      className={`py-2 rounded text-sm transition-colors ${
                        settings.addInk === ink
                          ? ink === 'CYAN' 
                            ? 'bg-cyan-500 text-white'
                            : ink === 'MAGENTA'
                            ? 'bg-pink-500 text-white'
                            : 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {ink === 'CYAN' ? '🔵 Cyan' : ink === 'MAGENTA' ? '🔴 Magenta' : '🎨 Vlastný'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Ink Name */}
              {settings.addInk === 'CUSTOM' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Názov atramentu</label>
                  <input
                    type="text"
                    value={settings.customInkName}
                    onChange={(e) => setSettings({ ...settings, customInkName: e.target.value })}
                    placeholder="Napr. Pantone Black 7"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

              {/* Density */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Density: {settings.density}%
                </label>
                <input
                  type="range"
                  value={settings.density}
                  onChange={(e) => setSettings({ ...settings, density: parseInt(e.target.value) })}
                  min={0}
                  max={100}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>0%</span>
                  <span>Percento pridaného atramentu</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Offset */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Offset (Choke): {settings.offset} mm
                </label>
                <input
                  type="range"
                  value={settings.offset * 100}
                  onChange={(e) => setSettings({ ...settings, offset: parseInt(e.target.value) / 100 })}
                  min={0}
                  max={50}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>0 mm</span>
                  <span>Vzdialenosť od okraja</span>
                  <span>0.5 mm</span>
                </div>
              </div>

              {/* Corner Style */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Štýl rohov</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MITER', 'BEVEL', 'ROUND'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => setSettings({ ...settings, cornerStyle: style })}
                      className={`py-2 rounded text-sm transition-colors ${
                        settings.cornerStyle === style
                          ? 'bg-pink-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {style === 'MITER' ? '📐 Ostré' : style === 'BEVEL' ? '📏 Skosené' : '⭕ Zaoblené'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Miter Limit */}
              {settings.cornerStyle === 'MITER' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Miter Limit: {settings.miterLimit}
                  </label>
                  <input
                    type="range"
                    value={settings.miterLimit}
                    onChange={(e) => setSettings({ ...settings, miterLimit: parseInt(e.target.value) })}
                    min={1}
                    max={10}
                    className="w-full accent-pink-500"
                  />
                </div>
              )}

              {/* Min Density Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Minimálna denzita: {settings.minDensityFilter}
                </label>
                <input
                  type="range"
                  value={settings.minDensityFilter * 100}
                  onChange={(e) => setSettings({ ...settings, minDensityFilter: parseInt(e.target.value) / 100 })}
                  min={0}
                  max={400}
                  className="w-full accent-pink-500"
                />
                <div className="text-xs text-slate-600">
                  Aplikuje sa len na farby s denzitou vyššou ako táto hodnota
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-2">Náhľad:</div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-black rounded" />
                    <div 
                      className="absolute inset-1 rounded"
                      style={{ 
                        backgroundColor: settings.addInk === 'CYAN' ? '#00BCD4' : 
                                        settings.addInk === 'MAGENTA' ? '#E91E63' : '#9C27B0',
                        opacity: settings.density / 100
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    <div>Čierna + {settings.density}% {settings.addInk}</div>
                    <div>Offset: {settings.offset} mm</div>
                    <div>Rohy: {settings.cornerStyle}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
          >
            Zrušiť
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-400 rounded-lg text-sm"
          >
            Aplikovať
          </button>
        </div>
      </div>
    </div>
  )
}

export default RichBlackDialog

/**
 * GPCS CodeStudio - White Underprint Dialog
 * Nastavenia pre bielu podtlač - ESKO kompatibilný
 */

import React, { useState } from 'react'

export interface WhiteUnderprintSettings {
  enabled: boolean
  inkName: 'TRANSPARENT_WHITE' | 'OPAQUE_WHITE' | 'CUSTOM'
  customInkName: string
  chokeDistance: number  // mm
  createSeparateLayer: boolean
  layerName: string
  applyTo: 'ALL' | 'SELECTED' | 'SPOT_COLORS_ONLY'
  excludeWhite: boolean  // Vynechať biele objekty
  excludeMetallic: boolean  // Vynechať metalické farby
  density: number  // 0-100%
}

interface WhiteUnderprintDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: WhiteUnderprintSettings
  onApply: (settings: WhiteUnderprintSettings) => void
}

export const WhiteUnderprintDialog: React.FC<WhiteUnderprintDialogProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onApply
}) => {
  const [settings, setSettings] = useState<WhiteUnderprintSettings>(initialSettings)

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
            <span>⬜</span> White Underprint
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
          {/* Info */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-xs text-cyan-300">
            <strong>ℹ️ White Underprint</strong>
            <p className="mt-1 text-cyan-400/80">
              Vytvorí bielu podtlač pod grafikou pre transparentné alebo metalické materiály.
              Zachováva sýtosť farieb na netransparentnom podklade.
            </p>
          </div>

          {/* Enable */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-pink-500"
            />
            <div>
              <div className="text-sm text-white">Povoliť White Underprint</div>
              <div className="text-xs text-slate-500">Vytvorí bielu vrstvu pod grafikou</div>
            </div>
          </label>

          {settings.enabled && (
            <>
              {/* Ink Name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Typ bieleho atramentu</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TRANSPARENT_WHITE', 'OPAQUE_WHITE', 'CUSTOM'] as const).map(ink => (
                    <button
                      key={ink}
                      onClick={() => setSettings({ ...settings, inkName: ink })}
                      className={`py-2 rounded text-xs transition-colors ${
                        settings.inkName === ink
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {ink === 'TRANSPARENT_WHITE' ? 'Transparent' : 
                       ink === 'OPAQUE_WHITE' ? 'Opaque' : 'Vlastný'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Ink Name */}
              {settings.inkName === 'CUSTOM' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Názov atramentu</label>
                  <input
                    type="text"
                    value={settings.customInkName}
                    onChange={(e) => setSettings({ ...settings, customInkName: e.target.value })}
                    placeholder="Napr. White Ink"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

              {/* Choke Distance */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Choke Distance: {settings.chokeDistance} mm
                </label>
                <input
                  type="range"
                  value={settings.chokeDistance * 100}
                  onChange={(e) => setSettings({ ...settings, chokeDistance: parseInt(e.target.value) / 100 })}
                  min={0}
                  max={100}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>0 mm</span>
                  <span>Zmenšenie bielej oproti grafike</span>
                  <span>1 mm</span>
                </div>
              </div>

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
              </div>

              {/* Apply To */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Aplikovať na</label>
                <select
                  value={settings.applyTo}
                  onChange={(e) => setSettings({ ...settings, applyTo: e.target.value as typeof settings.applyTo })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="ALL">Všetky objekty</option>
                  <option value="SELECTED">Len vybrané objekty</option>
                  <option value="SPOT_COLORS_ONLY">Len spot farby</option>
                </select>
              </div>

              {/* Exclusions */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">Vylúčenia</label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.excludeWhite}
                    onChange={(e) => setSettings({ ...settings, excludeWhite: e.target.checked })}
                    className="rounded border-slate-600 bg-slate-800 text-pink-500"
                  />
                  <span className="text-sm text-slate-300">Vynechať biele objekty</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.excludeMetallic}
                    onChange={(e) => setSettings({ ...settings, excludeMetallic: e.target.checked })}
                    className="rounded border-slate-600 bg-slate-800 text-pink-500"
                  />
                  <span className="text-sm text-slate-300">Vynechať metalické farby</span>
                </label>
              </div>

              {/* Separate Layer */}
              <div className="border-t border-slate-800 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.createSeparateLayer}
                    onChange={(e) => setSettings({ ...settings, createSeparateLayer: e.target.checked })}
                    className="rounded border-slate-600 bg-slate-800 text-pink-500"
                  />
                  <div>
                    <div className="text-sm text-white">Vytvoriť samostatnú vrstvu</div>
                    <div className="text-xs text-slate-500">Biela bude na vlastnej vrstve</div>
                  </div>
                </label>

                {settings.createSeparateLayer && (
                  <div className="mt-2">
                    <label className="block text-xs text-slate-400 mb-1">Názov vrstvy</label>
                    <input
                      type="text"
                      value={settings.layerName}
                      onChange={(e) => setSettings({ ...settings, layerName: e.target.value })}
                      placeholder="White Underprint Layer"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-2">Náhľad:</div>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    {/* Substrate */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-700 rounded" />
                    {/* White underprint */}
                    <div 
                      className="absolute rounded"
                      style={{ 
                        inset: `${settings.chokeDistance * 10}px`,
                        backgroundColor: `rgba(255, 255, 255, ${settings.density / 100})`
                      }}
                    />
                    {/* Graphic */}
                    <div className="absolute inset-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">
                      ABC
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    <div>Typ: {settings.inkName.replace('_', ' ')}</div>
                    <div>Choke: {settings.chokeDistance} mm</div>
                    <div>Density: {settings.density}%</div>
                    {settings.createSeparateLayer && (
                      <div>Vrstva: {settings.layerName || 'White Underprint'}</div>
                    )}
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

export default WhiteUnderprintDialog

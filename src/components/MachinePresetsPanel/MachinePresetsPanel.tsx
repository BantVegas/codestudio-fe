// src/components/MachinePresetsPanel/MachinePresetsPanel.tsx
import React, { useState } from 'react'
import type { MachinePreset, MachineType, DistortionSettings } from '../../types/barcodeTypes'

interface MachinePresetsPanelProps {
  presets: MachinePreset[]
  selectedPresetId: string | null
  onSelectPreset: (preset: MachinePreset) => void
  onApplyDistortion: (settings: DistortionSettings) => void
  distortionSettings: DistortionSettings
}

const DEFAULT_PRESETS: MachinePreset[] = [
  {
    id: 'omet_x6_offset',
    name: 'OMET X6 Offset',
    manufacturer: 'OMET',
    model: 'X6',
    type: 'OFFSET',
    minWebWidthMm: 100,
    maxWebWidthMm: 430,
    minRepeatLengthMm: 254,
    maxRepeatLengthMm: 610,
    minXDimMm: 0.254,
    preferredMagnifications: [80, 100, 120, 150, 200],
    maxLpi: 200,
    nativeDpi: 2540,
    maxColors: 8,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.15,
    distortionDirection: 'WEB',
    notes: ['Offset UV', 'Vysoká kvalita', 'Jemné detaily'],
  },
  {
    id: 'omet_x6_flexo',
    name: 'OMET X6 Flexo',
    manufacturer: 'OMET',
    model: 'X6',
    type: 'FLEXO',
    minWebWidthMm: 100,
    maxWebWidthMm: 430,
    minRepeatLengthMm: 254,
    maxRepeatLengthMm: 610,
    minXDimMm: 0.264,
    preferredMagnifications: [80, 100, 120, 150, 200],
    maxLpi: 175,
    nativeDpi: 2540,
    maxColors: 10,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.3,
    distortionDirection: 'WEB',
    notes: ['Flexo UV', 'Servo pohon', 'Quick change sleeves'],
  },
  {
    id: 'omet_x4_flexo',
    name: 'OMET X4 Flexo',
    manufacturer: 'OMET',
    model: 'X4',
    type: 'FLEXO',
    minWebWidthMm: 80,
    maxWebWidthMm: 350,
    minRepeatLengthMm: 200,
    maxRepeatLengthMm: 508,
    minXDimMm: 0.264,
    preferredMagnifications: [80, 100, 120, 150],
    maxLpi: 150,
    nativeDpi: 2540,
    maxColors: 8,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.28,
    distortionDirection: 'WEB',
    notes: ['Flexo UV', 'Kompaktný stroj', 'Rýchla výmena'],
  },
  {
    id: 'gidue_offset',
    name: 'GIDUE Offset',
    manufacturer: 'GIDUE',
    model: 'Combat',
    type: 'OFFSET',
    minWebWidthMm: 100,
    maxWebWidthMm: 430,
    minRepeatLengthMm: 254,
    maxRepeatLengthMm: 610,
    minXDimMm: 0.254,
    preferredMagnifications: [80, 100, 120, 150, 200],
    maxLpi: 200,
    nativeDpi: 2540,
    maxColors: 10,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.12,
    distortionDirection: 'WEB',
    notes: ['Offset UV', 'Vysoká presnosť', 'Multi-process'],
  },
  {
    id: 'gidue_flexo',
    name: 'GIDUE Flexo',
    manufacturer: 'GIDUE',
    model: 'Combat',
    type: 'FLEXO',
    minWebWidthMm: 100,
    maxWebWidthMm: 430,
    minRepeatLengthMm: 254,
    maxRepeatLengthMm: 610,
    minXDimMm: 0.264,
    preferredMagnifications: [80, 100, 120, 150, 200],
    maxLpi: 175,
    nativeDpi: 2540,
    maxColors: 12,
    hasWhiteUnit: true,
    hasVarnishUnit: true,
    defaultDistortionPercent: 0.25,
    distortionDirection: 'WEB',
    notes: ['Flexo UV/LED', 'Inline die-cutting', 'Servo driven'],
  },
  {
    id: 'xeikon_digital',
    name: 'XEIKON Digital',
    manufacturer: 'XEIKON',
    model: 'CX3',
    type: 'DIGITAL',
    minWebWidthMm: 100,
    maxWebWidthMm: 330,
    minRepeatLengthMm: 100,
    maxRepeatLengthMm: 1000,
    minXDimMm: 0.169,
    preferredMagnifications: [100, 150, 200],
    maxLpi: 230,
    nativeDpi: 1200,
    maxColors: 5,
    hasWhiteUnit: true,
    hasVarnishUnit: false,
    defaultDistortionPercent: 0,
    distortionDirection: 'WEB',
    notes: ['Digitálny toner', 'Variable data native', 'Bez distortion'],
  },
]

const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  FLEXO: 'Flexografia',
  OFFSET: 'Offset',
  DIGITAL: 'Digitálna tlač',
  LETTERPRESS: 'Letterpress',
  GRAVURE: 'Hĺbkotlač',
  SCREEN: 'Sieťotlač',
}

export const MachinePresetsPanel: React.FC<MachinePresetsPanelProps> = ({
  presets: _customPresets,
  selectedPresetId,
  onSelectPreset,
  onApplyDistortion,
  distortionSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'distortion' | 'custom'>('presets')
  const allPresets = DEFAULT_PRESETS

  const selectedPreset = allPresets.find(p => p.id === selectedPresetId)

  const handleSelectPreset = (preset: MachinePreset) => {
    onSelectPreset(preset)
    // Auto-apply distortion settings from preset
    if (preset.type === 'FLEXO') {
      onApplyDistortion({
        enabled: true,
        webDirectionPercent: preset.defaultDistortionPercent,
        crossDirectionPercent: 0,
        previewDistorted: true,
      })
    } else {
      onApplyDistortion({
        enabled: false,
        webDirectionPercent: 0,
        crossDirectionPercent: 0,
        previewDistorted: false,
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-slate-600">
        {(['presets', 'distortion', 'custom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-sky-500 bg-sky-500/10 text-sky-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tab === 'presets' && '🖨️ Stroje'}
            {tab === 'distortion' && '📐 Distortion'}
            {tab === 'custom' && '➕ Vlastný'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-2 gap-4">
            {allPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedPresetId === preset.id
                    ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-100">{preset.name}</span>
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${
                    preset.type === 'DIGITAL' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {MACHINE_TYPE_LABELS[preset.type]}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {preset.manufacturer} {preset.model}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>Šírka: {preset.minWebWidthMm}–{preset.maxWebWidthMm} mm</span>
                  <span>Repeat: {preset.minRepeatLengthMm}–{preset.maxRepeatLengthMm} mm</span>
                  <span>Min X-dim: {preset.minXDimMm} mm</span>
                  <span>Max LPI: {preset.maxLpi}</span>
                </div>
                {preset.type === 'FLEXO' && (
                  <div className="mt-2 text-xs font-medium text-amber-400">
                    ⚠️ Distortion: {preset.defaultDistortionPercent}%
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* DISTORTION TAB */}
        {activeTab === 'distortion' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-5">
              <label className="mb-4 flex items-center gap-3 text-base font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={distortionSettings.enabled}
                  onChange={e => onApplyDistortion({ ...distortionSettings, enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-sky-500"
                />
                Povoliť distortion kompenzáciu
              </label>

              {distortionSettings.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Web smer (%) – roztiahnutie v smere pásu
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={distortionSettings.webDirectionPercent}
                      onChange={e => onApplyDistortion({ ...distortionSettings, webDirectionPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Typické hodnoty: Flexo 0.2–0.5%, Offset 0.1–0.2%
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Cross smer (%) – roztiahnutie priečne
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={distortionSettings.crossDirectionPercent}
                      onChange={e => onApplyDistortion({ ...distortionSettings, crossDirectionPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={distortionSettings.previewDistorted}
                      onChange={e => onApplyDistortion({ ...distortionSettings, previewDistorted: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-500"
                    />
                    Zobraziť distortovaný náhľad
                  </label>
                </div>
              )}
            </div>

            {selectedPreset && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                <h4 className="mb-2 text-base font-semibold text-amber-300">
                  Odporúčanie pre {selectedPreset.name}
                </h4>
                <p className="text-sm text-amber-200/70">
                  Pre {MACHINE_TYPE_LABELS[selectedPreset.type]} odporúčame distortion {selectedPreset.defaultDistortionPercent}% v smere pásu.
                </p>
                <button
                  onClick={() => onApplyDistortion({
                    enabled: true,
                    webDirectionPercent: selectedPreset.defaultDistortionPercent,
                    crossDirectionPercent: 0,
                    previewDistorted: true,
                  })}
                  className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  Použiť odporúčané
                </button>
              </div>
            )}
          </div>
        )}

        {/* CUSTOM TAB */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Vytvorte vlastný strojový preset pre váš tlačový stroj.
            </p>
            <div className="rounded-xl border-2 border-dashed border-slate-600 p-8 text-center">
              <span className="text-4xl">🏭</span>
              <p className="mt-3 text-base text-slate-400">
                Funkcia bude dostupná v ďalšej verzii
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with selected preset info */}
      {selectedPreset && (
        <div className="border-t border-slate-600 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Aktívny stroj:</span>
            <span className="font-semibold text-sky-300">{selectedPreset.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}

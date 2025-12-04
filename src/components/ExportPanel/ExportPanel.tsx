// src/components/ExportPanel/ExportPanel.tsx
import React, { useState, useCallback } from 'react'
import type {
  ExportSettings,
  ExportFormat,
  PdfVersion,
  ColorMode,
  SpotColor,
  SeparationPreview,
  Layer,
  LabelConfig,
} from '../../types/barcodeTypes'
import { DEFAULT_SPOT_COLORS } from '../../types/barcodeTypes'

interface ExportPanelProps {
  exportSettings: ExportSettings
  onUpdateSettings: (updates: Partial<ExportSettings>) => void
  labelConfig: LabelConfig
  layers: Layer[]
  onExport: (settings: ExportSettings) => void
  onGenerateSeparationPreview: () => SeparationPreview[]
}

const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'PDF', label: 'PDF', description: 'Vektorový PDF pre tlač' },
  { value: 'SVG', label: 'SVG', description: 'Škálovateľná vektorová grafika' },
  { value: 'PNG', label: 'PNG', description: 'Rastrový náhľad (transparentný)' },
  { value: 'TIFF', label: 'TIFF', description: 'Vysoké rozlíšenie pre tlač' },
  { value: 'EPS', label: 'EPS', description: 'Encapsulated PostScript' },
]

const PDF_VERSIONS: { value: PdfVersion; label: string; description: string }[] = [
  { value: '1.4', label: 'PDF 1.4', description: 'Acrobat 5 kompatibilný' },
  { value: '1.5', label: 'PDF 1.5', description: 'Acrobat 6 kompatibilný' },
  { value: '1.6', label: 'PDF 1.6', description: 'Acrobat 7 kompatibilný' },
  { value: '1.7', label: 'PDF 1.7', description: 'Acrobat 8+ kompatibilný' },
  { value: 'PDF_X1a', label: 'PDF/X-1a', description: 'CMYK pre tlač' },
  { value: 'PDF_X3', label: 'PDF/X-3', description: 'ICC farebný manažment' },
  { value: 'PDF_X4', label: 'PDF/X-4', description: 'Transparentnosť + vrstvy' },
]

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: 'CMYK', label: 'CMYK' },
  { value: 'RGB', label: 'RGB' },
  { value: 'GRAYSCALE', label: 'Šedotón' },
  { value: 'SPOT', label: 'Spot farby' },
]

const DPI_OPTIONS = [150, 300, 600, 1200, 2400]

export const ExportPanel: React.FC<ExportPanelProps> = ({
  exportSettings,
  onUpdateSettings,
  labelConfig,
  layers,
  onExport,
  onGenerateSeparationPreview,
}) => {
  const [activeTab, setActiveTab] = useState<'format' | 'colors' | 'marks' | 'preview'>('format')
  const [separationPreviews, setSeparationPreviews] = useState<SeparationPreview[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleAddSpotColor = () => {
    const newColor: SpotColor = {
      name: `SPOT_${exportSettings.spotColors.length + 1}`,
      displayColor: '#FF0000',
      cmykFallback: { c: 0, m: 100, y: 100, k: 0 },
    }
    onUpdateSettings({
      spotColors: [...exportSettings.spotColors, newColor],
    })
  }

  const handleUpdateSpotColor = (index: number, updates: Partial<SpotColor>) => {
    const newColors = [...exportSettings.spotColors]
    newColors[index] = { ...newColors[index], ...updates }
    onUpdateSettings({ spotColors: newColors })
  }

  const handleRemoveSpotColor = (index: number) => {
    const newColors = exportSettings.spotColors.filter((_, i) => i !== index)
    onUpdateSettings({ spotColors: newColors })
  }

  const handleGeneratePreview = async () => {
    setIsGenerating(true)
    try {
      const previews = onGenerateSeparationPreview()
      setSeparationPreviews(previews)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = () => {
    onExport(exportSettings)
  }

  // Calculate file info
  const estimatedSize = useCallback(() => {
    const { format, dpi, colorMode } = exportSettings
    const { widthMm, heightMm, bleedMm } = labelConfig
    
    const totalW = widthMm + 2 * bleedMm
    const totalH = heightMm + 2 * bleedMm
    
    if (format === 'PDF' || format === 'SVG' || format === 'EPS') {
      return '< 100 KB (vektor)'
    }
    
    const pixels = (totalW / 25.4 * dpi) * (totalH / 25.4 * dpi)
    const channels = colorMode === 'CMYK' ? 4 : colorMode === 'GRAYSCALE' ? 1 : 3
    const rawSize = pixels * channels
    const compressed = rawSize * (format === 'PNG' ? 0.3 : 0.1)
    
    if (compressed > 1000000) return `~${(compressed / 1000000).toFixed(1)} MB`
    return `~${(compressed / 1000).toFixed(0)} KB`
  }, [exportSettings, labelConfig])

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/80">
      {/* Header */}
      <div className="border-b border-slate-700 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Export
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: 'format', label: 'Formát' },
          { id: 'colors', label: 'Farby' },
          { id: 'marks', label: 'Značky' },
          { id: 'preview', label: 'Náhľad' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* FORMAT TAB */}
        {activeTab === 'format' && (
          <div className="space-y-4">
            {/* Export format */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-400">
                Formát výstupu
              </label>
              <div className="grid grid-cols-5 gap-1">
                {EXPORT_FORMATS.map(fmt => (
                  <button
                    key={fmt.value}
                    onClick={() => onUpdateSettings({ format: fmt.value })}
                    className={`rounded border px-2 py-1.5 text-center text-[10px] transition-colors ${
                      exportSettings.format === fmt.value
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                    title={fmt.description}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PDF Version */}
            {exportSettings.format === 'PDF' && (
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-400">
                  PDF verzia
                </label>
                <select
                  value={exportSettings.pdfVersion}
                  onChange={(e) => onUpdateSettings({ pdfVersion: e.target.value as PdfVersion })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200"
                >
                  {PDF_VERSIONS.map(v => (
                    <option key={v.value} value={v.value}>
                      {v.label} - {v.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* DPI */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-400">
                Rozlíšenie (DPI)
              </label>
              <div className="flex gap-1">
                {DPI_OPTIONS.map(dpi => (
                  <button
                    key={dpi}
                    onClick={() => onUpdateSettings({ dpi })}
                    className={`flex-1 rounded border px-2 py-1 text-[10px] ${
                      exportSettings.dpi === dpi
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {dpi}
                  </button>
                ))}
              </div>
            </div>

            {/* Font options */}
            <div className="space-y-2">
              <label className="mb-1 block text-[10px] font-medium text-slate-400">
                Fonty
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={exportSettings.embedFonts}
                  onChange={(e) => onUpdateSettings({ embedFonts: e.target.checked })}
                  className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                />
                Embedovať fonty
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={exportSettings.outlineFonts}
                  onChange={(e) => onUpdateSettings({ outlineFonts: e.target.checked })}
                  className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                />
                Konvertovať text na krivky
              </label>
            </div>

            {/* Estimated size */}
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2 text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Odhadovaná veľkosť:</span>
                <span className="font-medium text-slate-200">{estimatedSize()}</span>
              </div>
            </div>
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            {/* Color mode */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-400">
                Farebný režim
              </label>
              <div className="grid grid-cols-4 gap-1">
                {COLOR_MODES.map(cm => (
                  <button
                    key={cm.value}
                    onClick={() => onUpdateSettings({ colorMode: cm.value })}
                    className={`rounded border px-2 py-1 text-[10px] ${
                      exportSettings.colorMode === cm.value
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {cm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barcode color settings */}
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
              <h4 className="mb-2 text-[10px] font-medium text-slate-300">
                Čiarový kód
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[9px] text-slate-400">
                    Názov farby kódu
                  </label>
                  <input
                    type="text"
                    value={exportSettings.barcodeColorName}
                    onChange={(e) => onUpdateSettings({ barcodeColorName: e.target.value })}
                    className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                    placeholder="BARCODE_BLACK"
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={exportSettings.barcodeAsSpot}
                    onChange={(e) => onUpdateSettings({ barcodeAsSpot: e.target.checked })}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                  />
                  Exportovať ako spot farbu
                </label>
              </div>
            </div>

            {/* White underprint */}
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
              <h4 className="mb-2 text-[10px] font-medium text-slate-300">
                Biela podtlač (pre fólie)
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={exportSettings.whiteUnderprint}
                    onChange={(e) => onUpdateSettings({ whiteUnderprint: e.target.checked })}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                  />
                  Generovať bielu podtlač
                </label>
                {exportSettings.whiteUnderprint && (
                  <div>
                    <label className="mb-1 block text-[9px] text-slate-400">
                      Spread (mm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={exportSettings.whiteUnderprintSpread}
                      onChange={(e) => onUpdateSettings({ whiteUnderprintSpread: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Spot colors */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[10px] font-medium text-slate-400">
                  Spot farby
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      onUpdateSettings({
                        spotColors: DEFAULT_SPOT_COLORS,
                      })
                    }
                    className="rounded bg-slate-700 px-2 py-0.5 text-[9px] text-slate-300 hover:bg-slate-600"
                  >
                    Default
                  </button>
                  <button
                    onClick={handleAddSpotColor}
                    className="rounded bg-slate-700 px-2 py-0.5 text-[9px] text-slate-300 hover:bg-slate-600"
                  >
                    + Pridať
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {exportSettings.spotColors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800/50 p-2"
                  >
                    <input
                      type="color"
                      value={color.displayColor}
                      onChange={(e) => handleUpdateSpotColor(index, { displayColor: e.target.value })}
                      className="h-6 w-6 cursor-pointer rounded border border-slate-600"
                    />
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) => handleUpdateSpotColor(index, { name: e.target.value })}
                      className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200"
                    />
                    <button
                      onClick={() => handleRemoveSpotColor(index)}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {exportSettings.spotColors.length === 0 && (
                  <div className="py-2 text-center text-[10px] text-slate-500">
                    Žiadne spot farby
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MARKS TAB */}
        {activeTab === 'marks' && (
          <div className="space-y-4">
            {/* Bleed */}
            <label className="flex items-center gap-2 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={exportSettings.includeBleed}
                onChange={(e) => onUpdateSettings({ includeBleed: e.target.checked })}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900"
              />
              Zahrnúť bleed ({labelConfig.bleedMm} mm)
            </label>

            {/* Crop marks */}
            <label className="flex items-center gap-2 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={exportSettings.includeCropMarks}
                onChange={(e) => onUpdateSettings({ includeCropMarks: e.target.checked })}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900"
              />
              Orezové značky
            </label>

            {/* Registration marks */}
            <label className="flex items-center gap-2 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={exportSettings.includeRegistrationMarks}
                onChange={(e) => onUpdateSettings({ includeRegistrationMarks: e.target.checked })}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900"
              />
              Registračné krížiky
            </label>

            {/* Color bars */}
            <label className="flex items-center gap-2 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={exportSettings.includeColorBars}
                onChange={(e) => onUpdateSettings({ includeColorBars: e.target.checked })}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900"
              />
              Farebný prúžok (CMYK)
            </label>

            {/* Mark offset */}
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">
                Offset značiek od trimu (mm)
              </label>
              <input
                type="number"
                step="0.5"
                value={exportSettings.markOffset}
                onChange={(e) => onUpdateSettings({ markOffset: parseFloat(e.target.value) || 3 })}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
              />
            </div>

            {/* Preview */}
            <div className="mt-4 rounded border border-slate-700 bg-slate-800 p-4">
              <svg viewBox="0 0 160 120" className="w-full">
                {/* Bleed area */}
                {exportSettings.includeBleed && (
                  <rect x="20" y="15" width="120" height="90" fill="#fef3c7" fillOpacity="0.3" />
                )}
                
                {/* Trim */}
                <rect x="30" y="25" width="100" height="70" fill="#ffffff" stroke="#3b82f6" strokeWidth="1" />
                
                {/* Crop marks */}
                {exportSettings.includeCropMarks && (
                  <g stroke="#000" strokeWidth="0.5">
                    <line x1="20" y1="25" x2="28" y2="25" />
                    <line x1="30" y1="15" x2="30" y2="23" />
                    <line x1="132" y1="25" x2="140" y2="25" />
                    <line x1="130" y1="15" x2="130" y2="23" />
                    <line x1="20" y1="95" x2="28" y2="95" />
                    <line x1="30" y1="97" x2="30" y2="105" />
                    <line x1="132" y1="95" x2="140" y2="95" />
                    <line x1="130" y1="97" x2="130" y2="105" />
                  </g>
                )}
                
                {/* Registration marks */}
                {exportSettings.includeRegistrationMarks && (
                  <g>
                    <circle cx="15" cy="60" r="4" fill="none" stroke="#000" strokeWidth="0.5" />
                    <line x1="11" y1="60" x2="19" y2="60" stroke="#000" strokeWidth="0.5" />
                    <line x1="15" y1="56" x2="15" y2="64" stroke="#000" strokeWidth="0.5" />
                    
                    <circle cx="145" cy="60" r="4" fill="none" stroke="#000" strokeWidth="0.5" />
                    <line x1="141" y1="60" x2="149" y2="60" stroke="#000" strokeWidth="0.5" />
                    <line x1="145" y1="56" x2="145" y2="64" stroke="#000" strokeWidth="0.5" />
                  </g>
                )}
                
                {/* Color bars */}
                {exportSettings.includeColorBars && (
                  <g>
                    <rect x="30" y="110" width="25" height="6" fill="#00FFFF" />
                    <rect x="55" y="110" width="25" height="6" fill="#FF00FF" />
                    <rect x="80" y="110" width="25" height="6" fill="#FFFF00" />
                    <rect x="105" y="110" width="25" height="6" fill="#000000" />
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <button
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className="w-full rounded bg-sky-600 py-2 text-[11px] font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isGenerating ? 'Generujem...' : 'Generovať separácie'}
            </button>

            {separationPreviews.length > 0 && (
              <div className="space-y-2">
                {separationPreviews.map((sep, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded border border-slate-700 bg-slate-800/50 p-2"
                  >
                    <div className="h-12 w-12 rounded border border-slate-600 bg-white">
                      {sep.previewDataUrl && (
                        <img
                          src={sep.previewDataUrl}
                          alt={sep.colorName}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] font-medium text-slate-200">
                        {sep.colorName}
                        {sep.isSpot && (
                          <span className="ml-2 rounded bg-purple-500/20 px-1 py-0.5 text-[9px] text-purple-300">
                            SPOT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Pokrytie: {sep.coverage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Layers info */}
      <div className="border-t border-slate-800 px-3 py-1 text-[9px] text-slate-500">
        Vrstvy v label canvase: {layers.length}
      </div>

      {/* Export button */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={handleExport}
          className="w-full rounded bg-emerald-600 py-2 text-[11px] font-medium text-white hover:bg-emerald-500"
        >
          Exportovať {exportSettings.format}
        </button>
      </div>
    </div>
  )
}

export default ExportPanel
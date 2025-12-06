// src/components/StepRepeatPanel/StepRepeatPanel.tsx
import React, { useState, useMemo } from 'react'
import type {
  StepRepeatConfig,
  WebStepRepeat,
  SheetStepRepeat,
  StepRepeatMode,
  StaggerMode,
  LabelConfig,
} from '../../types/barcodeTypes'

interface StepRepeatPanelProps {
  config: StepRepeatConfig
  onUpdateConfig: (config: StepRepeatConfig) => void
  labelConfig: LabelConfig
  onGenerateLayout: () => void
}

const STAGGER_MODES: { value: StaggerMode; label: string }[] = [
  { value: 'NONE', label: 'Bez posunutia' },
  { value: 'HALF', label: '1/2 posun' },
  { value: 'THIRD', label: '1/3 posun' },
  { value: 'CUSTOM', label: 'Vlastný' },
]

export const StepRepeatPanel: React.FC<StepRepeatPanelProps> = ({
  config,
  onUpdateConfig,
  labelConfig,
  onGenerateLayout,
}) => {
  const [previewScale, setPreviewScale] = useState(0.3)

  const isWebMode = config.mode === 'WEB'
  const webConfig = config as WebStepRepeat
  const sheetConfig = config as SheetStepRepeat

  // Výpočty pre web mode
  const webCalculations = useMemo(() => {
    if (!isWebMode) return null

    const { widthMm, heightMm } = labelConfig
    const { webWidthMm, repeatLengthMm, lanes, rows, horizontalGapMm, verticalGapMm, leftMarginMm, rightMarginMm, leadingEdgeMm, trailingEdgeMm } = webConfig

    const labelWidthWithGap = widthMm + horizontalGapMm
    const labelHeightWithGap = heightMm + verticalGapMm

    const usableWidth = webWidthMm - leftMarginMm - rightMarginMm
    const usableLength = repeatLengthMm - leadingEdgeMm - trailingEdgeMm

    const maxLanes = Math.floor((usableWidth + horizontalGapMm) / labelWidthWithGap)
    const maxRows = Math.floor((usableLength + verticalGapMm) / labelHeightWithGap)

    const actualLanes = Math.min(lanes, maxLanes)
    const actualRows = Math.min(rows, maxRows)
    const labelsPerRepeat = actualLanes * actualRows

    const totalLabelsWidth = actualLanes * widthMm + (actualLanes - 1) * horizontalGapMm
    const totalLabelsHeight = actualRows * heightMm + (actualRows - 1) * verticalGapMm

    const wasteWidth = usableWidth - totalLabelsWidth
    const wastePercent = ((webWidthMm * repeatLengthMm - labelsPerRepeat * widthMm * heightMm) / (webWidthMm * repeatLengthMm) * 100)

    return {
      maxLanes,
      maxRows,
      actualLanes,
      actualRows,
      labelsPerRepeat,
      totalLabelsWidth,
      totalLabelsHeight,
      wasteWidth,
      wastePercent,
      usableWidth,
      usableLength,
    }
  }, [isWebMode, labelConfig, webConfig])

  // Výpočty pre sheet mode
  const sheetCalculations = useMemo(() => {
    if (isWebMode) return null

    const { widthMm, heightMm } = labelConfig
    const { sheetWidthMm, sheetHeightMm, columns, rows, horizontalGapMm, verticalGapMm, topMarginMm, bottomMarginMm, leftMarginMm, rightMarginMm } = sheetConfig

    const usableWidth = sheetWidthMm - leftMarginMm - rightMarginMm
    const usableHeight = sheetHeightMm - topMarginMm - bottomMarginMm

    const labelWidthWithGap = widthMm + horizontalGapMm
    const labelHeightWithGap = heightMm + verticalGapMm

    const maxColumns = Math.floor((usableWidth + horizontalGapMm) / labelWidthWithGap)
    const maxRows = Math.floor((usableHeight + verticalGapMm) / labelHeightWithGap)

    const actualColumns = Math.min(columns, maxColumns)
    const actualRows = Math.min(rows, maxRows)
    const labelsPerSheet = actualColumns * actualRows

    const wastePercent = ((sheetWidthMm * sheetHeightMm - labelsPerSheet * widthMm * heightMm) / (sheetWidthMm * sheetHeightMm) * 100)

    return {
      maxColumns,
      maxRows,
      actualColumns,
      actualRows,
      labelsPerSheet,
      wastePercent,
      usableWidth,
      usableHeight,
    }
  }, [isWebMode, labelConfig, sheetConfig])

  const handleModeChange = (mode: StepRepeatMode) => {
    if (mode === 'WEB') {
      const newConfig: WebStepRepeat = {
        mode: 'WEB',
        webWidthMm: 330,
        repeatLengthMm: 330,
        lanes: 3,
        rows: 4,
        horizontalGapMm: 2,
        verticalGapMm: 2,
        staggerMode: 'NONE',
        leftMarginMm: 5,
        rightMarginMm: 5,
        leadingEdgeMm: 5,
        trailingEdgeMm: 5,
        includeEyeMark: true,
        eyeMarkPositionMm: 5,
        eyeMarkWidthMm: 3,
        eyeMarkHeightMm: 5,
        includeRegistrationMarks: true,
        includeColorBar: false,
        includeMicrotext: false,
        microtextContent: '',
      }
      onUpdateConfig(newConfig)
    } else {
      const newConfig: SheetStepRepeat = {
        mode: 'SHEET',
        sheetWidthMm: 297,
        sheetHeightMm: 420,
        columns: 4,
        rows: 6,
        horizontalGapMm: 2,
        verticalGapMm: 2,
        topMarginMm: 10,
        bottomMarginMm: 10,
        leftMarginMm: 10,
        rightMarginMm: 10,
        includeCropMarks: true,
        cropMarkLength: 5,
        cropMarkOffset: 3,
        includeRegistrationMarks: true,
        includeColorBar: true,
        colorBarPosition: 'bottom',
      }
      onUpdateConfig(newConfig)
    }
  }

  const updateWebConfig = (updates: Partial<WebStepRepeat>) => {
    onUpdateConfig({ ...webConfig, ...updates } as WebStepRepeat)
  }

  const updateSheetConfig = (updates: Partial<SheetStepRepeat>) => {
    onUpdateConfig({ ...sheetConfig, ...updates } as SheetStepRepeat)
  }

  const handleGenerateLayout = () => {
    onGenerateLayout()
    alert('Layout bol vygenerovaný!')
  }

  const handleExportLayout = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${isWebMode ? webConfig.webWidthMm : sheetConfig.sheetWidthMm}mm" 
     height="${isWebMode ? webConfig.repeatLengthMm : sheetConfig.sheetHeightMm}mm"
     viewBox="0 0 ${isWebMode ? webConfig.webWidthMm : sheetConfig.sheetWidthMm} ${isWebMode ? webConfig.repeatLengthMm : sheetConfig.sheetHeightMm}">
  <rect width="100%" height="100%" fill="#f0f0f0" stroke="#333" stroke-width="0.5"/>
  <text x="50%" y="50%" text-anchor="middle" font-size="8" fill="#666">Step & Repeat Layout</text>
</svg>`
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `step-repeat-layout-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mode toggle */}
      <div className="border-b border-slate-600 p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleModeChange('WEB')}
            className={`rounded-xl py-3 text-sm font-semibold transition-all ${
              isWebMode
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🔄 Rotačná tlač (pás)
          </button>
          <button
            onClick={() => handleModeChange('SHEET')}
            className={`rounded-xl py-3 text-sm font-semibold transition-all ${
              !isWebMode
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📄 Hárková tlač
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* WEB MODE */}
        {isWebMode && (
          <div className="space-y-5">
            {/* Web dimensions */}
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
              <h4 className="mb-3 text-base font-semibold text-white">📐 Rozmery pásu</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Šírka pásu (mm)</label>
                  <input
                    type="number"
                    value={webConfig.webWidthMm}
                    onChange={(e) => updateWebConfig({ webWidthMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Repeat dĺžka (mm)</label>
                  <input
                    type="number"
                    value={webConfig.repeatLengthMm}
                    onChange={(e) => updateWebConfig({ repeatLengthMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Lanes and rows */}
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
              <h4 className="mb-3 text-base font-semibold text-white">🔢 Rozloženie</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Lanes (max: {webCalculations?.maxLanes || '-'})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={webCalculations?.maxLanes || 10}
                    value={webConfig.lanes}
                    onChange={(e) => updateWebConfig({ lanes: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Rows (max: {webCalculations?.maxRows || '-'})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={webCalculations?.maxRows || 20}
                    value={webConfig.rows}
                    onChange={(e) => updateWebConfig({ rows: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Gaps */}
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
              <h4 className="mb-3 text-base font-semibold text-white">↔️ Medzery</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Horizontálna (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={webConfig.horizontalGapMm}
                    onChange={(e) => updateWebConfig({ horizontalGapMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Vertikálna (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={webConfig.verticalGapMm}
                    onChange={(e) => updateWebConfig({ verticalGapMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Margins */}
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
              <h4 className="mb-3 text-base font-semibold text-white">📏 Okraje</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Ľavý (mm)</label>
                  <input
                    type="number"
                    value={webConfig.leftMarginMm}
                    onChange={(e) => updateWebConfig({ leftMarginMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Pravý (mm)</label>
                  <input
                    type="number"
                    value={webConfig.rightMarginMm}
                    onChange={(e) => updateWebConfig({ rightMarginMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Nábehu (mm)</label>
                  <input
                    type="number"
                    value={webConfig.leadingEdgeMm}
                    onChange={(e) => updateWebConfig({ leadingEdgeMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Výbehu (mm)</label>
                  <input
                    type="number"
                    value={webConfig.trailingEdgeMm}
                    onChange={(e) => updateWebConfig({ trailingEdgeMm: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Stagger */}
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
              <h4 className="mb-3 text-base font-semibold text-white">🔀 Stagger</h4>
              <select
                value={webConfig.staggerMode}
                onChange={(e) => updateWebConfig({ staggerMode: e.target.value as StaggerMode })}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-200"
              >
                {STAGGER_MODES.map(sm => (
                  <option key={sm.value} value={sm.value}>{sm.label}</option>
                ))}
              </select>
            </div>

            {/* Registration marks */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={webConfig.includeEyeMark}
                  onChange={(e) => updateWebConfig({ includeEyeMark: e.target.checked })}
                  className="h-3 w-3"
                />
                Eye mark (optická značka)
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={webConfig.includeRegistrationMarks}
                  onChange={(e) => updateWebConfig({ includeRegistrationMarks: e.target.checked })}
                  className="h-3 w-3"
                />
                Registračné krížiky
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={webConfig.includeColorBar}
                  onChange={(e) => updateWebConfig({ includeColorBar: e.target.checked })}
                  className="h-3 w-3"
                />
                Farebný prúžok
              </label>
            </div>

            {/* Stats */}
            {webCalculations && (
              <div className="rounded border border-slate-700 bg-slate-800 p-2 text-[10px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-slate-400">Etikiet na repeat:</div>
                  <div className="font-medium text-emerald-400">{webCalculations.labelsPerRepeat}</div>
                  <div className="text-slate-400">Využitie materiálu:</div>
                  <div className="font-medium text-slate-200">{(100 - webCalculations.wastePercent).toFixed(1)}%</div>
                  <div className="text-slate-400">Odpad:</div>
                  <div className="font-medium text-amber-400">{webCalculations.wastePercent.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SHEET MODE */}
        {!isWebMode && (
          <div className="space-y-4">
            {/* Sheet dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">Šírka hárku (mm)</label>
                <input
                  type="number"
                  value={sheetConfig.sheetWidthMm}
                  onChange={(e) => updateSheetConfig({ sheetWidthMm: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">Výška hárku (mm)</label>
                <input
                  type="number"
                  value={sheetConfig.sheetHeightMm}
                  onChange={(e) => updateSheetConfig({ sheetHeightMm: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </div>
            </div>

            {/* Columns and rows */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">
                  Stĺpce (max: {sheetCalculations?.maxColumns || '-'})
                </label>
                <input
                  type="number"
                  min={1}
                  value={sheetConfig.columns}
                  onChange={(e) => updateSheetConfig({ columns: parseInt(e.target.value) || 1 })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">
                  Riadky (max: {sheetCalculations?.maxRows || '-'})
                </label>
                <input
                  type="number"
                  min={1}
                  value={sheetConfig.rows}
                  onChange={(e) => updateSheetConfig({ rows: parseInt(e.target.value) || 1 })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </div>
            </div>

            {/* Gaps */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">H medzera (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sheetConfig.horizontalGapMm}
                  onChange={(e) => updateSheetConfig({ horizontalGapMm: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">V medzera (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sheetConfig.verticalGapMm}
                  onChange={(e) => updateSheetConfig({ verticalGapMm: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </div>
            </div>

            {/* Marks */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={sheetConfig.includeCropMarks}
                  onChange={(e) => updateSheetConfig({ includeCropMarks: e.target.checked })}
                  className="h-3 w-3"
                />
                Orezové značky
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={sheetConfig.includeRegistrationMarks}
                  onChange={(e) => updateSheetConfig({ includeRegistrationMarks: e.target.checked })}
                  className="h-3 w-3"
                />
                Registračné krížiky
              </label>
              <label className="flex items-center gap-2 text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={sheetConfig.includeColorBar}
                  onChange={(e) => updateSheetConfig({ includeColorBar: e.target.checked })}
                  className="h-3 w-3"
                />
                Farebný prúžok
              </label>
            </div>

            {/* Stats */}
            {sheetCalculations && (
              <div className="rounded border border-slate-700 bg-slate-800 p-2 text-[10px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-slate-400">Etikiet na hárok:</div>
                  <div className="font-medium text-emerald-400">{sheetCalculations.labelsPerSheet}</div>
                  <div className="text-slate-400">Využitie materiálu:</div>
                  <div className="font-medium text-slate-200">{(100 - sheetCalculations.wastePercent).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Preview */}
        <div className="mt-4 rounded border border-slate-700 bg-slate-800 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Náhľad layoutu</span>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={previewScale}
              onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
          <div className="flex justify-center overflow-auto rounded bg-slate-900 p-2">
            {isWebMode && webCalculations && (
              <svg
                width={webConfig.webWidthMm * previewScale}
                height={webConfig.repeatLengthMm * previewScale}
                className="border border-slate-600"
              >
                <rect width="100%" height="100%" fill="#f5f5f5" />
                
                {/* Labels grid */}
                {Array.from({ length: webCalculations.actualLanes }).map((_, laneIdx) =>
                  Array.from({ length: webCalculations.actualRows }).map((_, rowIdx) => {
                    const x = webConfig.leftMarginMm + laneIdx * (labelConfig.widthMm + webConfig.horizontalGapMm)
                    const y = webConfig.leadingEdgeMm + rowIdx * (labelConfig.heightMm + webConfig.verticalGapMm)
                    
                    // Stagger offset
                    let staggerOffset = 0
                    if (webConfig.staggerMode === 'HALF' && rowIdx % 2 === 1) {
                      staggerOffset = (labelConfig.widthMm + webConfig.horizontalGapMm) / 2
                    }
                    
                    return (
                      <rect
                        key={`${laneIdx}-${rowIdx}`}
                        x={(x + staggerOffset) * previewScale}
                        y={y * previewScale}
                        width={labelConfig.widthMm * previewScale}
                        height={labelConfig.heightMm * previewScale}
                        fill="#ffffff"
                        stroke="#3b82f6"
                        strokeWidth={0.5}
                      />
                    )
                  })
                )}

                {/* Eye mark */}
                {webConfig.includeEyeMark && (
                  <rect
                    x={webConfig.eyeMarkPositionMm * previewScale}
                    y={2 * previewScale}
                    width={webConfig.eyeMarkWidthMm * previewScale}
                    height={webConfig.eyeMarkHeightMm * previewScale}
                    fill="#000000"
                  />
                )}
              </svg>
            )}

            {!isWebMode && sheetCalculations && (
              <svg
                width={sheetConfig.sheetWidthMm * previewScale}
                height={sheetConfig.sheetHeightMm * previewScale}
                className="border border-slate-600"
              >
                <rect width="100%" height="100%" fill="#f5f5f5" />
                
                {/* Labels grid */}
                {Array.from({ length: sheetCalculations.actualColumns }).map((_, colIdx) =>
                  Array.from({ length: sheetCalculations.actualRows }).map((_, rowIdx) => {
                    const x = sheetConfig.leftMarginMm + colIdx * (labelConfig.widthMm + sheetConfig.horizontalGapMm)
                    const y = sheetConfig.topMarginMm + rowIdx * (labelConfig.heightMm + sheetConfig.verticalGapMm)
                    
                    return (
                      <rect
                        key={`${colIdx}-${rowIdx}`}
                        x={x * previewScale}
                        y={y * previewScale}
                        width={labelConfig.widthMm * previewScale}
                        height={labelConfig.heightMm * previewScale}
                        fill="#ffffff"
                        stroke="#3b82f6"
                        strokeWidth={0.5}
                      />
                    )
                  })
                )}

                {/* Crop marks */}
                {sheetConfig.includeCropMarks && (
                  <g stroke="#000" strokeWidth={0.3}>
                    {/* Top-left */}
                    <line
                      x1={(sheetConfig.leftMarginMm - 5) * previewScale}
                      y1={sheetConfig.topMarginMm * previewScale}
                      x2={(sheetConfig.leftMarginMm - 2) * previewScale}
                      y2={sheetConfig.topMarginMm * previewScale}
                    />
                    <line
                      x1={sheetConfig.leftMarginMm * previewScale}
                      y1={(sheetConfig.topMarginMm - 5) * previewScale}
                      x2={sheetConfig.leftMarginMm * previewScale}
                      y2={(sheetConfig.topMarginMm - 2) * previewScale}
                    />
                  </g>
                )}
              </svg>
            )}
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="border-t border-slate-600 p-4 space-y-3">
        <button
          onClick={handleGenerateLayout}
          className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:bg-sky-500"
        >
          Generovať layout
        </button>
        <button
          onClick={handleExportLayout}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-500 hover:to-emerald-400"
        >
          Exportovať step & repeat SVG
        </button>
      </div>
    </div>
  )
}

export default StepRepeatPanel
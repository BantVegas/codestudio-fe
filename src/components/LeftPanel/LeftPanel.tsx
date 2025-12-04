// src/components/LeftPanel/LeftPanel.tsx
import React, { useState } from 'react'
import type {
  CodeType,
  DataMode,
  ReferenceBox,
  LabelPreset,
  VdpImportState,
  VdpImportRow,
} from '../../types/barcodeTypes'
import { VdpImportPanel } from '../VdpImportPanel/VdpImportPanel'

export type LeftPanelProps = {
  codeType: CodeType
  setCodeType: (t: CodeType) => void
  codeValue: string
  setCodeValue: (v: string) => void
  maxLength: number
  error: string
  setTouched: (v: boolean) => void

  dataMode: DataMode
  setDataMode: (m: DataMode) => void

  labelGtin14: string
  setLabelGtin14: (v: string) => void
  labelLot: string
  setLabelLot: (v: string) => void
  labelBestBefore: string
  setLabelBestBefore: (v: string) => void
  labelSerial: string
  setLabelSerial: (v: string) => void
  labelProdDate: string
  setLabelProdDate: (v: string) => void
  labelPackDate: string
  setLabelPackDate: (v: string) => void
  labelUseBy: string
  setLabelUseBy: (v: string) => void
  labelVariant: string
  setLabelVariant: (v: string) => void
  labelQuantity: string
  setLabelQuantity: (v: string) => void
  labelCount: string
  setLabelCount: (v: string) => void

  buildGs1LabelString: () => void
  computeGs1CheckDigit: (gtinBase: string) => string | null

  handleValidateGs1Linear: () => Promise<void> | void
  serverMessage: string
  serverError: string
  loading: boolean

  exportDpi: number
  setExportDpi: (v: number) => void

  labelWidthMm: number
  setLabelWidthMm: (v: number) => void
  labelHeightMm: number
  setLabelHeightMm: (v: number) => void
  labelPreset: LabelPreset
  setLabelPreset: (v: LabelPreset) => void
  bleedMm: number
  setBleedMm: (v: number) => void
  safeMarginMm: number
  setSafeMarginMm: (v: number) => void
  referenceBox: ReferenceBox
  setReferenceBox: (v: ReferenceBox) => void

  anchorX: 'start' | 'center' | 'end'
  anchorY: 'start' | 'center' | 'end'
  setAnchorX: (v: 'start' | 'center' | 'end') => void
  setAnchorY: (v: 'start' | 'center' | 'end') => void
  offsetXmm: number
  setOffsetXmm: (v: number) => void
  offsetYmm: number
  setOffsetYmm: (v: number) => void

  // VDP Import
  vdpImportState: VdpImportState
  setVdpImportState: React.Dispatch<React.SetStateAction<VdpImportState>>
  vdpImportPatternTemplate: string
  setVdpImportPatternTemplate: (v: string) => void
}

const LABEL_PRESETS: { value: LabelPreset; label: string; w: number; h: number }[] = [
  { value: '40x20', label: '40 × 20 mm', w: 40, h: 20 },
  { value: '50x30', label: '50 × 30 mm', w: 50, h: 30 },
  { value: '60x40', label: '60 × 40 mm', w: 60, h: 40 },
  { value: '100x50', label: '100 × 50 mm', w: 100, h: 50 },
  { value: '100x70', label: '100 × 70 mm', w: 100, h: 70 },
  { value: 'CUSTOM', label: 'Vlastný rozmer', w: 0, h: 0 },
]

export const LeftPanel: React.FC<LeftPanelProps> = props => {
  const [leftPanelSection, setLeftPanelSection] =
    useState<'DATA' | 'EXPORT' | 'LAYOUT' | 'BACKEND' | 'VDP_IMPORT'>('DATA')

  const [webWidthMm, setWebWidthMm] = useState(330)
  const [repeatLengthMm, setRepeatLengthMm] = useState(330)
  const [lanes, setLanes] = useState(3)
  const [rows, setRows] = useState(4)
  const [hGapMm, setHGapMm] = useState(2)
  const [vGapMm, setVGapMm] = useState(2)
  const [staggerMode, setStaggerMode] = useState<'NONE' | 'HALF'>('NONE')

  const {
    codeType,
    setCodeType,
    codeValue,
    setCodeValue,
    maxLength,
    error,
    setTouched,
    dataMode,
    setDataMode,
    labelGtin14,
    setLabelGtin14,
    labelLot,
    setLabelLot,
    labelBestBefore,
    setLabelBestBefore,
    labelSerial,
    setLabelSerial,
    labelProdDate,
    setLabelProdDate,
    labelPackDate,
    setLabelPackDate,
    labelUseBy,
    setLabelUseBy,
    labelVariant,
    setLabelVariant,
    labelQuantity,
    setLabelQuantity,
    labelCount,
    setLabelCount,
    buildGs1LabelString,
    computeGs1CheckDigit,
    handleValidateGs1Linear,
    serverMessage,
    serverError,
    loading,
    exportDpi,
    setExportDpi,
    labelWidthMm,
    setLabelWidthMm,
    labelHeightMm,
    setLabelHeightMm,
    labelPreset,
    setLabelPreset,
    bleedMm,
    setBleedMm,
    safeMarginMm,
    setSafeMarginMm,
    referenceBox,
    setReferenceBox,
    anchorX,
    anchorY,
    setAnchorX,
    setAnchorY,
    offsetXmm,
    setOffsetXmm,
    offsetYmm,
    setOffsetYmm,
    vdpImportState,
    setVdpImportState,
    vdpImportPatternTemplate,
    setVdpImportPatternTemplate,
  } = props

  const handleVdpApplyRow = (row: VdpImportRow) => {
    setCodeValue(row.generatedCode)
    setTouched(true)
    setDataMode('VDP_IMPORT')
  }

  const handleLabelPresetChange = (preset: LabelPreset) => {
    setLabelPreset(preset)
    const found = LABEL_PRESETS.find(p => p.value === preset)
    if (found && preset !== 'CUSTOM') {
      setLabelWidthMm(found.w)
      setLabelHeightMm(found.h)
    }
  }

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900/60">
      {/* HEADER */}
      <div className="flex-none border-b border-slate-800 px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          GPCS CodeStudio
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Priemyselný generátor čiarových kódov · v0.2
        </p>
      </div>

      {/* OBSAH – scrollovateľný */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-5 text-sm">
          {/* Režim kódu */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Režim kódu
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={codeType}
              onChange={e => {
                const next = e.target.value as CodeType
                setCodeType(next)
              }}
            >
              <option value="CODE128">CODE 128</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPCA">UPC-A</option>
              <option value="ITF14">ITF-14</option>
              <option value="GS1128">GS1-128 (AI reťazec)</option>
              <option value="GS1DM">GS1 DataMatrix (AI)</option>
              <option value="GS1DATABAR">GS1 DataBar (AI)</option>
              <option value="QR">QR kód</option>
            </select>
          </div>

          {/* Hodnota kódu + data mode */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Hodnota kódu
            </label>

            {/* prepínač typu dát */}
            <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => setDataMode('PLAIN')}
                className={`rounded-full border px-2 py-0.5 transition-colors ${
                  dataMode === 'PLAIN'
                    ? 'border-sky-500 bg-sky-600/20 text-sky-100'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500'
                }`}
              >
                Text / číslo
              </button>
              <button
                type="button"
                onClick={() => setDataMode('GS1_MANUAL')}
                className={`rounded-full border px-2 py-0.5 transition-colors ${
                  dataMode === 'GS1_MANUAL'
                    ? 'border-sky-500 bg-sky-600/20 text-sky-100'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500'
                }`}
              >
                GS1 manuálne
              </button>
              <button
                type="button"
                onClick={() => setDataMode('GS1_FORM')}
                disabled={
                  !(
                    codeType === 'GS1128' ||
                    codeType === 'GS1DM' ||
                    codeType === 'GS1DATABAR'
                  )
                }
                className={`rounded-full border px-2 py-0.5 transition-colors ${
                  dataMode === 'GS1_FORM'
                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-100'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500'
                } disabled:opacity-40`}
              >
                GS1 formulár
              </button>
            </div>

            <textarea
              className={`h-20 w-full resize-none rounded-md border bg-slate-900 px-2.5 py-2 text-xs text-slate-100 outline-none ring-0 transition-colors focus:ring-1 focus:ring-sky-500 ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-700 focus:border-sky-500'
              }`}
              value={codeValue}
              onChange={e => {
                setCodeValue(e.target.value)
              }}
              onBlur={() => setTouched(true)}
              maxLength={maxLength}
              placeholder="Dáta pre čiarový kód"
            />

            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {codeValue.length} / {maxLength}
              </span>
              {error && <span className="text-red-400">{error}</span>}
            </div>
          </div>

          {/* Mini menu – DATA / EXPORT / BACKEND / VDP_IMPORT */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => setLeftPanelSection('DATA')}
              className={`rounded-full border px-2 py-0.5 transition-colors ${
                leftPanelSection === 'DATA'
                  ? 'border-sky-500 bg-sky-600/20 text-sky-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500'
              }`}
            >
              Dáta / GS1
            </button>
            <button
              type="button"
              onClick={() => setLeftPanelSection('EXPORT')}
              className={`rounded-full border px-2 py-0.5 transition-colors ${
                leftPanelSection === 'EXPORT'
                  ? 'border-amber-500 bg-amber-600/20 text-amber-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500'
              }`}
            >
              Export &amp; pozícia
            </button>
            <button
              type="button"
              onClick={() => setLeftPanelSection('LAYOUT')}
              className={`rounded-full border px-2 py-0.5 transition-colors ${
                leftPanelSection === 'LAYOUT'
                  ? 'border-amber-500 bg-amber-600/20 text-amber-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500'
              }`}
            >
              Layout / S&R
            </button>
            <button
              type="button"
              onClick={() => setLeftPanelSection('VDP_IMPORT')}
              className={`rounded-full border px-2 py-0.5 transition-colors ${
                leftPanelSection === 'VDP_IMPORT'
                  ? 'border-emerald-500 bg-emerald-600/20 text-emerald-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500'
              }`}
            >
              VDP Import
            </button>
            <button
              type="button"
              onClick={() => setLeftPanelSection('BACKEND')}
              className={`rounded-full border px-2 py-0.5 transition-colors ${
                leftPanelSection === 'BACKEND'
                  ? 'border-purple-500 bg-purple-600/20 text-purple-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-purple-500'
              }`}
            >
              Overenie
            </button>
          </div>

          {/* GS1 FORM panel */}
          {leftPanelSection === 'DATA' &&
            dataMode === 'GS1_FORM' &&
            (codeType === 'GS1128' ||
              codeType === 'GS1DM' ||
              codeType === 'GS1DATABAR') && (
              <div className="rounded-md border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-200">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  GS1 Formulár
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(01) GTIN-14</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={labelGtin14}
                      onChange={e => setLabelGtin14(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(10) LOT</label>
                    <input
                      type="text"
                      value={labelLot}
                      onChange={e => setLabelLot(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(17) Best Before</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="YYMMDD"
                      value={labelBestBefore}
                      onChange={e => setLabelBestBefore(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(21) Serial</label>
                    <input
                      type="text"
                      value={labelSerial}
                      onChange={e => setLabelSerial(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(11) Prod Date</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="YYMMDD"
                      value={labelProdDate}
                      onChange={e => setLabelProdDate(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(13) Pack Date</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="YYMMDD"
                      value={labelPackDate}
                      onChange={e => setLabelPackDate(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(15) Use By</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="YYMMDD"
                      value={labelUseBy}
                      onChange={e => setLabelUseBy(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(20) Variant</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={labelVariant}
                      onChange={e => setLabelVariant(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(30) Quantity</label>
                    <input
                      type="text"
                      value={labelQuantity}
                      onChange={e => setLabelQuantity(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-slate-400">(37) Count</label>
                    <input
                      type="text"
                      value={labelCount}
                      onChange={e => setLabelCount(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={buildGs1LabelString}
                  className="mt-3 w-full rounded-md border border-emerald-600 bg-emerald-600/80 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500"
                >
                  Zostaviť GS1 reťazec
                </button>
              </div>
            )}

          {/* EXPORT sekcia */}
          {leftPanelSection === 'EXPORT' && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-300">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Export &amp; rozmer etikety
              </h4>

              {/* Label preset */}
              <div>
                <label className="mb-0.5 block text-[10px] text-slate-400">Predvolený rozmer</label>
                <select
                  value={labelPreset}
                  onChange={e => handleLabelPresetChange(e.target.value as LabelPreset)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  {LABEL_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Custom dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Šírka (mm)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={labelWidthMm}
                    onChange={e => {
                      setLabelWidthMm(Number(e.target.value) || 10)
                      setLabelPreset('CUSTOM')
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Výška (mm)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={labelHeightMm}
                    onChange={e => {
                      setLabelHeightMm(Number(e.target.value) || 10)
                      setLabelPreset('CUSTOM')
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Bleed & Safe margin */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Bleed (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={bleedMm}
                    onChange={e => setBleedMm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Safe margin (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={safeMarginMm}
                    onChange={e => setSafeMarginMm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Reference box */}
              <div>
                <label className="mb-0.5 block text-[10px] text-slate-400">Reference box</label>
                <select
                  value={referenceBox}
                  onChange={e => setReferenceBox(e.target.value as ReferenceBox)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="TRIM">Trim box</option>
                  <option value="BLEED">Bleed box</option>
                  <option value="SAFE">Safe area</option>
                </select>
              </div>

              {/* DPI */}
              <div>
                <label className="mb-0.5 block text-[10px] text-slate-400">Export DPI</label>
                <select
                  value={exportDpi}
                  onChange={e => setExportDpi(Number(e.target.value))}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value={150}>150 dpi (draft)</option>
                  <option value={300}>300 dpi (štandard)</option>
                  <option value={600}>600 dpi (high-res)</option>
                  <option value={1200}>1200 dpi (prepress)</option>
                </select>
              </div>

              {/* Anchor position */}
              <div className="border-t border-slate-700 pt-2">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Pozícia kódu na etikete
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(['start', 'center', 'end'] as const).map(y =>
                    (['start', 'center', 'end'] as const).map(x => (
                      <button
                        key={`${x}-${y}`}
                        type="button"
                        onClick={() => {
                          setAnchorX(x)
                          setAnchorY(y)
                        }}
                        className={`rounded border px-2 py-1 text-[9px] transition-colors ${
                          anchorX === x && anchorY === y
                            ? 'border-sky-500 bg-sky-600/30 text-sky-100'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {y === 'start' ? '↑' : y === 'end' ? '↓' : '•'}
                        {x === 'start' ? '←' : x === 'end' ? '→' : ''}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Offset */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Offset X (mm)</label>
                  <input
                    type="number"
                    value={offsetXmm}
                    onChange={e => setOffsetXmm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Offset Y (mm)</label>
                  <input
                    type="number"
                    value={offsetYmm}
                    onChange={e => setOffsetYmm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* LAYOUT / STEP & REPEAT sekcia */}
          {leftPanelSection === 'LAYOUT' && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-300">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Layout / Step &amp; Repeat
              </h4>

              {/* Parametre pásu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Šírka pásu (mm)</label>
                  <input
                    type="number"
                    min={100}
                    max={2000}
                    value={webWidthMm}
                    onChange={e => setWebWidthMm(Number(e.target.value) || 100)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Repeat / dĺžka (mm)</label>
                  <input
                    type="number"
                    min={100}
                    max={2000}
                    value={repeatLengthMm}
                    onChange={e => setRepeatLengthMm(Number(e.target.value) || 100)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Lanes (stopy)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={lanes}
                    onChange={e => setLanes(Number(e.target.value) || 1)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Rows (rády)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rows}
                    onChange={e => setRows(Number(e.target.value) || 1)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Horizontálny gap (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={hGapMm}
                    onChange={e => setHGapMm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Vertikálny gap (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={vGapMm}
                    onChange={e => setVGapMm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Bleed (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={bleedMm}
                    onChange={e => setBleedMm(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-slate-400">Stagger</label>
                  <select
                    value={staggerMode}
                    onChange={e => setStaggerMode(e.target.value as 'NONE' | 'HALF')}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  >
                    <option value="NONE">Žiadny</option>
                    <option value="HALF">Half stagger</option>
                  </select>
                </div>
              </div>

              {/* Náhľad pásu – placeholder */}
              <div className="mt-2 space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Náhľad pásu (koncept)
                </span>
                <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950/40">
                  <span className="px-4 text-center text-[10px] text-slate-500">
                    Tu bude vizuálny náhľad Step &amp; Repeat layoutu.
                    {' '}Aktuálne: {lanes} lanes × {rows} rád, gap {hGapMm}×{vGapMm} mm.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VDP IMPORT sekcia */}
          {leftPanelSection === 'VDP_IMPORT' && (
            <VdpImportPanel
              vdpImportState={vdpImportState}
              setVdpImportState={setVdpImportState}
              onApplyRow={handleVdpApplyRow}
              patternTemplate={vdpImportPatternTemplate}
              setPatternTemplate={setVdpImportPatternTemplate}
            />
          )}

          {/* BACKEND sekcia */}
          {leftPanelSection === 'BACKEND' && (
            <div className="space-y-3 text-[11px]">
              {['EAN13', 'EAN8', 'UPCA', 'ITF14', 'GS1128', 'GS1DM', 'GS1DATABAR'].includes(
                codeType,
              ) && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleValidateGs1Linear}
                    disabled={loading}
                    className="w-full rounded-md border border-sky-600 bg-sky-600/90 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-50 shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800"
                  >
                    {loading ? 'Overujem kód…' : 'Overiť a doplniť GS1 kód'}
                  </button>

                  {serverMessage && (
                    <p className="rounded-md border border-emerald-700 bg-emerald-900/40 p-2 text-emerald-200">
                      {serverMessage}
                    </p>
                  )}

                  {serverError && (
                    <p className="rounded-md border border-red-700 bg-red-900/40 p-2 text-red-200">
                      {serverError}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
                <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Info o kóde
                </h4>
                <div className="space-y-1 text-[10px] text-slate-300">
                  <div className="flex justify-between">
                    <span>Typ:</span>
                    <span className="font-mono text-slate-100">{codeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dĺžka dát:</span>
                    <span className="font-mono text-slate-100">{codeValue.length} znakov</span>
                  </div>
                  {labelGtin14 && (
                    <div className="flex justify-between">
                      <span>GTIN-14 (s CD):</span>
                      <span className="font-mono text-emerald-400">
                        {computeGs1CheckDigit(labelGtin14) || '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export default LeftPanel




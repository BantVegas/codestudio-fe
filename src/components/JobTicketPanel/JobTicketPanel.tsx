// src/components/JobTicketPanel/JobTicketPanel.tsx
import React, { useState } from 'react'
import type {
  LabelConfig,
  Layer,
  StepRepeatConfig,
  MachinePreset,
  VdpPrintRun,
  ExportSettings,
} from '../../types/barcodeTypes'

interface JobTicketPanelProps {
  jobId: string
  labelConfig: LabelConfig
  layers: Layer[]
  stepRepeatConfig?: StepRepeatConfig
  machinePreset?: MachinePreset
  vdpPrintRun?: VdpPrintRun
  exportSettings: ExportSettings
  codeType: string
  codeValue: string
  magnificationPercent: number
  xDimMm: number
  barWidthReductionMm: number
  onGenerateReport: () => void
  onPrint: () => void
}

export const JobTicketPanel: React.FC<JobTicketPanelProps> = ({
  jobId,
  labelConfig,
  layers,
  stepRepeatConfig,
  machinePreset,
  vdpPrintRun,
  exportSettings,
  codeType,
  codeValue,
  magnificationPercent,
  xDimMm,
  barWidthReductionMm,
  onGenerateReport,
  onPrint,
}) => {
  const [customerName, setCustomerName] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [material, setMaterial] = useState('PP White')
  const [adhesive, setAdhesive] = useState('Permanent')
  const [quantity, setQuantity] = useState(10000)
  const [notes, setNotes] = useState('')

  const isWebMode = stepRepeatConfig?.mode === 'WEB'
  const webConfig = stepRepeatConfig as { lanes?: number; rows?: number; webWidthMm?: number; repeatLengthMm?: number } | undefined

  // Výpočty
  const labelsPerRepeat = isWebMode && webConfig ? (webConfig.lanes || 1) * (webConfig.rows || 1) : 1
  const repeatsNeeded = Math.ceil(quantity / labelsPerRepeat)
  const totalLengthMm = isWebMode && webConfig ? repeatsNeeded * (webConfig.repeatLengthMm || 330) : 0
  const totalLengthM = totalLengthMm / 1000

  const visibleLayers = layers.filter(l => l.visible && l.printable)
  const hasWhiteLayer = layers.some(l => l.type === 'WHITE_UNDERPRINT' && l.visible)

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/80">
      {/* Header */}
      <div className="border-b border-slate-700 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Job Ticket / Report
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-4">
          {/* Job Info */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Zákazka</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[9px] text-slate-500">Job ID</label>
                <input
                  type="text"
                  value={jobId}
                  readOnly
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-300"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[9px] text-slate-500">Číslo objednávky</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="OBJ-2024-001"
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-0.5 block text-[9px] text-slate-500">Zákazník</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Názov zákazníka"
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Label Info */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Etiketa</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <span className="text-slate-500">Rozmery:</span>
              <span className="text-slate-200">{labelConfig.widthMm} × {labelConfig.heightMm} mm</span>
              
              <span className="text-slate-500">Bleed:</span>
              <span className="text-slate-200">{labelConfig.bleedMm} mm</span>
              
              <span className="text-slate-500">Safe margin:</span>
              <span className="text-slate-200">{labelConfig.safeMarginMm} mm</span>
              
              <span className="text-slate-500">Orientácia:</span>
              <span className="text-slate-200">{labelConfig.orientation}</span>
            </div>
          </div>

          {/* Barcode Info */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Čiarový kód</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <span className="text-slate-500">Typ kódu:</span>
              <span className="text-slate-200">{codeType}</span>
              
              <span className="text-slate-500">Hodnota:</span>
              <span className="font-mono text-slate-200">{codeValue || '(prázdne)'}</span>
              
              <span className="text-slate-500">Magnifikácia:</span>
              <span className="text-slate-200">{magnificationPercent}%</span>
              
              <span className="text-slate-500">X-dimension:</span>
              <span className="text-slate-200">{xDimMm} mm</span>
              
              <span className="text-slate-500">BWR:</span>
              <span className="text-slate-200">{barWidthReductionMm} mm</span>
            </div>
          </div>

          {/* Material */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Materiál</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[9px] text-slate-500">Materiál</label>
                <select
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                >
                  <option value="PP White">PP Biely</option>
                  <option value="PP Clear">PP Transparentný</option>
                  <option value="PE White">PE Biely</option>
                  <option value="Paper Gloss">Papier lesklý</option>
                  <option value="Paper Matt">Papier matný</option>
                  <option value="Thermal">Termopapier</option>
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-[9px] text-slate-500">Lepidlo</label>
                <select
                  value={adhesive}
                  onChange={e => setAdhesive(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                >
                  <option value="Permanent">Permanentné</option>
                  <option value="Removable">Snímateľné</option>
                  <option value="Freezer">Mrazuvzdorné</option>
                  <option value="High-tack">Vysoká priľnavosť</option>
                </select>
              </div>
            </div>
          </div>

          {/* Production */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Výroba</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[9px] text-slate-500">Počet kusov</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[9px] text-slate-500">Stroj</label>
                <input
                  type="text"
                  value={machinePreset?.name || 'Neurčený'}
                  readOnly
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-300"
                />
              </div>
            </div>

            {isWebMode && webConfig && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <span className="text-slate-500">Lanes:</span>
                <span className="text-slate-200">{webConfig.lanes}</span>
                
                <span className="text-slate-500">Etikiet/repeat:</span>
                <span className="text-slate-200">{labelsPerRepeat}</span>
                
                <span className="text-slate-500">Počet repeatov:</span>
                <span className="text-slate-200">{repeatsNeeded.toLocaleString()}</span>
                
                <span className="text-slate-500">Celková dĺžka:</span>
                <span className="font-medium text-emerald-400">{totalLengthM.toFixed(1)} m</span>
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Farby</h3>
            <div className="space-y-1">
              {visibleLayers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300">{layer.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] ${
                    layer.colorMode === 'SPOT' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {layer.colorMode === 'SPOT' ? layer.spotColorName || 'SPOT' : 'CMYK'}
                  </span>
                </div>
              ))}
              {hasWhiteLayer && (
                <div className="mt-1 text-[9px] text-amber-400">
                  ⚠️ Obsahuje biely podtlač
                </div>
              )}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Export: {exportSettings.colorMode} | {exportSettings.format}
            </div>
          </div>

          {/* VDP Info */}
          {vdpPrintRun && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <h3 className="mb-2 text-[10px] font-semibold uppercase text-amber-300">VDP Dáta</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <span className="text-amber-200/70">Zdroj:</span>
                <span className="text-amber-100">{vdpPrintRun.source}</span>
                
                {vdpPrintRun.source === 'SERIAL' && (
                  <>
                    <span className="text-amber-200/70">Rozsah:</span>
                    <span className="text-amber-100">{vdpPrintRun.serialStart} – {vdpPrintRun.serialEnd}</span>
                  </>
                )}
                
                {vdpPrintRun.useLanes && (
                  <>
                    <span className="text-amber-200/70">Lane numbering:</span>
                    <span className="text-amber-100">Áno ({vdpPrintRun.laneConfigs.length} lanes)</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-[10px] text-slate-400">Poznámky</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Špeciálne požiadavky, poznámky pre tlač..."
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex gap-2">
          <button
            onClick={onGenerateReport}
            className="flex-1 rounded bg-slate-700 py-2 text-[10px] font-medium text-slate-200 hover:bg-slate-600"
          >
            📄 Generovať PDF report
          </button>
          <button
            onClick={onPrint}
            className="flex-1 rounded bg-sky-600 py-2 text-[10px] font-medium text-white hover:bg-sky-500"
          >
            🖨️ Tlačiť
          </button>
        </div>
      </div>
    </div>
  )
}

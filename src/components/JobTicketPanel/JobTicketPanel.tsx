/* eslint-disable @typescript-eslint/no-unused-vars */
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

  // Funkcia pre generovanie PDF reportu
  const handleGenerateReport = () => {
    const reportContent = `
      <html>
        <head>
          <title>Job Ticket - ${jobId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            .section { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
            .section h2 { color: #475569; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .label { color: #64748b; font-size: 12px; }
            .value { color: #1e293b; font-size: 14px; font-weight: 500; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>📋 Job Ticket</h1>
          <div class="section">
            <h2>Zákazka</h2>
            <div class="grid">
              <div><span class="label">Job ID:</span> <span class="value">${jobId}</span></div>
              <div><span class="label">Objednávka:</span> <span class="value">${orderNumber || '-'}</span></div>
              <div><span class="label">Zákazník:</span> <span class="value">${customerName || '-'}</span></div>
              <div><span class="label">Množstvo:</span> <span class="value">${quantity.toLocaleString()} ks</span></div>
            </div>
          </div>
          <div class="section">
            <h2>Etiketa</h2>
            <div class="grid">
              <div><span class="label">Rozmery:</span> <span class="value">${labelConfig.widthMm} × ${labelConfig.heightMm} mm</span></div>
              <div><span class="label">Bleed:</span> <span class="value">${labelConfig.bleedMm} mm</span></div>
            </div>
          </div>
          <div class="section">
            <h2>Čiarový kód</h2>
            <div class="grid">
              <div><span class="label">Typ:</span> <span class="value">${codeType}</span></div>
              <div><span class="label">Hodnota:</span> <span class="value">${codeValue || '-'}</span></div>
              <div><span class="label">Magnifikácia:</span> <span class="value">${magnificationPercent}%</span></div>
              <div><span class="label">X-dim:</span> <span class="value">${xDimMm} mm</span></div>
            </div>
          </div>
          <div class="section">
            <h2>Materiál</h2>
            <div class="grid">
              <div><span class="label">Materiál:</span> <span class="value">${material}</span></div>
              <div><span class="label">Lepidlo:</span> <span class="value">${adhesive}</span></div>
            </div>
          </div>
          ${notes ? `<div class="section"><h2>Poznámky</h2><p>${notes}</p></div>` : ''}
          <div class="footer">Vygenerované: ${new Date().toLocaleString('sk-SK')}</div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(reportContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Funkcia pre tlač
  const handlePrint = () => {
    handleGenerateReport()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          {/* Job Info */}
          <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <span>📋</span> Zákazka
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Job ID</label>
                <input
                  type="text"
                  value={jobId}
                  readOnly
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Číslo objednávky</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="OBJ-2024-001"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-400">Zákazník</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Názov zákazníka"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Label Info */}
          <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <span>🏷️</span> Etiketa
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Rozmery:</span>
                <span className="font-medium text-slate-200">{labelConfig.widthMm} × {labelConfig.heightMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bleed:</span>
                <span className="font-medium text-slate-200">{labelConfig.bleedMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Safe margin:</span>
                <span className="font-medium text-slate-200">{labelConfig.safeMarginMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Orientácia:</span>
                <span className="font-medium text-slate-200">{labelConfig.orientation}</span>
              </div>
            </div>
          </div>

          {/* Barcode Info */}
          <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <span>📊</span> Čiarový kód
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Typ kódu:</span>
                <span className="font-medium text-slate-200">{codeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hodnota:</span>
                <span className="font-mono font-medium text-slate-200">{codeValue || '(prázdne)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Magnifikácia:</span>
                <span className="font-medium text-slate-200">{magnificationPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">X-dimension:</span>
                <span className="font-medium text-slate-200">{xDimMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BWR:</span>
                <span className="font-medium text-slate-200">{barWidthReductionMm} mm</span>
              </div>
            </div>
          </div>

          {/* Material */}
          <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <span>📦</span> Materiál
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Materiál</label>
                <select
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
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
                <label className="mb-1 block text-sm font-medium text-slate-400">Lepidlo</label>
                <select
                  value={adhesive}
                  onChange={e => setAdhesive(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
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
          <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <span>🏭</span> Výroba
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Počet kusov</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Stroj</label>
                <input
                  type="text"
                  value={machinePreset?.name || 'Neurčený'}
                  readOnly
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                />
              </div>
            </div>

            {isWebMode && webConfig && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Lanes:</span>
                  <span className="font-medium text-slate-200">{webConfig.lanes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Etikiet/repeat:</span>
                  <span className="font-medium text-slate-200">{labelsPerRepeat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Počet repeatov:</span>
                  <span className="font-medium text-slate-200">{repeatsNeeded.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Celková dĺžka:</span>
                  <span className="font-bold text-emerald-400">{totalLengthM.toFixed(1)} m</span>
                </div>
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <span>🎨</span> Farby
            </h3>
            <div className="space-y-2">
              {visibleLayers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{layer.name}</span>
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${
                    layer.colorMode === 'SPOT' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {layer.colorMode === 'SPOT' ? layer.spotColorName || 'SPOT' : 'CMYK'}
                  </span>
                </div>
              ))}
              {hasWhiteLayer && (
                <div className="mt-2 text-sm text-amber-400">
                  ⚠️ Obsahuje biely podtlač
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-slate-400">
              Export: {exportSettings.colorMode} | {exportSettings.format}
            </div>
          </div>

          {/* VDP Info */}
          {vdpPrintRun && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-amber-300">
                <span>🔢</span> VDP Dáta
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-200/70">Zdroj:</span>
                  <span className="font-medium text-amber-100">{vdpPrintRun.source}</span>
                </div>
                {vdpPrintRun.source === 'SERIAL' && (
                  <div className="flex justify-between">
                    <span className="text-amber-200/70">Rozsah:</span>
                    <span className="font-medium text-amber-100">{vdpPrintRun.serialStart} – {vdpPrintRun.serialEnd}</span>
                  </div>
                )}
                {vdpPrintRun.useLanes && (
                  <div className="flex justify-between">
                    <span className="text-amber-200/70">Lane numbering:</span>
                    <span className="font-medium text-amber-100">Áno ({vdpPrintRun.laneConfigs.length} lanes)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Poznámky</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Špeciálne požiadavky, poznámky pre tlač..."
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-600 p-4">
        <div className="flex gap-3">
          <button
            onClick={handleGenerateReport}
            className="flex-1 rounded-xl bg-slate-700 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-600"
          >
            📄 Generovať PDF report
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-500 hover:to-sky-400"
          >
            🖨️ Tlačiť
          </button>
        </div>
      </div>
    </div>
  )
}

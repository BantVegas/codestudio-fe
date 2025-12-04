// src/components/VdpPrintRunPanel/VdpPrintRunPanel.tsx
import React, { useState, useMemo, useCallback } from 'react'
import type {
  VdpPrintRun,
  VdpImportState,
  VdpImportRow,
  VdpLaneConfig,
  VdpValidationResult,
  VdpExportOptions,
  CodeType,
} from '../../types/barcodeTypes'

interface VdpPrintRunPanelProps {
  printRun: VdpPrintRun
  onUpdatePrintRun: (updates: Partial<VdpPrintRun>) => void
  codeType: CodeType
  onImportCsv: (file: File) => Promise<VdpImportState>
  onValidateAll: () => VdpValidationResult[]
  onExportVdp: (options: VdpExportOptions) => void
  onPreviewItem: (index: number) => void
}

export const VdpPrintRunPanel: React.FC<VdpPrintRunPanelProps> = ({
  printRun,
  onUpdatePrintRun,
  codeType,
  onImportCsv,
  onValidateAll,
  onExportVdp,
  onPreviewItem,
}) => {
  const [activeTab, setActiveTab] = useState<'serial' | 'csv' | 'lanes' | 'export'>('serial')
  const [validationResults, setValidationResults] = useState<VdpValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [exportOptions, setExportOptions] = useState<VdpExportOptions>({
    outputMode: 'MULTI_PAGE_PDF',
    labelsPerPage: 1,
    fileNamePattern: 'label_{INDEX}',
    generateJobReport: true,
  })

  // Serial calculations
  const serialStats = useMemo(() => {
    const count = printRun.serialEnd - printRun.serialStart + 1
    const digits = Math.max(
      String(printRun.serialEnd).length,
      printRun.serialPadding
    )
    return { count, digits }
  }, [printRun.serialStart, printRun.serialEnd, printRun.serialPadding])

  // Generate preview samples
  const previewSamples = useMemo(() => {
    const samples: { index: number; value: string }[] = []
    
    if (printRun.source === 'SERIAL') {
      const { serialStart, serialEnd, serialPadding, serialPrefix } = printRun
      const first = serialPrefix + String(serialStart).padStart(serialPadding, '0')
      const second = serialPrefix + String(serialStart + 1).padStart(serialPadding, '0')
      const tenth = serialPrefix + String(Math.min(serialStart + 9, serialEnd)).padStart(serialPadding, '0')
      const last = serialPrefix + String(serialEnd).padStart(serialPadding, '0')
      
      samples.push({ index: 0, value: first })
      if (serialEnd > serialStart) samples.push({ index: 1, value: second })
      if (serialEnd >= serialStart + 9) samples.push({ index: 9, value: tenth })
      if (serialEnd > serialStart + 9) samples.push({ index: serialEnd - serialStart, value: last })
    } else if (printRun.csvData) {
      const { rows } = printRun.csvData
      if (rows.length > 0) samples.push({ index: 0, value: rows[0].generatedCode })
      if (rows.length > 1) samples.push({ index: 1, value: rows[1].generatedCode })
      if (rows.length > 9) samples.push({ index: 9, value: rows[9].generatedCode })
      if (rows.length > 10) samples.push({ index: rows.length - 1, value: rows[rows.length - 1].generatedCode })
    }
    
    return samples
  }, [printRun])

  // Handle CSV import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const csvData = await onImportCsv(file)
      onUpdatePrintRun({ source: 'CSV', csvData })
    } catch (error) {
      console.error('CSV import failed:', error)
    }
  }

  // Handle validation
  const handleValidate = useCallback(async () => {
    setIsValidating(true)
    try {
      const results = onValidateAll()
      setValidationResults(results)
    } finally {
      setIsValidating(false)
    }
  }, [onValidateAll])

  // Lane configuration
  const handleAddLane = () => {
    const newLane: VdpLaneConfig = {
      laneId: printRun.laneConfigs.length + 1,
      startIndex: 0,
      endIndex: serialStats.count - 1,
    }
    onUpdatePrintRun({
      laneConfigs: [...printRun.laneConfigs, newLane],
    })
  }

  const handleUpdateLane = (index: number, updates: Partial<VdpLaneConfig>) => {
    const newConfigs = [...printRun.laneConfigs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    onUpdatePrintRun({ laneConfigs: newConfigs })
  }

  const handleRemoveLane = (index: number) => {
    const newConfigs = printRun.laneConfigs.filter((_, i) => i !== index)
    onUpdatePrintRun({ laneConfigs: newConfigs })
  }

  // Auto-distribute lanes
  const handleAutoDistribute = () => {
    const totalCount = printRun.source === 'SERIAL' 
      ? serialStats.count 
      : (printRun.csvData?.rows.length || 0)
    
    const laneCount = printRun.laneConfigs.length || 1
    const perLane = Math.ceil(totalCount / laneCount)
    
    const newConfigs: VdpLaneConfig[] = []
    for (let i = 0; i < laneCount; i++) {
      newConfigs.push({
        laneId: i + 1,
        startIndex: i * perLane,
        endIndex: Math.min((i + 1) * perLane - 1, totalCount - 1),
      })
    }
    
    onUpdatePrintRun({ laneConfigs: newConfigs })
  }

  // Export
  const handleExport = () => {
    onExportVdp(exportOptions)
  }

  // Validation stats
  const validationStats = useMemo(() => {
    if (validationResults.length === 0) return null
    
    const valid = validationResults.filter(r => r.isValid).length
    const warnings = validationResults.filter(r => r.warnings.length > 0).length
    const errors = validationResults.filter(r => r.errors.length > 0).length
    
    return { valid, warnings, errors, total: validationResults.length }
  }, [validationResults])

  // Pomocné pole CSV riadkov pre prehľad
  const csvRows: VdpImportRow[] = printRun.csvData?.rows ?? []

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/80">
      {/* Header */}
      <div className="border-b border-slate-700 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          VDP Print Run – {codeType}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: 'serial', label: 'Séria' },
          { id: 'csv', label: 'CSV Import' },
          { id: 'lanes', label: 'Lanes' },
          { id: 'export', label: 'Export' },
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
        {/* SERIAL TAB */}
        {activeTab === 'serial' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => onUpdatePrintRun({ source: 'SERIAL' })}
                className={`flex-1 rounded py-1.5 text-[10px] font-medium ${
                  printRun.source === 'SERIAL'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                Sériové čísla
              </button>
              <button
                onClick={() => onUpdatePrintRun({ source: 'CSV' })}
                className={`flex-1 rounded py-1.5 text-[10px] font-medium ${
                  printRun.source === 'CSV'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                CSV dáta
              </button>
            </div>

            {printRun.source === 'SERIAL' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[9px] text-slate-400">Začiatok</label>
                    <input
                      type="number"
                      min={1}
                      value={printRun.serialStart}
                      onChange={(e) => onUpdatePrintRun({ serialStart: parseInt(e.target.value) || 1 })}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] text-slate-400">Koniec</label>
                    <input
                      type="number"
                      min={printRun.serialStart}
                      value={printRun.serialEnd}
                      onChange={(e) => onUpdatePrintRun({ serialEnd: parseInt(e.target.value) || printRun.serialStart })}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[9px] text-slate-400">Padding (číslice)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={printRun.serialPadding}
                      onChange={(e) => onUpdatePrintRun({ serialPadding: parseInt(e.target.value) || 6 })}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] text-slate-400">Prefix</label>
                    <input
                      type="text"
                      value={printRun.serialPrefix}
                      onChange={(e) => onUpdatePrintRun({ serialPrefix: e.target.value })}
                      className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      placeholder="napr. SKU-"
                    />
                  </div>
                </div>

                <div className="rounded border border-slate-700 bg-slate-800 p-2">
                  <div className="text-[10px] text-slate-400 mb-2">Štatistiky série</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <span className="text-slate-400">Celkový počet:</span>
                    <span className="font-medium text-emerald-400">{serialStats.count.toLocaleString()}</span>
                    <span className="text-slate-400">Dĺžka čísla:</span>
                    <span className="text-slate-200">{serialStats.digits} číslic</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CSV TAB */}
        {activeTab === 'csv' && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] text-slate-400">Import CSV súboru</label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full text-[10px] text-slate-300 file:mr-2 file:rounded file:border file:border-slate-600 file:bg-slate-800 file:px-2 file:py-1 file:text-[10px] file:text-slate-200"
              />
            </div>

            {printRun.csvData && (
              <>
                <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-2">
                  <div className="text-[10px] font-medium text-emerald-300">
                    ✓ Načítaný súbor: {printRun.csvData.fileName}
                  </div>
                  <div className="mt-1 text-[9px] text-emerald-200/70">
                    {printRun.csvData.totalRows} riadkov · {printRun.csvData.columns.length} stĺpcov
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[9px] text-slate-400">Stĺpce v CSV</label>
                  <div className="flex flex-wrap gap-1">
                    {printRun.csvData.columns.map(col => (
                      <span
                        key={col.columnIndex}
                        className="rounded bg-slate-700 px-2 py-0.5 text-[9px] text-slate-300"
                      >
                        {col.columnName}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[9px] text-slate-400">Pattern template</label>
                  <input
                    type="text"
                    value={printRun.csvData.patternTemplate}
                    onChange={(e) => onUpdatePrintRun({
                      csvData: { ...printRun.csvData!, patternTemplate: e.target.value }
                    })}
                    className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 font-mono"
                    placeholder="(01){GTIN}(21){SERIAL}"
                  />
                  <p className="mt-1 text-[9px] text-slate-500">
                    Použite {'{COLUMN_NAME}'} pre vloženie dát zo stĺpca
                  </p>
                </div>

                {/* Preview first rows */}
                <div>
                  <label className="mb-1 block text-[9px] text-slate-400">Náhľad prvých riadkov</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {csvRows.slice(0, 5).map((row, idx) => (
                      <div
                        key={idx}
                        onClick={() => onPreviewItem(idx)}
                        className={`cursor-pointer rounded border p-1.5 text-[9px] ${
                          row.isValid
                            ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                            : 'border-red-500/50 bg-red-500/10'
                        }`}
                      >
                        <div className="font-mono text-slate-200">{row.generatedCode}</div>
                        {row.errors && row.errors.length > 0 && (
                          <div className="mt-0.5 text-red-400">{row.errors.join(', ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* LANES TAB */}
        {activeTab === 'lanes' && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={printRun.useLanes}
                onChange={(e) => onUpdatePrintRun({ useLanes: e.target.checked })}
                className="h-3 w-3"
              />
              Použiť lane rozdelenie
            </label>

            {printRun.useLanes && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLane}
                    className="flex-1 rounded bg-slate-700 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
                  >
                    + Pridať lane
                  </button>
                  <button
                    onClick={handleAutoDistribute}
                    className="flex-1 rounded bg-sky-600 py-1 text-[10px] text-white hover:bg-sky-500"
                  >
                    Auto-rozdeliť
                  </button>
                </div>

                <div className="space-y-2">
                  {printRun.laneConfigs.map((lane, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-slate-700 bg-slate-800/50 p-2"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-slate-300">
                          Lane {lane.laneId}
                        </span>
                        <button
                          onClick={() => handleRemoveLane(idx)}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-slate-500">Od indexu</label>
                          <input
                            type="number"
                            min={0}
                            value={lane.startIndex}
                            onChange={(e) => handleUpdateLane(idx, { startIndex: parseInt(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] text-slate-500">Do indexu</label>
                          <input
                            type="number"
                            min={lane.startIndex}
                            value={lane.endIndex}
                            onChange={(e) => handleUpdateLane(idx, { endIndex: parseInt(e.target.value) || lane.startIndex })}
                            className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200"
                          />
                        </div>
                      </div>
                      <div className="mt-1 text-[9px] text-slate-500">
                        Počet: {lane.endIndex - lane.startIndex + 1} ks
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Validation */}
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-slate-300">Validácia</span>
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="rounded bg-amber-600 px-2 py-0.5 text-[9px] text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isValidating ? 'Validujem...' : 'Validovať všetko'}
                </button>
              </div>

              {validationStats && (
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="text-center">
                    <div className="font-medium text-emerald-400">{validationStats.valid}</div>
                    <div className="text-slate-500">OK</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-amber-400">{validationStats.warnings}</div>
                    <div className="text-slate-500">Upozornenia</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-400">{validationStats.errors}</div>
                    <div className="text-slate-500">Chyby</div>
                  </div>
                </div>
              )}

              <label className="mt-2 flex items-center gap-2 text-[9px] text-slate-400">
                <input
                  type="checkbox"
                  checked={printRun.validateBeforeExport}
                  onChange={(e) => onUpdatePrintRun({ validateBeforeExport: e.target.checked })}
                  className="h-3 w-3"
                />
                Validovať pred exportom
              </label>
              <label className="flex items-center gap-2 text-[9px] text-slate-400">
                <input
                  type="checkbox"
                  checked={printRun.stopOnError}
                  onChange={(e) => onUpdatePrintRun({ stopOnError: e.target.checked })}
                  className="h-3 w-3"
                />
                Zastaviť pri chybe
              </label>
            </div>

            {/* Export options */}
            <div>
              <label className="mb-1 block text-[9px] text-slate-400">Formát výstupu</label>
              <select
                value={exportOptions.outputMode}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  outputMode: e.target.value as any
                })}
                className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
              >
                <option value="MULTI_PAGE_PDF">Multi-page PDF (1 etiketa/strana)</option>
                <option value="STEP_REPEAT_PDF">Step & Repeat PDF</option>
                <option value="INDIVIDUAL_FILES">Individuálne súbory</option>
              </select>
            </div>

            {exportOptions.outputMode === 'MULTI_PAGE_PDF' && (
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">Etikiet na stranu</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={exportOptions.labelsPerPage}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    labelsPerPage: parseInt(e.target.value) || 1
                  })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200"
                />
              </div>
            )}

            {exportOptions.outputMode === 'INDIVIDUAL_FILES' && (
              <div>
                <label className="mb-1 block text-[9px] text-slate-400">Pattern názvu súboru</label>
                <input
                  type="text"
                  value={exportOptions.fileNamePattern}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    fileNamePattern: e.target.value
                  })}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 font-mono"
                  placeholder="label_{INDEX}_{VALUE}"
                />
                <p className="mt-1 text-[9px] text-slate-500">
                  {'{INDEX}'} = poradie, {'{VALUE}'} = hodnota kódu
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={exportOptions.generateJobReport}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  generateJobReport: e.target.checked
                })}
                className="h-3 w-3"
              />
              Generovať job report
            </label>

            {/* Preview samples */}
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
              <div className="mb-2 text-[10px] font-medium text-slate-300">Náhľad vzoriek</div>
              <div className="space-y-1">
                {previewSamples.map(sample => (
                  <div
                    key={sample.index}
                    onClick={() => onPreviewItem(sample.index)}
                    className="flex cursor-pointer items-center justify-between rounded bg-slate-800 px-2 py-1 hover:bg-slate-700"
                  >
                    <span className="text-[9px] text-slate-500">#{sample.index + 1}</span>
                    <span className="font-mono text-[10px] text-slate-200">{sample.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export button */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={handleExport}
          className="w-full rounded bg-emerald-600 py-2 text-[11px] font-medium text-white hover:bg-emerald-500"
        >
          Exportovať VDP ({
            printRun.source === 'SERIAL' 
              ? serialStats.count.toLocaleString()
              : printRun.csvData?.totalRows.toLocaleString() || 0
          } ks)
        </button>
      </div>
    </div>
  )
}

export default VdpPrintRunPanel
// src/components/VdpImportPanel/VdpImportPanel.tsx
import React, { useCallback, useState } from 'react'
import type {
  VdpImportColumn,
  VdpImportRow,
  VdpFieldMapping,
  VdpImportState,
} from '../../types/barcodeTypes'

export type VdpImportPanelProps = {
  vdpImportState: VdpImportState
  setVdpImportState: React.Dispatch<React.SetStateAction<VdpImportState>>
  onApplyRow: (row: VdpImportRow) => void
  patternTemplate: string
  setPatternTemplate: (v: string) => void
}

const FIELD_MAPPING_OPTIONS: { value: VdpFieldMapping; label: string }[] = [
  { value: null, label: '— Ignorovať —' },
  { value: 'SERIAL', label: 'Sériové číslo [SERIAL]' },
  { value: 'LOT', label: 'LOT / Šarža [LOT]' },
  { value: 'GTIN', label: 'GTIN [GTIN]' },
  { value: 'BEST_BEFORE', label: 'Dátum spotreby [BEST_BEFORE]' },
  { value: 'PROD_DATE', label: 'Dátum výroby [PROD_DATE]' },
  { value: 'USE_BY', label: 'Použiť do [USE_BY]' },
  { value: 'VARIANT', label: 'Varianta [VARIANT]' },
  { value: 'QUANTITY', label: 'Množstvo [QUANTITY]' },
  { value: 'CUSTOM', label: 'Vlastný text [CUSTOM]' },
]

const parseCSV = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  })
}

export const VdpImportPanel: React.FC<VdpImportPanelProps> = ({
  vdpImportState,
  setVdpImportState,
  onApplyRow,
  patternTemplate,
  setPatternTemplate,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const processFile = useCallback(
    async (file: File) => {
      setParseError(null)

      const fileName = file.name.toLowerCase()

      try {
        if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
          const text = await file.text()
          const rows = parseCSV(text)

          if (rows.length < 2) {
            setParseError('Súbor musí obsahovať hlavičku a aspoň jeden riadok dát.')
            return
          }

          const headerRow = rows[0]
          const dataRows = rows.slice(1)

          const columns: VdpImportColumn[] = headerRow.map((name, index) => ({
            columnIndex: index,
            columnName: name || `Stĺpec ${index + 1}`,
            mappedTo: null,
          }))

          // Auto-map
          columns.forEach(col => {
            const nameLower = col.columnName.toLowerCase()
            if (
              nameLower.includes('serial') ||
              nameLower.includes('sn') ||
              nameLower.includes('číslo')
            ) {
              col.mappedTo = 'SERIAL'
            } else if (
              nameLower.includes('lot') ||
              nameLower.includes('šarža') ||
              nameLower.includes('batch')
            ) {
              col.mappedTo = 'LOT'
            } else if (
              nameLower.includes('gtin') ||
              nameLower.includes('ean') ||
              nameLower.includes('upc')
            ) {
              col.mappedTo = 'GTIN'
            } else if (
              nameLower.includes('expir') ||
              nameLower.includes('best') ||
              nameLower.includes('spotreba')
            ) {
              col.mappedTo = 'BEST_BEFORE'
            } else if (nameLower.includes('prod') || nameLower.includes('výrob')) {
              col.mappedTo = 'PROD_DATE'
            }
          })

          const importRows: VdpImportRow[] = dataRows.map((row, idx) => {
            const values: Record<string, string> = {}
            columns.forEach((col, colIdx) => {
              values[col.columnName] = row[colIdx] || ''
            })
            return {
              rowIndex: idx,
              values,
              generatedCode: '',
            }
          })

          setVdpImportState({
            fileName: file.name,
            columns,
            rows: importRows,
            currentRowIndex: 0,
            totalRows: importRows.length,
            patternTemplate,
          })
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const arrayBuffer = await file.arrayBuffer()

          const XLSX = await import('xlsx')
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })

          if (jsonData.length < 2) {
            setParseError('Excel súbor musí obsahovať hlavičku a aspoň jeden riadok dát.')
            return
          }

          const headerRow = jsonData[0] as string[]
          const dataRows = jsonData.slice(1) as string[][]

          const columns: VdpImportColumn[] = headerRow.map((name, index) => ({
            columnIndex: index,
            columnName: String(name) || `Stĺpec ${index + 1}`,
            mappedTo: null,
          }))

          // Auto-map
          columns.forEach(col => {
            const nameLower = col.columnName.toLowerCase()
            if (nameLower.includes('serial') || nameLower.includes('sn')) {
              col.mappedTo = 'SERIAL'
            } else if (nameLower.includes('lot') || nameLower.includes('šarža')) {
              col.mappedTo = 'LOT'
            } else if (nameLower.includes('gtin') || nameLower.includes('ean')) {
              col.mappedTo = 'GTIN'
            } else if (nameLower.includes('expir') || nameLower.includes('best')) {
              col.mappedTo = 'BEST_BEFORE'
            }
          })

          const importRows: VdpImportRow[] = dataRows.map((row, idx) => {
            const values: Record<string, string> = {}
            columns.forEach((col, colIdx) => {
              values[col.columnName] = String(row[colIdx] ?? '')
            })
            return {
              rowIndex: idx,
              values,
              generatedCode: '',
            }
          })

          setVdpImportState({
            fileName: file.name,
            columns,
            rows: importRows,
            currentRowIndex: 0,
            totalRows: importRows.length,
            patternTemplate,
          })
        } else {
          setParseError('Podporované formáty: CSV, TXT, XLSX, XLS')
        }
      } catch (err) {
        console.error('Parse error:', err)
        setParseError(
          `Chyba pri parsovaní súboru: ${
            err instanceof Error ? err.message : 'Neznáma chyba'
          }`,
        )
      }
    },
    [setVdpImportState, patternTemplate],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const updateColumnMapping = (columnIndex: number, mapping: VdpFieldMapping) => {
    setVdpImportState(prev => ({
      ...prev,
      columns: prev.columns.map(col =>
        col.columnIndex === columnIndex ? { ...col, mappedTo: mapping } : col,
      ),
    }))
  }

  const generateCodeForRow = (row: VdpImportRow): string => {
    let result = patternTemplate

    vdpImportState.columns.forEach(col => {
      if (col.mappedTo) {
        const token = `[${col.mappedTo}]`
        const value = row.values[col.columnName] || ''
        result = result.replace(new RegExp(token.replace(/[[\]]/g, '\\$&'), 'g'), value)
      }
    })

    return result
  }

  const handleApplyCurrentRow = () => {
    const currentRow = vdpImportState.rows[vdpImportState.currentRowIndex]
    if (currentRow) {
      const generatedCode = generateCodeForRow(currentRow)
      onApplyRow({ ...currentRow, generatedCode })
    }
  }

  const handlePrevRow = () => {
    setVdpImportState(prev => ({
      ...prev,
      currentRowIndex: Math.max(0, prev.currentRowIndex - 1),
    }))
  }

  const handleNextRow = () => {
    setVdpImportState(prev => ({
      ...prev,
      currentRowIndex: Math.min(prev.totalRows - 1, prev.currentRowIndex + 1),
    }))
  }

  const clearImport = () => {
    setVdpImportState({
      fileName: null,
      columns: [],
      rows: [],
      currentRowIndex: 0,
      totalRows: 0,
      patternTemplate: '[SERIAL]',
    })
    setParseError(null)
  }

  // --------- Batch export všetkých riadkov do CSV ---------
  const handleBatchExportCsv = () => {
    if (!vdpImportState.rows.length) return

    const header = [
      'Row',
      'GeneratedCode',
      ...vdpImportState.columns.map(col => col.columnName),
    ]

    const lines: string[] = []
    lines.push(header.join(';'))

    vdpImportState.rows.forEach(row => {
      const generated = generateCodeForRow(row)
      const cells = [
        String(row.rowIndex + 1),
        generated,
        ...vdpImportState.columns.map(col => row.values[col.columnName] ?? ''),
      ]
      const line = cells
        .map(value => `"${String(value).replace(/"/g, '""')}"`)
        .join(';')
      lines.push(line)
    })

    const content = lines.join('\r\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = vdpImportState.fileName
      ? vdpImportState.fileName.replace(/\.[^.]+$/, '') + '_codes.csv'
      : 'vdp_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentRow = vdpImportState.rows[vdpImportState.currentRowIndex]
  const previewCode = currentRow ? generateCodeForRow(currentRow) : ''

  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          VDP Import – CSV / Excel
        </h3>
        {vdpImportState.fileName && (
          <button
            type="button"
            onClick={clearImport}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-red-500 hover:text-red-300"
          >
            Vymazať import
          </button>
        )}
      </div>

      {/* File upload zone */}
      {!vdpImportState.fileName && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
          }`}
        >
          <svg
            className="mb-2 h-10 w-10 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-1 text-sm text-slate-300">
            Pretiahni CSV / Excel súbor sem
          </p>
          <p className="mb-3 text-[10px] text-slate-500">
            alebo klikni pre výber súboru
          </p>
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            id="vdp-file-input"
          />
          <label
            htmlFor="vdp-file-input"
            className="cursor-pointer rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-xs text-slate-200 hover:border-sky-500 hover:bg-slate-700"
          >
            Vybrať súbor
          </label>
        </div>
      )}

      {parseError && (
        <div className="rounded-md border border-red-700 bg-red-900/30 p-3 text-xs text-red-300">
          {parseError}
        </div>
      )}

      {/* Column mapping + preview + batch export */}
      {vdpImportState.fileName && vdpImportState.columns.length > 0 && (
        <>
          <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Súbor: {vdpImportState.fileName}
              </span>
              <span className="text-[10px] text-slate-500">
                {vdpImportState.totalRows} riadkov
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-400">Mapovanie stĺpcov na VDP polia:</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {vdpImportState.columns.map(col => (
                  <div
                    key={col.columnIndex}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-800/50 px-2 py-1"
                  >
                    <span className="flex-1 truncate text-[11px] text-slate-300">
                      {col.columnName}
                    </span>
                    <select
                      value={col.mappedTo || ''}
                      onChange={e =>
                        updateColumnMapping(
                          col.columnIndex,
                          (e.target.value || null) as VdpFieldMapping,
                        )
                      }
                      className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-sky-500"
                    >
                      {FIELD_MAPPING_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value || ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pattern template */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Vzor dát (šablóna)
            </label>
            <input
              type="text"
              value={patternTemplate}
              onChange={e => setPatternTemplate(e.target.value)}
              placeholder="(01)[SERIAL]"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Použite tokeny: [SERIAL], [LOT], [GTIN], [BEST_BEFORE], [PROD_DATE], [USE_BY],
              [VARIANT], [QUANTITY], [CUSTOM]
            </p>
          </div>

          {/* Row navigation + preview */}
          <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Aktuálny riadok
              </span>
              <span className="text-[10px] text-slate-300">
                {vdpImportState.currentRowIndex + 1} / {vdpImportState.totalRows}
              </span>
            </div>

            {currentRow && (
              <div className="mb-3 space-y-1 rounded-md bg-slate-800/50 p-2">
                {vdpImportState.columns
                  .filter(col => col.mappedTo)
                  .map(col => (
                    <div key={col.columnIndex} className="flex justify-between text-[10px]">
                      <span className="text-slate-400">{col.columnName}:</span>
                      <span className="text-slate-200">
                        {currentRow.values[col.columnName] || '—'}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="mb-3">
              <span className="mb-1 block text-[10px] text-slate-400">Vygenerovaný kód:</span>
              <div className="break-all rounded-md bg-slate-950 p-2 font-mono text-[11px] text-emerald-400">
                {previewCode || '(prázdny)'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevRow}
                disabled={vdpImportState.currentRowIndex === 0}
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
              >
                ← Predchádzajúci
              </button>
              <button
                type="button"
                onClick={handleApplyCurrentRow}
                className="rounded-md border border-emerald-600 bg-emerald-600/80 px-4 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
              >
                Použiť tento riadok
              </button>
              <button
                type="button"
                onClick={handleNextRow}
                disabled={vdpImportState.currentRowIndex >= vdpImportState.totalRows - 1}
                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-[11px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
              >
                Ďalší →
              </button>
            </div>
          </div>

          {/* Batch export */}
          <div className="rounded-md border border-amber-700/50 bg-amber-900/20 p-3 text-[10px] text-amber-200">
            <div className="mb-1 font-semibold">Batch export VDP</div>
            <p className="mb-2">
              Vygeneruje CSV so všetkými riadkami. Každý riadok = jedna etiketa (jeden kód).
            </p>
            <button
              type="button"
              onClick={handleBatchExportCsv}
              className="rounded-md border border-amber-500 bg-amber-600/80 px-3 py-1 text-[11px] font-medium text-slate-900 hover:bg-amber-500"
            >
              Exportovať všetky riadky (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default VdpImportPanel

// src/components/NormsWizard/NormsWizard.tsx
import React, { useState, useMemo } from 'react'
import type { CodeType } from '../../types/barcodeTypes'

// Lokálne typy pre normy a odporúčania – odvodené z používania komponentu
export type PrintProcess =
  | 'FLEXO'
  | 'DIGITAL'
  | 'OFFSET'
  | 'GRAVURE'
  | 'THERMAL_DIRECT'
  | 'THERMAL_TRANSFER'
  | 'INKJET'
  | 'LASER'

export type ApplicationType =
  | 'RETAIL_POS'
  | 'RETAIL_SHELF'
  | 'PHARMA_PRIMARY'
  | 'PHARMA_SECONDARY'
  | 'LOGISTICS_CARTON'
  | 'LOGISTICS_PALLET'
  | 'FOOD_FRESH'
  | 'FOOD_PACKAGED'
  | 'INDUSTRIAL'

export type SubstrateType =
  | 'COATED_PAPER'
  | 'UNCOATED_PAPER'
  | 'CORRUGATED'
  | 'FILM_GLOSSY'
  | 'FILM_MATTE'
  | 'THERMAL_PAPER'
  | 'SYNTHETIC'
  | 'METAL'
  | 'GLASS'

export type NormStandard =
  | 'ISO_15420'
  | 'ISO_15417'
  | 'ISO_15415'
  | 'GS1_GENERAL_SPEC'

export interface NormRecommendation {
  standard: NormStandard
  minXDimMm: number
  maxXDimMm: number
  recommendedXDimMm: number
  minQuietZoneMm: number
  bwrMm: number
  minHeight: number
  minGrade: 'A' | 'B' | 'C'
  notes: string[]
}

export type NormsWizardProps = {
  codeType: CodeType
  onApplyRecommendation: (rec: NormRecommendation) => void
  currentXDim: number
  currentBwr: number
  currentQuietZone: number
}

type ProcessOption = {
  value: PrintProcess
  label: string
  description: string
  typicalBwr: number
}

type ApplicationOption = {
  value: ApplicationType
  label: string
  description: string
  requiredGrade: 'A' | 'B' | 'C'
  minXDim: number
}

type SubstrateOption = {
  value: SubstrateType
  label: string
  bwrAdjustment: number
}

const PROCESS_OPTIONS: ProcessOption[] = [
  { value: 'FLEXO', label: 'Flexografia', description: 'Flexografická tlač na obalové materiály', typicalBwr: 0.025 },
  { value: 'DIGITAL', label: 'Digitálna tlač', description: 'Digitálna tlač (HP Indigo, Xeikon...)', typicalBwr: 0.01 },
  { value: 'OFFSET', label: 'Offset', description: 'Ofsetová tlač na papier/kartón', typicalBwr: 0.02 },
  { value: 'GRAVURE', label: 'Hĺbkotlač', description: 'Rotogravúra pre dlhé náklady', typicalBwr: 0.03 },
  { value: 'THERMAL_DIRECT', label: 'Priama termotlač', description: 'Priama termotlač (bez ribbonu)', typicalBwr: 0.005 },
  { value: 'THERMAL_TRANSFER', label: 'Termotransfer', description: 'Termotransferová tlač s ribbonom', typicalBwr: 0.008 },
  { value: 'INKJET', label: 'Inkjet', description: 'Priemyselná inkjet tlač', typicalBwr: 0.015 },
  { value: 'LASER', label: 'Laserové gravírovanie', description: 'Laserové značenie (DPM)', typicalBwr: 0.0 },
]

const APPLICATION_OPTIONS: ApplicationOption[] = [
  { value: 'RETAIL_POS', label: 'Retail – POS', description: 'Skenovanie na pokladni', requiredGrade: 'B', minXDim: 0.264 },
  { value: 'RETAIL_SHELF', label: 'Retail – police', description: 'Skenovanie z police', requiredGrade: 'C', minXDim: 0.33 },
  { value: 'PHARMA_PRIMARY', label: 'Pharma – primárny obal', description: 'Primárne balenie liekov', requiredGrade: 'A', minXDim: 0.25 },
  { value: 'PHARMA_SECONDARY', label: 'Pharma – sekundárny obal', description: 'Škatuľky, blistre', requiredGrade: 'B', minXDim: 0.264 },
  { value: 'LOGISTICS_CARTON', label: 'Logistika – kartóny', description: 'Kartónové obaly', requiredGrade: 'C', minXDim: 0.495 },
  { value: 'LOGISTICS_PALLET', label: 'Logistika – palety', description: 'Paletové etikety', requiredGrade: 'C', minXDim: 0.99 },
  { value: 'FOOD_FRESH', label: 'Potraviny – čerstvé', description: 'Čerstvé potraviny, mäso', requiredGrade: 'B', minXDim: 0.33 },
  { value: 'FOOD_PACKAGED', label: 'Potraviny – balené', description: 'Balené potraviny', requiredGrade: 'B', minXDim: 0.264 },
  { value: 'INDUSTRIAL', label: 'Priemysel', description: 'Priemyselné značenie', requiredGrade: 'C', minXDim: 0.38 },
]

const SUBSTRATE_OPTIONS: SubstrateOption[] = [
  { value: 'COATED_PAPER', label: 'Kriedový papier', bwrAdjustment: 0 },
  { value: 'UNCOATED_PAPER', label: 'Nekrídový papier', bwrAdjustment: 0.005 },
  { value: 'CORRUGATED', label: 'Vlnitá lepenka', bwrAdjustment: 0.015 },
  { value: 'FILM_GLOSSY', label: 'Lesklá fólia', bwrAdjustment: -0.003 },
  { value: 'FILM_MATTE', label: 'Matná fólia', bwrAdjustment: 0.002 },
  { value: 'THERMAL_PAPER', label: 'Termopapier', bwrAdjustment: 0.003 },
  { value: 'SYNTHETIC', label: 'Syntetický materiál', bwrAdjustment: 0.005 },
  { value: 'METAL', label: 'Kov', bwrAdjustment: 0.01 },
  { value: 'GLASS', label: 'Sklo', bwrAdjustment: 0.008 },
]

const getNormStandard = (codeType: CodeType): NormStandard => {
  switch (codeType) {
    case 'EAN13':
    case 'EAN8':
    case 'UPCA':
      return 'ISO_15420'
    case 'CODE128':
    case 'GS1128':
      return 'ISO_15417'
    case 'QR':
    case 'GS1DM':
      return 'ISO_15415'
    default:
      return 'GS1_GENERAL_SPEC'
  }
}

export const NormsWizard: React.FC<NormsWizardProps> = ({
  codeType,
  onApplyRecommendation,
  currentXDim,
  currentBwr,
  currentQuietZone,
}) => {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedProcess, setSelectedProcess] = useState<PrintProcess | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationType | null>(null)
  const [selectedSubstrate, setSelectedSubstrate] = useState<SubstrateType | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const recommendation = useMemo<NormRecommendation | null>(() => {
    if (!selectedProcess || !selectedApplication) return null

    const process = PROCESS_OPTIONS.find(p => p.value === selectedProcess)
    const application = APPLICATION_OPTIONS.find(a => a.value === selectedApplication)
    const substrate = SUBSTRATE_OPTIONS.find(s => s.value === selectedSubstrate)

    if (!process || !application) return null

    const baseBwr = process.typicalBwr + (substrate?.bwrAdjustment || 0)
    const standard = getNormStandard(codeType)

    // Calculate recommended X-dim based on application and code type
    let recommendedXDim = application.minXDim
    let minQuietZone = recommendedXDim * 10 // 10X minimum quiet zone

    // Adjust for specific code types
    if (codeType === 'ITF14') {
      recommendedXDim = Math.max(recommendedXDim, 0.495)
      minQuietZone = Math.max(minQuietZone, 6.35) // ITF-14 requires larger quiet zone
    } else if (codeType === 'QR' || codeType === 'GS1DM') {
      minQuietZone = recommendedXDim * 4 // 4X for 2D codes
    }

    const notes: string[] = []

    // Process-specific notes
    if (selectedProcess === 'FLEXO') {
      notes.push('Flexo: Odporúča sa testovací odtlačok pred produkciou')
      notes.push('Flexo: BWR závisí od typu aniloxu a substrátu')
    } else if (selectedProcess === 'THERMAL_DIRECT') {
      notes.push('Termotlač: Kontrolujte teplotu hlavy a rýchlosť')
    } else if (selectedProcess === 'DIGITAL') {
      notes.push('Digitál: BWR je zvyčajne menší než pri analógových procesoch')
    }

    // Application-specific notes
    if (selectedApplication === 'PHARMA_PRIMARY' || selectedApplication === 'PHARMA_SECONDARY') {
      notes.push('Pharma: Vyžaduje sa verifikácia podľa ISO/IEC 15415/15416')
      notes.push('Pharma: Serialized Data požaduje min. grade C (1.5)')
    }

    if (selectedApplication === 'LOGISTICS_PALLET') {
      notes.push('Palety: Minimálny X-dim 0.99 mm, výška min. 32 mm')
    }

    return {
      standard,
      minXDimMm: application.minXDim,
      maxXDimMm: application.minXDim * 2,
      recommendedXDimMm: recommendedXDim,
      minQuietZoneMm: minQuietZone,
      bwrMm: Math.round(baseBwr * 1000) / 1000,
      minHeight: codeType === 'QR' || codeType === 'GS1DM' ? recommendedXDim * 25 : recommendedXDim * 25,
      minGrade: application.requiredGrade,
      notes,
    }
  }, [selectedProcess, selectedApplication, selectedSubstrate, codeType])

  const handleApply = () => {
    if (recommendation) {
      onApplyRecommendation(recommendation)
      setIsOpen(false)
    }
  }

  const resetWizard = () => {
    setWizardStep(1)
    setSelectedProcess(null)
    setSelectedApplication(null)
    setSelectedSubstrate(null)
  }

  const getComplianceStatus = () => {
    if (!recommendation) return null

    const xDimOk = currentXDim >= recommendation.minXDimMm
    const bwrOk = Math.abs(currentBwr - recommendation.bwrMm) < 0.01
    const quietZoneOk = currentQuietZone >= recommendation.minQuietZoneMm

    return { xDimOk, bwrOk, quietZoneOk }
  }

  const compliance = getComplianceStatus()

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-xs transition-colors hover:border-sky-500"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="font-medium text-slate-200">Normy &amp; Grading Wizard</span>
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
          {/* Progress indicator */}
          <div className="mb-4 flex items-center gap-1">
            {[1, 2, 3, 4].map(step => (
              <React.Fragment key={step}>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    wizardStep >= step
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      wizardStep > step ? 'bg-sky-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Process */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                1. Tlačový proces
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {PROCESS_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedProcess(option.value)
                      setWizardStep(2)
                    }}
                    className={`rounded-md border p-2 text-left transition-colors ${
                      selectedProcess === option.value
                        ? 'border-sky-500 bg-sky-500/20 text-sky-100'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[11px] font-medium">{option.label}</div>
                    <div className="text-[9px] text-slate-400">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Application */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  2. Aplikácia
                </h4>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-[10px] text-slate-400 hover:text-sky-400"
                >
                  ← Späť
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {APPLICATION_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedApplication(option.value)
                      setWizardStep(3)
                    }}
                    className={`rounded-md border p-2 text-left transition-colors ${
                      selectedApplication === option.value
                        ? 'border-sky-500 bg-sky-500/20 text-sky-100'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[11px] font-medium">{option.label}</div>
                    <div className="text-[9px] text-slate-400">{option.description}</div>
                    <div className="mt-1 text-[9px] text-amber-400">
                      Min. grade: {option.requiredGrade} | Min. X: {option.minXDim} mm
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Substrate */}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  3. Substrát
                </h4>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="text-[10px] text-slate-400 hover:text-sky-400"
                >
                  ← Späť
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SUBSTRATE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedSubstrate(option.value)
                      setWizardStep(4)
                    }}
                    className={`rounded-md border p-2 text-left transition-colors ${
                      selectedSubstrate === option.value
                        ? 'border-sky-500 bg-sky-500/20 text-sky-100'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[11px] font-medium">{option.label}</div>
                    <div className="text-[9px] text-slate-400">
                      BWR: {option.bwrAdjustment >= 0 ? '+' : ''}{option.bwrAdjustment} mm
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Summary & Apply */}
          {wizardStep === 4 && recommendation && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  4. Odporúčanie
                </h4>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="text-[10px] text-slate-400 hover:text-sky-400"
                >
                  ← Späť
                </button>
              </div>

              {/* Selected config */}
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-slate-200">
                  {PROCESS_OPTIONS.find(p => p.value === selectedProcess)?.label}
                </span>
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-slate-200">
                  {APPLICATION_OPTIONS.find(a => a.value === selectedApplication)?.label}
                </span>
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-slate-200">
                  {SUBSTRATE_OPTIONS.find(s => s.value === selectedSubstrate)?.label}
                </span>
              </div>

              {/* Recommendation values */}
              <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Norma: {recommendation.standard}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">X-dim:</span>
                    <span className="font-mono text-emerald-400">{recommendation.recommendedXDimMm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BWR:</span>
                    <span className="font-mono text-emerald-400">{recommendation.bwrMm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quiet zone:</span>
                    <span className="font-mono text-emerald-400">{recommendation.minQuietZoneMm.toFixed(2)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Min. grade:</span>
                    <span className="font-mono text-amber-400">{recommendation.minGrade}</span>
                  </div>
                </div>
              </div>

              {/* Compliance check */}
              {compliance && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Kontrola aktuálnych hodnôt:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        compliance.xDimOk
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}
                    >
                      X-dim: {currentXDim} mm {compliance.xDimOk ? '✓' : '✗'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        compliance.bwrOk
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : 'bg-amber-900/50 text-amber-300'
                      }`}
                    >
                      BWR: {currentBwr} mm {compliance.bwrOk ? '✓' : '~'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        compliance.quietZoneOk
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}
                    >
                      QZ: {currentQuietZone} mm {compliance.quietZoneOk ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {recommendation.notes.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-700/50 bg-amber-900/20 p-2">
                  {recommendation.notes.map((note: string, idx: number) => (
                    <p key={idx} className="text-[10px] text-amber-200">
                      • {note}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 rounded-md border border-emerald-600 bg-emerald-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Aplikovať odporúčanie
                </button>
                <button
                  type="button"
                  onClick={resetWizard}
                  className="rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
                >
                  Resetovať
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NormsWizard
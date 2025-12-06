import React, { useCallback, useState } from 'react'
import {
  PROFILE_GROUPS,
  type PrintingProfile,
} from '../../config/printingProfiles'
import type {
  CodeType,
  Rotation,
  VdpMode,
  PrintDirection,
} from '../../types/barcodeTypes'

type GraphicToolsPanelProps = {
  codeType: CodeType

  rotation: Rotation
  setRotation: (r: Rotation) => void

  printDirection: PrintDirection
  setPrintDirection: (d: PrintDirection) => void

  xDimMm: number
  setXDimMm: (v: number) => void
  quietZoneMm: number
  setQuietZoneMm: (v: number) => void
  magnificationPercent: number
  setMagnificationPercent: (v: number) => void
  barWidthReductionMm: number
  setBarWidthReductionMm: (v: number) => void
  applyPrintingProfile: (p: PrintingProfile) => void

  vdpEnabled: boolean
  setVdpEnabled: (v: boolean) => void
  serialStart: number
  setSerialStart: (v: number) => void
  serialCurrent: number
  setSerialCurrent: (v: number) => void
  serialPadding: number
  setSerialPadding: (v: number) => void
  vdpPattern: string
  setVdpPattern: (v: string) => void
  vdpMode: VdpMode
  setVdpMode: (v: VdpMode) => void
  vdpCount: number
  setVdpCount: (v: number) => void
  vdpPrefix: string
  setVdpPrefix: (v: string) => void
  vdpAlphaStartChar: string
  setVdpAlphaStartChar: (v: string) => void

  barHeightPx: number
  setBarHeightPx: (v: number) => void
  showHrText: boolean
  setShowHrText: (v: boolean) => void
  hrFontSizePt: number
  setHrFontSizePt: (v: number) => void
  barColor: string
  setBarColor: (v: string) => void
  bgColor: string
  setBgColor: (v: string) => void
  textColor: string
  setTextColor: (v: string) => void

  qrLogoDataUrl: string | null
  setQrLogoDataUrl: (v: string | null) => void
  qrLogoScale: number
  setQrLogoScale: (v: number) => void

  hrCustomText: string
  setHrCustomText: (v: string) => void

  labelBorderRadiusMm: number
  setLabelBorderRadiusMm: (v: number) => void
  showDimensionGuides: boolean
  setShowDimensionGuides: (v: boolean) => void
}

const rotationOptions: Rotation[] = [0, 90, 180, 270]

// Ikony pre tlačové procesy
const processIcons: Record<string, string> = {
  flexo: '🔄',
  offset: '📰',
  digital: '🖨️',
  thermal: '🌡️',
  special: '✨',
}

// Farby pre GS1 compliance level
const complianceColors: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  B: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
  C: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  D: 'bg-red-500/20 text-red-300 border-red-500/50',
  CUSTOM: 'bg-slate-500/20 text-slate-300 border-slate-500/50',
}

export const GraphicToolsPanel: React.FC<GraphicToolsPanelProps> = props => {
  const {
    codeType,
    rotation,
    setRotation,
    printDirection,
    setPrintDirection,
    xDimMm,
    setXDimMm,
    quietZoneMm,
    setQuietZoneMm,
    magnificationPercent,
    setMagnificationPercent,
    barWidthReductionMm,
    setBarWidthReductionMm,
    applyPrintingProfile,
    vdpEnabled,
    setVdpEnabled,
    serialStart,
    setSerialStart,
    serialCurrent,
    setSerialCurrent,
    serialPadding,
    setSerialPadding,
    vdpPattern,
    setVdpPattern,
    vdpMode,
    setVdpMode,
    vdpCount,
    setVdpCount,
    vdpPrefix,
    setVdpPrefix,
    vdpAlphaStartChar,
    setVdpAlphaStartChar,
    barHeightPx,
    setBarHeightPx,
    showHrText,
    setShowHrText,
    hrFontSizePt,
    setHrFontSizePt,
    barColor,
    setBarColor,
    bgColor,
    setBgColor,
    textColor,
    setTextColor,
    qrLogoDataUrl,
    setQrLogoDataUrl,
    qrLogoScale,
    setQrLogoScale,
    hrCustomText,
    setHrCustomText,
    labelBorderRadiusMm,
    setLabelBorderRadiusMm,
    showDimensionGuides,
    setShowDimensionGuides,
  } = props

  const [expandedGroup, setExpandedGroup] = useState<string | null>('flexo')
  const [selectedProfile, setSelectedProfile] = useState<PrintingProfile | null>(null)
  const [showProfileDetail, setShowProfileDetail] = useState(false)

  const handleNumberChange = useCallback(
    (setter: (n: number) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value.replace(',', '.'))
        setter(Number.isFinite(v) ? v : 0)
      },
    [],
  )

  const handleColorChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setter(e.target.value)

  const handleQrLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setQrLogoDataUrl(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setQrLogoDataUrl(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSelect = (profile: PrintingProfile) => {
    setSelectedProfile(profile)
    applyPrintingProfile(profile)
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId)
  }

  return (
    <section className="flex h-full flex-col gap-5 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/80 p-5">
      {/* Tlač & normy */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span>🎯</span>
            Tlač &amp; normy
          </h2>
          <span className="rounded-lg bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
            {codeType}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Rotácia</label>
            <select
              value={rotation}
              onChange={e => setRotation(Number(e.target.value) as Rotation)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            >
              {rotationOptions.map(r => (
                <option key={r} value={r}>
                  {r}°
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Smer tlače
            </label>
            <select
              value={printDirection}
              onChange={e =>
                setPrintDirection(e.target.value as PrintDirection)
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="ALONG_WEB">Pozdĺž pásu</option>
              <option value="ACROSS_WEB">Naprieč pásom</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              X-dim (mm)
            </label>
            <input
              type="number"
              step="0.01"
              value={xDimMm}
              onChange={handleNumberChange(setXDimMm)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Quiet zone (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={quietZoneMm}
              onChange={handleNumberChange(setQuietZoneMm)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Magnifikácia (%)
            </label>
            <input
              type="number"
              step="1"
              value={magnificationPercent}
              onChange={handleNumberChange(setMagnificationPercent)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              BWR (mm)
            </label>
            <input
              type="number"
              step="0.001"
              value={barWidthReductionMm}
              onChange={handleNumberChange(setBarWidthReductionMm)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Profily tlače - nový rozšírený panel */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span>🖨️</span>
            Profily tlače
          </h2>
          {selectedProfile && (
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${complianceColors[selectedProfile.gs1ComplianceLevel]}`}>
              GS1 Grade {selectedProfile.gs1ComplianceLevel}
            </span>
          )}
        </div>

        {/* Aktuálne vybraný profil */}
        {selectedProfile && (
          <div className="mb-3 rounded-md border border-sky-500/50 bg-sky-500/10 p-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold text-sky-100">
                  {selectedProfile.name}
                </div>
                <div className="mt-0.5 text-[9px] text-sky-300/80">
                  {selectedProfile.substrateLabel} · {selectedProfile.processLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileDetail(!showProfileDetail)}
                className="rounded border border-sky-500/50 bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-200 hover:bg-sky-500/30"
              >
                {showProfileDetail ? 'Skryť' : 'Detail'}
              </button>
            </div>
            
            {showProfileDetail && (
              <div className="mt-2 space-y-1 border-t border-sky-500/30 pt-2 text-[9px] text-sky-200/80">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span>X-dim rozsah:</span>
                  <span className="text-sky-100">{selectedProfile.limits.xDimMmMin} – {selectedProfile.limits.xDimMmMax} mm</span>
                  <span>Magnifikácia:</span>
                  <span className="text-sky-100">{selectedProfile.limits.magnificationMin} – {selectedProfile.limits.magnificationMax}%</span>
                  <span>BWR rozsah:</span>
                  <span className="text-sky-100">{selectedProfile.limits.bwrMmMin} – {selectedProfile.limits.bwrMmMax} mm</span>
                  <span>DPI:</span>
                  <span className="text-sky-100">{selectedProfile.dpiNative}</span>
                </div>
                {selectedProfile.notes.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-sky-500/20">
                    <div className="font-medium text-sky-200">Poznámky:</div>
                    <ul className="mt-0.5 list-inside list-disc text-sky-200/70">
                      {selectedProfile.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedProfile.warnings.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-amber-500/20">
                    <div className="font-medium text-amber-300">Upozornenia:</div>
                    <ul className="mt-0.5 list-inside list-disc text-amber-200/70">
                      {selectedProfile.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Accordion skupiny profilov */}
        <div className="space-y-1">
          {PROFILE_GROUPS.map(group => (
            <div key={group.id} className="rounded-md border border-slate-700 bg-slate-800/50">
              {/* Header skupiny */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{processIcons[group.id]}</span>
                  <span className="text-[11px] font-medium text-slate-200">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400">
                    {group.profiles.length}
                  </span>
                </div>
                <svg
                  className={`h-3 w-3 text-slate-400 transition-transform ${
                    expandedGroup === group.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profily v skupine */}
              {expandedGroup === group.id && (
                <div className="border-t border-slate-700 p-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    {group.profiles.map(profile => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleProfileSelect(profile)}
                        className={`rounded-md border p-1.5 text-left transition-colors ${
                          selectedProfile?.id === profile.id
                            ? 'border-sky-500 bg-sky-500/20'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-[10px] font-medium text-slate-200 leading-tight">
                            {profile.label}
                          </div>
                          <span className={`rounded px-1 py-0.5 text-[8px] font-medium ${complianceColors[profile.gs1ComplianceLevel]}`}>
                            {profile.gs1ComplianceLevel}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[9px] text-slate-400 leading-tight">
                          {profile.substrateLabel}
                        </div>
                        <div className="mt-0.5 text-[8px] text-slate-500">
                          {profile.applicationLabel}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* VDP / seriové čísla */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span>🔢</span>
            VDP / séria
          </h2>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={vdpEnabled}
              onChange={e => setVdpEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-sky-500"
            />
            Aktivné
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Začiatok série
            </label>
            <input
              type="number"
              value={serialStart}
              onChange={handleNumberChange(setSerialStart)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Aktuálne #
            </label>
            <input
              type="number"
              value={serialCurrent}
              onChange={handleNumberChange(setSerialCurrent)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Padding (počet číslic)
            </label>
            <input
              type="number"
              value={serialPadding}
              onChange={handleNumberChange(setSerialPadding)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Počet kusov
            </label>
            <input
              type="number"
              value={vdpCount}
              onChange={handleNumberChange(setVdpCount)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Prefix
            </label>
            <input
              type="text"
              value={vdpPrefix}
              onChange={e => setVdpPrefix(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Alfa štart
            </label>
            <input
              type="text"
              maxLength={1}
              value={vdpAlphaStartChar}
              onChange={e => setVdpAlphaStartChar(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-center text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Vzor (pattern)
          </label>
          <input
            type="text"
            value={vdpPattern}
            onChange={e => setVdpPattern(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
          <p className="text-xs text-slate-500">
            Tokeny: [SERIAL], [PREFIX], [ALPHA] podľa zvoleného VDP režimu.
          </p>
        </div>

        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              value="LINEAR"
              checked={vdpMode === 'LINEAR'}
              onChange={() => setVdpMode('LINEAR')}
              className="h-4 w-4"
            />
            Lineárne
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              value="PREFIX"
              checked={vdpMode === 'PREFIX'}
              onChange={() => setVdpMode('PREFIX')}
              className="h-4 w-4"
            />
            Prefix
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              value="ALPHA"
              checked={vdpMode === 'ALPHA'}
              onChange={() => setVdpMode('ALPHA')}
              className="h-4 w-4"
            />
            Alfa
          </label>
        </div>
      </div>

      {/* Grafika & shape */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
          <span>🎨</span>
          Grafika &amp; shape
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Výška čiar (px)
            </label>
            <input
              type="number"
              value={barHeightPx}
              onChange={handleNumberChange(setBarHeightPx)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              HR font (pt)
            </label>
            <input
              type="number"
              value={hrFontSizePt}
              onChange={handleNumberChange(setHrFontSizePt)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Zaoblenie rohov (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={labelBorderRadiusMm}
              onChange={handleNumberChange(setLabelBorderRadiusMm)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showHrText}
              onChange={e => setShowHrText(e.target.checked)}
              className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-sky-500"
            />
            Zobraziť HR text
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showDimensionGuides}
              onChange={e => setShowDimensionGuides(e.target.checked)}
              className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-sky-500"
            />
            Rozmerové vodiace čiary
          </label>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Farba čiar
            </label>
            <input
              type="color"
              value={barColor}
              onChange={handleColorChange(setBarColor)}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Pozadie
            </label>
            <input
              type="color"
              value={bgColor}
              onChange={handleColorChange(setBgColor)}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Text
            </label>
            <input
              type="color"
              value={textColor}
              onChange={handleColorChange(setTextColor)}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Vlastný HR text (override)
          </label>
          <input
            type="text"
            value={hrCustomText}
            onChange={e => setHrCustomText(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* QR Logo */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span>🖼️</span>
            QR Logo
          </h2>
          {qrLogoDataUrl && (
            <button
              type="button"
              onClick={() => setQrLogoDataUrl(null)}
              className="rounded-lg border-2 border-red-600 bg-red-900/40 px-3 py-1.5 text-sm font-medium text-red-100 hover:bg-red-800/70"
            >
              Odstrániť
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleQrLogoUpload}
            className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border file:border-slate-600 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-100"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Veľkosť loga (%)
          </label>
          <input
            type="range"
            min={0.1}
            max={0.5}
            step={0.01}
            value={qrLogoScale}
            onChange={e => setQrLogoScale(Number(e.target.value))}
            className="w-full h-3"
          />
          <p className="text-sm text-slate-400">
            {Math.round(qrLogoScale * 100)} % veľkosti QR symbolu.
          </p>
        </div>
      </div>
    </section>
  )
}

export default GraphicToolsPanel





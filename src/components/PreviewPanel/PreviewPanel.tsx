import React, { useMemo } from 'react'
import type { RefObject } from 'react'
import type { PrintingProfile } from '../../config/printingProfiles'
import type { CodeType, VdpMode, PrintDirection } from '../../types/barcodeTypes'
import { QRCodeSVG } from 'qrcode.react'

type PreviewPanelProps = {
  codeType: CodeType
  rawCodeValue: string

  vdpEnabled: boolean
  serialCurrent: number
  serialPadding: number
  vdpPattern: string
  vdpMode: VdpMode
  vdpPrefix: string
  vdpAlphaStartChar: string

  rotation: 0 | 90 | 180 | 270
  printDirection: PrintDirection

  exportDpi: number

  labelWidthMm: number
  labelHeightMm: number
  bleedMm: number

  xDimMm: number
  quietZoneMm: number
  magnificationPercent: number
  activeProfile: PrintingProfile | null

  svgRef: RefObject<SVGSVGElement | null>
  previewWrapperRef: RefObject<HTMLDivElement | null>

  barHeightPx: number
  showHrText: boolean
  hrFontSizePt: number
  barColor: string
  bgColor: string
  textColor: string

  qrLogoDataUrl: string | null
  qrLogoScale: number
  hrCustomText: string

  labelBorderRadiusMm: number
  showDimensionGuides: boolean
}

const mmLabel = (v: number) => `${v.toFixed(2).replace('.', ',')}mm`

// Norma EAN-13 pri 100 %
const EAN13_BASE = {
  totalWidthMm: 37.29,
  quietLeftMm: 3.63,
  coreWidthMm: 31.35,
  quietRightMm: 2.31,
  barHeightMm: 22.85,
  hrTextHeightMm: 3.06, // výška pre HR text pod čiarami
  modulesCore: 95, // celé jadro (guardy + dáta, bez quiet)
}

// Parity pre prvú číslicu
const EAN13_PARITY: string[] = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
]

const L_CODES: Record<string, string> = {
  '0': '0001101',
  '1': '0011001',
  '2': '0010011',
  '3': '0111101',
  '4': '0100011',
  '5': '0110001',
  '6': '0101111',
  '7': '0111011',
  '8': '0110111',
  '9': '0001011',
}

const G_CODES: Record<string, string> = {
  '0': '0100111',
  '1': '0110011',
  '2': '0011011',
  '3': '0100001',
  '4': '0011101',
  '5': '0111001',
  '6': '0000101',
  '7': '0010001',
  '8': '0001001',
  '9': '0010111',
}

const R_CODES: Record<string, string> = {
  '0': '1110010',
  '1': '1100110',
  '2': '1101100',
  '3': '1000010',
  '4': '1011100',
  '5': '1001110',
  '6': '1010000',
  '7': '1000100',
  '8': '1001000',
  '9': '1110100',
}

function computeEan13CheckDigit(body12: string): string {
  const digits = body12.split('').map(d => parseInt(d, 10))
  if (digits.length !== 12 || digits.some(isNaN)) return '0'

  let sumOdd = 0
  let sumEven = 0
  for (let i = 0; i < 12; i++) {
    if ((i + 1) % 2 === 0) sumEven += digits[i]
    else sumOdd += digits[i]
  }
  const total = sumOdd + 3 * sumEven
  const cd = (10 - (total % 10)) % 10
  return String(cd)
}

function encodeEan13Pattern(digits13: string): string {
  if (!/^[0-9]{13}$/.test(digits13)) return ''

  const first = parseInt(digits13[0], 10)
  const leftDigits = digits13.slice(1, 7)
  const rightDigits = digits13.slice(7, 13)
  const parity = EAN13_PARITY[first]

  let pattern = '101' // start guard

  // ľavá polovica
  for (let i = 0; i < 6; i++) {
    const d = leftDigits[i]
    const p = parity[i]
    if (p === 'L') pattern += L_CODES[d]
    else pattern += G_CODES[d]
  }

  pattern += '01010' // middle guard

  // pravá polovica
  for (let i = 0; i < 6; i++) {
    const d = rightDigits[i]
    pattern += R_CODES[d]
  }

  pattern += '101' // end guard

  return pattern
}

// ===================== KOMPONENT =====================

export const PreviewPanel: React.FC<PreviewPanelProps> = props => {
  const {
    codeType,
    rawCodeValue,
    rotation,
    printDirection,
    exportDpi,
    labelWidthMm,
    labelHeightMm,
    xDimMm,
    quietZoneMm,
    magnificationPercent,
    activeProfile,
    svgRef,
    previewWrapperRef,
    barHeightPx,
    barColor,
    bgColor,
    textColor,
    hrFontSizePt,
    showHrText,
    vdpEnabled,
    serialCurrent,
    serialPadding,
    vdpPattern,
    vdpMode,
    vdpPrefix,
    vdpAlphaStartChar,
    qrLogoDataUrl,
    qrLogoScale,
    hrCustomText,
    labelBorderRadiusMm,
    showDimensionGuides,
    bleedMm,
  } = props

  const mmToPx = (mm: number) => mm * 6 // 6 px / mm

  /* ========= VDP string (ako "raw text") ========= */
  const baseValue = useMemo(() => {
    if (!vdpEnabled) return rawCodeValue

    const serialStr = String(serialCurrent).padStart(serialPadding, '0')
    const alphaStr = vdpMode === 'ALPHA' ? vdpAlphaStartChar : vdpAlphaStartChar

    const base = vdpPattern
      .replace('[SERIAL]', serialStr)
      .replace('[PREFIX]', vdpPrefix)
      .replace('[ALPHA]', alphaStr)

    return base || rawCodeValue
  }, [
    vdpEnabled,
    rawCodeValue,
    serialCurrent,
    serialPadding,
    vdpPattern,
    vdpMode,
    vdpPrefix,
    vdpAlphaStartChar,
  ])

  /* ========= EAN-13 info: 13 číslic, human readable, pattern ========= */
  const eanInfo = useMemo(() => {
    if (codeType !== 'EAN13') return null

    const digitsOnly = baseValue.replace(/[^0-9]/g, '')
    if (digitsOnly.length < 12) return null

    const body12 = digitsOnly.slice(0, 12)
    const check = computeEan13CheckDigit(body12)
    const full13 = body12 + check

    const pattern = encodeEan13Pattern(full13)
    if (!pattern) return null

    return {
      digits: full13,
      firstDigit: full13[0],
      leftGroup: full13.slice(1, 7),
      rightGroup: full13.slice(7, 13),
      pattern,
    }
  }, [codeType, baseValue])

  const previewValue = codeType === 'EAN13' && eanInfo ? eanInfo.digits : baseValue

  // Je to 2D kód (QR, DataMatrix)?
  const is2DCode = codeType === 'QR' || codeType === 'DATAMATRIX' || codeType === 'PDF417'

  /* ========= Výška čiar v mm ========= */
  const barHeightMm = useMemo(() => {
    if (codeType === 'EAN13') {
      const scale = (magnificationPercent || 100) / 100
      return EAN13_BASE.barHeightMm * scale
    }
    // Pre 2D kódy - štvorcový rozmer podľa šírky etikety
    if (is2DCode) {
      const q = quietZoneMm > 0 ? quietZoneMm : 2.5
      const availableWidth = labelWidthMm - 2 * q
      // QR kód by mal byť štvorcový, použijeme dostupnú šírku
      return Math.min(availableWidth, labelHeightMm - 2 * q - (showHrText ? 5 : 0))
    }
    if (!exportDpi || barHeightPx <= 0) return 0
    return (barHeightPx / exportDpi) * 25.4
  }, [codeType, magnificationPercent, exportDpi, barHeightPx, is2DCode, quietZoneMm, labelWidthMm, labelHeightMm, showHrText])

  /* ========= HR text height v mm ========= */
  const hrTextHeightMm = useMemo(() => {
    if (codeType === 'EAN13') {
      const scale = (magnificationPercent || 100) / 100
      return EAN13_BASE.hrTextHeightMm * scale
    }
    return showHrText ? 3 : 0
  }, [codeType, magnificationPercent, showHrText])

  /* ========= Total height (bars + HR text) v mm ========= */
  const totalHeightMm = useMemo(() => {
    return barHeightMm + hrTextHeightMm
  }, [barHeightMm, hrTextHeightMm])

  /* ========= Quiet / core / total v mm ========= */
  const dims = useMemo(() => {
    if (codeType === 'EAN13') {
      const scale = (magnificationPercent || 100) / 100
      return {
        quietLeftMm: EAN13_BASE.quietLeftMm * scale,
        quietRightMm: EAN13_BASE.quietRightMm * scale,
        coreWidthMm: EAN13_BASE.coreWidthMm * scale,
        totalWidthMm: EAN13_BASE.totalWidthMm * scale,
      }
    }

    const q = quietZoneMm > 0 ? quietZoneMm : 2.5
    
    // Pre 2D kódy - štvorcový rozmer
    if (is2DCode) {
      const maxSize = Math.min(labelWidthMm - 2 * q, labelHeightMm - 2 * q - (showHrText ? 5 : 0))
      const coreSize = Math.max(maxSize, 10) // minimálne 10mm
      return {
        quietLeftMm: q,
        quietRightMm: q,
        coreWidthMm: coreSize,
        totalWidthMm: coreSize + 2 * q,
      }
    }

    const core = Math.max(labelWidthMm - 2 * q, 1)
    return {
      quietLeftMm: q,
      quietRightMm: q,
      coreWidthMm: core,
      totalWidthMm: core + 2 * q,
    }
  }, [codeType, magnificationPercent, quietZoneMm, labelWidthMm, is2DCode, labelHeightMm, showHrText])

  const { quietLeftMm, quietRightMm, coreWidthMm, totalWidthMm } = dims

  /* ========= Prepočet na px ========= */
  const barcodeWidthPx = mmToPx(totalWidthMm)
  const barHeightPxCalc = mmToPx(barHeightMm)
  const hrTextHeightPx = mmToPx(hrTextHeightMm)
  const totalHeightPx = barHeightPxCalc + hrTextHeightPx

  // Padding pre dimension guides
  const paddingTop = 50
  const paddingBottom = 60
  const paddingLeft = 70
  const paddingRight = 70

  const svgWidth = barcodeWidthPx + paddingLeft + paddingRight
  const svgHeight = totalHeightPx + paddingTop + paddingBottom

  const quietLeftPx = mmToPx(quietLeftMm)
  const coreWidthPx = mmToPx(coreWidthMm)
  const quietRightPx = mmToPx(quietRightMm)

  /* ========= Bars ========= */
  const bars = useMemo(() => {
    // reálny EAN-13 pattern
    if (codeType === 'EAN13' && eanInfo?.pattern) {
      const barsRes: Array<{ x: number; w: number }> = []
      const modulePx = coreWidthPx / EAN13_BASE.modulesCore
      const pattern = eanInfo.pattern

      let i = 0
      while (i < pattern.length) {
        if (pattern[i] === '1') {
          let j = i
          while (j < pattern.length && pattern[j] === '1') j++
          const runLen = j - i
          barsRes.push({
            x: quietLeftPx + i * modulePx,
            w: runLen * modulePx,
          })
          i = j
        } else {
          i++
        }
      }
      return barsRes
    }

    // fallback pre ostatné typy – jednoduchý pattern
    const out: Array<{ x: number; w: number }> = []
    if (!previewValue) return out

    const modulePx = xDimMm > 0 ? mmToPx(xDimMm) : 2
    let curPx = quietLeftPx
    const maxX = quietLeftPx + coreWidthPx

    for (let i = 0; i < previewValue.length; i++) {
      const ch = previewValue.charCodeAt(i)
      const widthModules = 1 + (ch % 4)
      const gapModules = 1 + (ch % 3)

      const barW = widthModules * modulePx
      if (curPx >= maxX) break

      const w = Math.min(barW, maxX - curPx)
      out.push({ x: curPx, w })

      curPx += (widthModules + gapModules) * modulePx
      if (curPx > maxX) break
    }

    return out
  }, [codeType, eanInfo, coreWidthPx, quietLeftPx, previewValue, xDimMm])

  const effectiveHrText =
    hrCustomText ||
    (codeType === 'EAN13' && eanInfo ? `${eanInfo.firstDigit}  ${eanInfo.leftGroup}  ${eanInfo.rightGroup}` : previewValue)

  const charCount = (previewValue || '').length

  // Dimension guide style constants
  const dimLineColor = '#64748b' // slate-500
  const dimTextColor = '#334155' // slate-700
  const dimLineWidth = 1
  const dimFontSize = 11

  return (
    <div
      ref={previewWrapperRef}
      className="flex w-full items-stretch justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex w-full flex-col items-center gap-3">
        {/* header */}
        <div className="flex w-full items-center justify-between text-xs text-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">
              Náhľad kódu {codeType}{' '}
              {magnificationPercent ? `· ${magnificationPercent}%` : null}
            </span>
            <span className="text-[11px] text-slate-400">
              Rotácia: {rotation}° · Smer tlače:{' '}
              {printDirection === 'ALONG_WEB' ? 'Pozdĺž pásu' : 'Naprieč pásom'}
            </span>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            {activeProfile ? (
              <>
                <div>{activeProfile.name}</div>
                <div className="opacity-80">{activeProfile.description}</div>
              </>
            ) : (
              <span>Bez profilu</span>
            )}
          </div>
        </div>

        {/* SVG náhľad */}
        <div className="flex w-full flex-1 items-center justify-center">
          <svg
            ref={svgRef as any}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="max-h-[480px] w-full"
            style={{ background: '#fefefe' }}
          >
            {/* Definície pre šípky/značky */}
            <defs>
              <marker
                id="dimArrowStart"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <path d="M6,0 L6,6 L0,3 z" fill={dimLineColor} />
              </marker>
              <marker
                id="dimArrowEnd"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 z" fill={dimLineColor} />
              </marker>
            </defs>

            {/* „papier" etikety - zaoblené rohy */}
            <rect
              x={paddingLeft - 10}
              y={paddingTop - 10}
              width={barcodeWidthPx + 20}
              height={totalHeightPx + 20}
              rx={labelBorderRadiusMm * mmToPx(1)}
              ry={labelBorderRadiusMm * mmToPx(1)}
              fill={bgColor}
              stroke="#d1d5db"
              strokeWidth={1}
            />

            {(() => {
              const x0 = paddingLeft
              const barTop = paddingTop
              const barBottom = barTop + barHeightPxCalc
              const hrTextY = barBottom + hrTextHeightPx - 4

              return (
                <g>
                  {/* oblasť kódu */}
                  <rect
                    x={x0}
                    y={barTop}
                    width={barcodeWidthPx}
                    height={barHeightPxCalc}
                    fill={bgColor}
                  />

                  {/* reálne bary alebo 2D kód */}
                  {(codeType === 'QR' || codeType === 'DATAMATRIX') ? (
                    <foreignObject
                      x={x0 + quietLeftPx}
                      y={barTop}
                      width={coreWidthPx}
                      height={barHeightPxCalc}
                    >
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <QRCodeSVG
                          value={previewValue || 'https://example.com'}
                          size={Math.min(coreWidthPx, barHeightPxCalc)}
                          level="M"
                          bgColor={bgColor}
                          fgColor={barColor}
                          imageSettings={qrLogoDataUrl ? {
                            src: qrLogoDataUrl,
                            height: Math.min(coreWidthPx, barHeightPxCalc) * qrLogoScale,
                            width: Math.min(coreWidthPx, barHeightPxCalc) * qrLogoScale,
                            excavate: true,
                          } : undefined}
                        />
                      </div>
                    </foreignObject>
                  ) : (
                    <g>
                      {bars.map((b, idx) => (
                        <rect
                          key={idx}
                          x={x0 + b.x}
                          y={barTop}
                          width={b.w}
                          height={barHeightPxCalc}
                          fill={barColor}
                        />
                      ))}
                    </g>
                  )}

                  {/* HR text pre EAN-13 - formát: 8  581234  123458  > */}
                  {showHrText && codeType === 'EAN13' && eanInfo && (
                    <g fontSize={hrFontSizePt} fill={textColor} fontFamily="monospace">
                      {/* Prvá číslica - vľavo od quiet zóny */}
                      <text
                        x={x0 + quietLeftPx - 8}
                        y={hrTextY}
                        textAnchor="end"
                      >
                        {eanInfo.firstDigit}
                      </text>
                      {/* Ľavá skupina 6 číslic */}
                      <text
                        x={x0 + quietLeftPx + (coreWidthPx / 2 - 5) / 2 + 3}
                        y={hrTextY}
                        textAnchor="middle"
                      >
                        {eanInfo.leftGroup}
                      </text>
                      {/* Pravá skupina 6 číslic */}
                      <text
                        x={x0 + quietLeftPx + coreWidthPx / 2 + 5 + (coreWidthPx / 2 - 5) / 2 - 3}
                        y={hrTextY}
                        textAnchor="middle"
                      >
                        {eanInfo.rightGroup}
                      </text>
                      {/* > symbol vpravo */}
                      <text
                        x={x0 + quietLeftPx + coreWidthPx + 8}
                        y={hrTextY}
                        textAnchor="start"
                      >
                        &gt;
                      </text>
                    </g>
                  )}

                  {/* HR text pre ostatné typy */}
                  {showHrText && codeType !== 'EAN13' && (
                    <text
                      x={x0 + barcodeWidthPx / 2}
                      y={hrTextY}
                      textAnchor="middle"
                      fontSize={hrFontSizePt}
                      fill={textColor}
                    >
                      {effectiveHrText || ' '}
                    </text>
                  )}

                  {/* ===== ROZMEROVÉ ČIARY - štýl zo screenshotu ===== */}
                  {showDimensionGuides && (
                    <g
                      stroke={dimLineColor}
                      strokeWidth={dimLineWidth}
                      fill={dimTextColor}
                      fontSize={dimFontSize}
                      fontFamily="system-ui, sans-serif"
                    >
                      {/* ===== TOP - celková šírka ===== */}
                      {(() => {
                        const topY = barTop - 25
                        const leftX = x0
                        const rightX = x0 + barcodeWidthPx
                        return (
                          <g>
                            {/* Ľavý vertikálny tick */}
                            <line x1={leftX} y1={barTop - 5} x2={leftX} y2={topY - 5} />
                            {/* Pravý vertikálny tick */}
                            <line x1={rightX} y1={barTop - 5} x2={rightX} y2={topY - 5} />
                            {/* Horizontálna čiara */}
                            <line x1={leftX} y1={topY} x2={rightX} y2={topY} />
                            {/* Text */}
                            <text
                              x={(leftX + rightX) / 2}
                              y={topY - 8}
                              textAnchor="middle"
                              stroke="none"
                            >
                              {mmLabel(totalWidthMm)}
                            </text>
                          </g>
                        )
                      })()}

                      {/* ===== ĽAVÁ STRANA - výška čiar ===== */}
                      {barHeightMm > 0 && (
                        <g>
                          {/* Horný horizontálny tick */}
                          <line
                            x1={x0 - 5}
                            y1={barTop}
                            x2={x0 - 25}
                            y2={barTop}
                          />
                          {/* Dolný horizontálny tick */}
                          <line
                            x1={x0 - 5}
                            y1={barBottom}
                            x2={x0 - 25}
                            y2={barBottom}
                          />
                          {/* Vertikálna čiara */}
                          <line
                            x1={x0 - 20}
                            y1={barTop}
                            x2={x0 - 20}
                            y2={barBottom}
                          />
                          {/* Text - rotovaný */}
                          <text
                            x={x0 - 35}
                            y={(barTop + barBottom) / 2}
                            textAnchor="middle"
                            stroke="none"
                            transform={`rotate(-90 ${x0 - 35}, ${(barTop + barBottom) / 2})`}
                          >
                            {mmLabel(barHeightMm)}
                          </text>
                        </g>
                      )}

                      {/* ===== PRAVÁ STRANA - celková výška (vrátane HR) ===== */}
                      {totalHeightMm > 0 && (
                        <g>
                          {/* Horný horizontálny tick */}
                          <line
                            x1={x0 + barcodeWidthPx + 5}
                            y1={barTop}
                            x2={x0 + barcodeWidthPx + 25}
                            y2={barTop}
                          />
                          {/* Dolný horizontálny tick */}
                          <line
                            x1={x0 + barcodeWidthPx + 5}
                            y1={barTop + totalHeightPx}
                            x2={x0 + barcodeWidthPx + 25}
                            y2={barTop + totalHeightPx}
                          />
                          {/* Vertikálna čiara */}
                          <line
                            x1={x0 + barcodeWidthPx + 20}
                            y1={barTop}
                            x2={x0 + barcodeWidthPx + 20}
                            y2={barTop + totalHeightPx}
                          />
                          {/* Text - rotovaný */}
                          <text
                            x={x0 + barcodeWidthPx + 38}
                            y={(barTop + barTop + totalHeightPx) / 2}
                            textAnchor="middle"
                            stroke="none"
                            transform={`rotate(-90 ${x0 + barcodeWidthPx + 38}, ${(barTop + barTop + totalHeightPx) / 2})`}
                          >
                            {mmLabel(totalHeightMm)}
                          </text>
                        </g>
                      )}

                      {/* ===== SPODOK - quiet L / core / quiet R ===== */}
                      {(() => {
                        const baseY = barTop + totalHeightPx + 20
                        const leftX = x0
                        const coreStartX = leftX + quietLeftPx
                        const coreEndX = coreStartX + coreWidthPx
                        const rightX = coreEndX + quietRightPx

                        return (
                          <g>
                            {/* === Quiet left === */}
                            {/* Ľavý vertikálny tick */}
                            <line
                              x1={leftX}
                              y1={barTop + totalHeightPx + 5}
                              x2={leftX}
                              y2={baseY + 8}
                            />
                            {/* Pravý vertikálny tick (koniec quiet) */}
                            <line
                              x1={coreStartX}
                              y1={barTop + totalHeightPx + 5}
                              x2={coreStartX}
                              y2={baseY + 8}
                            />
                            {/* Horizontálna čiara */}
                            <line x1={leftX} y1={baseY} x2={coreStartX} y2={baseY} />
                            {/* Text */}
                            <text
                              x={(leftX + coreStartX) / 2}
                              y={baseY + 18}
                              textAnchor="middle"
                              stroke="none"
                            >
                              {mmLabel(quietLeftMm)}
                            </text>

                            {/* === Core width === */}
                            {/* Horizontálna čiara */}
                            <line x1={coreStartX} y1={baseY} x2={coreEndX} y2={baseY} />
                            {/* Text */}
                            <text
                              x={(coreStartX + coreEndX) / 2}
                              y={baseY + 18}
                              textAnchor="middle"
                              stroke="none"
                            >
                              {mmLabel(coreWidthMm)}
                            </text>

                            {/* === Quiet right === */}
                            {/* Ľavý vertikálny tick (koniec core) */}
                            <line
                              x1={coreEndX}
                              y1={barTop + totalHeightPx + 5}
                              x2={coreEndX}
                              y2={baseY + 8}
                            />
                            {/* Pravý vertikálny tick */}
                            <line
                              x1={rightX}
                              y1={barTop + totalHeightPx + 5}
                              x2={rightX}
                              y2={baseY + 8}
                            />
                            {/* Horizontálna čiara */}
                            <line x1={coreEndX} y1={baseY} x2={rightX} y2={baseY} />
                            {/* Text */}
                            <text
                              x={(coreEndX + rightX) / 2}
                              y={baseY + 18}
                              textAnchor="middle"
                              stroke="none"
                            >
                              {mmLabel(quietRightMm)}
                            </text>
                          </g>
                        )
                      })()}
                    </g>
                  )}
                </g>
              )
            })()}
          </svg>
        </div>

        {/* spodná lišta */}
        <div className="flex w-full items-center justify-between text-[11px] text-slate-400">
          <span>
            Štítok: {mmLabel(labelWidthMm)} × {mmLabel(labelHeightMm)} · Bleed{' '}
            {mmLabel(bleedMm)}
          </span>
          <span>
            VDP: {vdpEnabled ? 'AKTÍVNE' : 'vypnuté'} · Znaky: {charCount}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PreviewPanel















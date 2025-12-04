// src/lib/vdp.ts
import type { VdpMode } from '../types/barcodeTypes'

function formatSerial(current: number, padding: number): string {
  const s = String(Math.max(0, current))
  return s.padStart(Math.max(1, padding), '0')
}

export function applyVdpPattern(
  raw: string,
  enabled: boolean,
  current: number,
  padding: number,
  pattern: string,
  mode: VdpMode,
  prefix: string,
  alphaStartChar: string,
): string {
  if (!enabled) return raw

  const safePadding = Math.max(1, padding)
  const numericSerial = Math.max(0, current)

  let serialToken = ''

  if (mode === 'PREFIX') {
    const core = formatSerial(numericSerial, safePadding)
    serialToken = `${prefix ?? ''}${core}`
  } else if (mode === 'ALPHA') {
    const capacityPerLetter = Math.pow(10, safePadding)
    const baseIndex = Math.max(0, numericSerial - 1)
    const letterOffset = Math.floor(baseIndex / capacityPerLetter)
    const within = (baseIndex % capacityPerLetter) + 1

    const baseChar = (alphaStartChar || 'A').toUpperCase().charCodeAt(0)
    const aCode = 'A'.charCodeAt(0)
    const zCode = 'Z'.charCodeAt(0)
    const startCode = baseChar >= aCode && baseChar <= zCode ? baseChar : aCode
    let letterCode = startCode + letterOffset
    if (letterCode > zCode) {
      letterCode = zCode
    }
    const letter = String.fromCharCode(letterCode)
    const withinStr = String(within).padStart(safePadding, '0')
    serialToken = `${letter}${withinStr}`
  } else {
    serialToken = formatSerial(numericSerial, safePadding)
  }

  if (!pattern.includes('[SERIAL]')) {
    return serialToken
  }
  return pattern.replaceAll('[SERIAL]', serialToken)
}
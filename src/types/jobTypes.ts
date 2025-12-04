// src/types/jobTypes.ts
import type {
  CodeType,
  DataMode,
  VdpMode,
  Rotation,
  LabelPreset,
  PrintDirection,
} from './barcodeTypes'
import type { PrintingProfileId } from '../config/printingProfiles'

export type CodeJobId = string

export type CodeJob = {
  id: CodeJobId
  name: string

  createdAt: string
  updatedAt: string

  // --- základný kód ---
  codeType: CodeType
  dataMode: DataMode
  rawCodeValue: string

  // GS1 / VDP
  vdpEnabled: boolean
  vdpMode: VdpMode
  vdpPattern: string
  vdpPrefix: string
  vdpAlphaStartChar: string
  serialCurrent: number
  serialPadding: number

  // layout etikety
  labelPreset: LabelPreset
  labelWidthMm: number
  labelHeightMm: number
  bleedMm: number
  rotation: Rotation
  printDirection: PrintDirection

  // tlačový profil
  activeProfileId: PrintingProfileId | null

  // vzhľad čiarového kódu
  barHeightPx: number
  showHrText: boolean
  hrFontSizePt: number
  barColor: string
  bgColor: string
  textColor: string

  // QR logo
  qrLogoDataUrl: string | null
  qrLogoScale: number

  // HR text
  hrCustomText: string

  // export
  exportDpi: number
}

// src/types/barcodeTypes.ts

export type CodeType =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPCA'
  | 'ITF14'
  | 'GS1128'
  | 'GS1DM'
  | 'GS1DATABAR'
  | 'QR'

export type Rotation = 0 | 90 | 180 | 270

export type DataMode = 'PLAIN' | 'GS1_MANUAL' | 'GS1_FORM'

export type VdpMode = 'LINEAR' | 'PREFIX' | 'ALPHA'

export type LabelPreset = 'CUSTOM' | '50x30' | '80x50' | '100x70'

export type ReferenceBox = 'TRIM' | 'SAFE' | 'BLEED'

export type PositionPresetId = 'RETAIL' | 'PHARMA' | 'LOGISTICS' | 'CUSTOM'

export type WebDirection = 'BOTTOM' | 'LEFT' | 'TOP' | 'RIGHT'

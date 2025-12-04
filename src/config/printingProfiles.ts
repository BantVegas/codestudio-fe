// src/config/printingProfiles.ts
// Profesionálne tlačové profily pre etiketový priemysel

export type PrintProcess = 
  | 'FLEXO_UV'
  | 'FLEXO_WATER'
  | 'FLEXO_SOLVENT'
  | 'OFFSET_SHEET'
  | 'OFFSET_WEB'
  | 'OFFSET_UV'
  | 'DIGITAL_INDIGO'
  | 'DIGITAL_INKJET_UV'
  | 'DIGITAL_INKJET_WATER'
  | 'DIGITAL_TONER'
  | 'THERMAL_DIRECT'
  | 'THERMAL_TRANSFER'
  | 'GRAVURE'
  | 'SCREEN'

export type SubstrateCategory =
  | 'PAPER_COATED'
  | 'PAPER_UNCOATED'
  | 'PAPER_THERMAL'
  | 'FILM_PE'
  | 'FILM_PP'
  | 'FILM_BOPP'
  | 'FILM_PET'
  | 'FILM_PVC'
  | 'FILM_VINYL'
  | 'SYNTHETIC_TYVEK'
  | 'SYNTHETIC_YUPO'
  | 'METALLIC'
  | 'CARDBOARD'
  | 'SHRINK_SLEEVE'

export type ApplicationArea =
  | 'FOOD_BEVERAGE'
  | 'PHARMA'
  | 'COSMETICS'
  | 'LOGISTICS'
  | 'RETAIL'
  | 'INDUSTRIAL'
  | 'CHEMICAL'
  | 'WINE_SPIRITS'
  | 'DAIRY'
  | 'FROZEN'

export type PrintingProfileId =
  // Flexo UV
  | 'flexo_uv_paper_standard'
  | 'flexo_uv_paper_highres'
  | 'flexo_uv_film_pe'
  | 'flexo_uv_film_pp_bopp'
  | 'flexo_uv_film_pet'
  | 'flexo_uv_shrink'
  // Flexo Water-based
  | 'flexo_water_paper'
  | 'flexo_water_cardboard'
  // Offset
  | 'offset_sheet_paper'
  | 'offset_web_paper'
  | 'offset_uv_film'
  // Digital
  | 'digital_indigo_paper'
  | 'digital_indigo_film'
  | 'digital_inkjet_uv'
  | 'digital_inkjet_water'
  | 'digital_toner'
  // Thermal
  | 'thermal_direct_203'
  | 'thermal_direct_300'
  | 'thermal_direct_600'
  | 'thermal_transfer_wax'
  | 'thermal_transfer_resin'
  | 'thermal_transfer_waxresin'
  // Special
  | 'gravure_film'
  | 'screen_special'

export interface PrintingProfile {
  id: PrintingProfileId
  name: string
  label: string
  description: string
  
  // Technické parametre procesu
  process: PrintProcess
  processLabel: string
  
  // Materiál
  substrate: SubstrateCategory
  substrateLabel: string
  substrateSurface: 'GLOSS' | 'MATTE' | 'SATIN' | 'UNCOATED' | 'METALLIC'
  
  // Aplikačné oblasti
  applications: ApplicationArea[]
  applicationLabel: string
  
  // Technické špecifikácie tlače
  lpiRange: { min: number; max: number } // lines per inch
  dpiNative: number // natívne DPI zariadenia
  colorCapability: 'MONO' | 'SPOT' | 'CMYK' | 'CMYK_SPOT' | 'EXTENDED_GAMUT'
  
  // Odporúčané parametre pre čiarové kódy
  recommended: {
    xDimMm: number
    quietZoneMm: number
    magnificationPercent: number
    barWidthReductionMm: number
  }
  
  // Rozsahy povolených hodnôt
  limits: {
    xDimMmMin: number
    xDimMmMax: number
    magnificationMin: number
    magnificationMax: number
    bwrMmMin: number
    bwrMmMax: number
  }
  
  // Poznámky a varovania
  notes: string[]
  warnings: string[]
  
  // ISO/GS1 compliance level
  gs1ComplianceLevel: 'A' | 'B' | 'C' | 'D' | 'CUSTOM'
}

// ============================================
// FLEXO UV PROFILY
// ============================================

const flexoUvPaperStandard: PrintingProfile = {
  id: 'flexo_uv_paper_standard',
  name: 'Flexo UV · Papier štandard',
  label: 'Flexo UV',
  description: 'Štandardná flexotlač UV na natieraný papier, 133 lpi',
  
  process: 'FLEXO_UV',
  processLabel: 'Flexografia UV',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier',
  substrateSurface: 'GLOSS',
  
  applications: ['FOOD_BEVERAGE', 'RETAIL', 'COSMETICS'],
  applicationLabel: 'Potraviny · Retail · Kozmetika',
  
  lpiRange: { min: 120, max: 150 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.025,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.015,
    bwrMmMax: 0.040,
  },
  
  notes: [
    'Vhodné pre väčšinu retailových etikiet',
    'Dobrá reprodukcia CMYK + 2 spot farby',
    'Odporúčaná hrúbka štetkového valca 1.14mm',
  ],
  warnings: [
    'Pri vysokej vlhkosti kontrolovať registráciu',
  ],
  
  gs1ComplianceLevel: 'B',
}

const flexoUvPaperHighres: PrintingProfile = {
  id: 'flexo_uv_paper_highres',
  name: 'Flexo UV · Papier high-res',
  label: 'Flexo UV HD',
  description: 'Vysokorozlišovacia flexotlač UV, 175 lpi, prémiová kvalita',
  
  process: 'FLEXO_UV',
  processLabel: 'Flexografia UV HD',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier premium',
  substrateSurface: 'GLOSS',
  
  applications: ['COSMETICS', 'WINE_SPIRITS', 'PHARMA'],
  applicationLabel: 'Kozmetika · Víno · Pharma',
  
  lpiRange: { min: 150, max: 175 },
  dpiNative: 4000,
  colorCapability: 'EXTENDED_GAMUT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.020,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.010,
    bwrMmMax: 0.035,
  },
  
  notes: [
    'Prémiová kvalita pre náročné aplikácie',
    'Extended gamut (CMYKOGV)',
    'Flat-top dots pre lepšiu reprodukciu',
  ],
  warnings: [
    'Vyžaduje presné nastavenie aniloxu',
    'Vyššie náklady na predtlačovú prípravu',
  ],
  
  gs1ComplianceLevel: 'A',
}

const flexoUvFilmPE: PrintingProfile = {
  id: 'flexo_uv_film_pe',
  name: 'Flexo UV · PE fólia',
  label: 'Flexo UV PE',
  description: 'Flexotlač UV na polyetylénové fólie',
  
  process: 'FLEXO_UV',
  processLabel: 'Flexografia UV',
  
  substrate: 'FILM_PE',
  substrateLabel: 'PE fólia',
  substrateSurface: 'MATTE',
  
  applications: ['FOOD_BEVERAGE', 'FROZEN', 'CHEMICAL'],
  applicationLabel: 'Potraviny · Mrazené · Chemické',
  
  lpiRange: { min: 100, max: 133 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.350,
    quietZoneMm: 4.0,
    magnificationPercent: 110,
    barWidthReductionMm: 0.035,
  },
  
  limits: {
    xDimMmMin: 0.280,
    xDimMmMax: 0.660,
    magnificationMin: 85,
    magnificationMax: 200,
    bwrMmMin: 0.025,
    bwrMmMax: 0.050,
  },
  
  notes: [
    'Vyšší BWR kvôli rozťahovaniu fólie',
    'Corona treatment vyžadovaný',
    'Vhodné pre squeeze tube etikety',
  ],
  warnings: [
    'Fólia sa môže rozťahovať - kontrola rozmerov',
    'Prísnejšie požiadavky na registráciu',
  ],
  
  gs1ComplianceLevel: 'B',
}

const flexoUvFilmPPBopp: PrintingProfile = {
  id: 'flexo_uv_film_pp_bopp',
  name: 'Flexo UV · PP/BOPP fólia',
  label: 'Flexo UV PP',
  description: 'Flexotlač UV na polypropylénové a BOPP fólie',
  
  process: 'FLEXO_UV',
  processLabel: 'Flexografia UV',
  
  substrate: 'FILM_BOPP',
  substrateLabel: 'PP / BOPP fólia',
  substrateSurface: 'GLOSS',
  
  applications: ['FOOD_BEVERAGE', 'COSMETICS', 'RETAIL'],
  applicationLabel: 'Potraviny · Kozmetika · Retail',
  
  lpiRange: { min: 120, max: 150 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.030,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.020,
    bwrMmMax: 0.045,
  },
  
  notes: [
    'Najčastejší materiál pre potravinové etikety',
    'Výborná rozmerová stabilita',
    'Možnosť metalizovanej verzie',
  ],
  warnings: [
    'Pri clear-on-clear riešeniach zvýšiť kontrast',
  ],
  
  gs1ComplianceLevel: 'A',
}

const flexoUvFilmPET: PrintingProfile = {
  id: 'flexo_uv_film_pet',
  name: 'Flexo UV · PET fólia',
  label: 'Flexo UV PET',
  description: 'Flexotlač UV na polyesterové fólie (PET)',
  
  process: 'FLEXO_UV',
  processLabel: 'Flexografia UV',
  
  substrate: 'FILM_PET',
  substrateLabel: 'PET fólia',
  substrateSurface: 'GLOSS',
  
  applications: ['COSMETICS', 'PHARMA', 'CHEMICAL'],
  applicationLabel: 'Kozmetika · Pharma · Chemické',
  
  lpiRange: { min: 133, max: 175 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.025,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.015,
    bwrMmMax: 0.040,
  },
  
  notes: [
    'Výborná chemická odolnosť',
    'Vysoká transparentnosť',
    'Vhodné pre náročné prostredia',
  ],
  warnings: [],
  
  gs1ComplianceLevel: 'A',
}

const flexoUvShrink: PrintingProfile = {
  id: 'flexo_uv_shrink',
  name: 'Flexo UV · Shrink sleeve',
  label: 'Flexo Shrink',
  description: 'Flexotlač UV pre zmršťovacie rukávy (shrink sleeve)',
  
  process: 'FLEXO_UV',
  processLabel: 'Flexografia UV',
  
  substrate: 'SHRINK_SLEEVE',
  substrateLabel: 'Shrink sleeve (PET-G, OPS)',
  substrateSurface: 'GLOSS',
  
  applications: ['FOOD_BEVERAGE', 'DAIRY', 'COSMETICS'],
  applicationLabel: 'Nápoje · Mliečne · Kozmetika',
  
  lpiRange: { min: 133, max: 150 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.400,
    quietZoneMm: 5.0,
    magnificationPercent: 120,
    barWidthReductionMm: 0.020,
  },
  
  limits: {
    xDimMmMin: 0.330,
    xDimMmMax: 0.660,
    magnificationMin: 100,
    magnificationMax: 200,
    bwrMmMin: 0.010,
    bwrMmMax: 0.035,
  },
  
  notes: [
    'Distorzia kompenzovaná v predtlači',
    'Čiarový kód umiestniť do oblasti s min. zmrštením',
    'Vertikálna orientácia preferovaná',
  ],
  warnings: [
    'POVINNÉ: Výpočet distorzie pred tlačou',
    'Čiarový kód NIKDY v oblasti vysokého zmrštenia',
  ],
  
  gs1ComplianceLevel: 'B',
}

// ============================================
// FLEXO WATER-BASED PROFILY
// ============================================

const flexoWaterPaper: PrintingProfile = {
  id: 'flexo_water_paper',
  name: 'Flexo Water · Papier',
  label: 'Flexo Water',
  description: 'Flexotlač vodou riediteľnými farbami na papier',
  
  process: 'FLEXO_WATER',
  processLabel: 'Flexografia vodová',
  
  substrate: 'PAPER_UNCOATED',
  substrateLabel: 'Nenatieraný papier',
  substrateSurface: 'UNCOATED',
  
  applications: ['FOOD_BEVERAGE', 'LOGISTICS', 'RETAIL'],
  applicationLabel: 'Potraviny · Logistika · Retail',
  
  lpiRange: { min: 100, max: 133 },
  dpiNative: 2540,
  colorCapability: 'CMYK',
  
  recommended: {
    xDimMm: 0.350,
    quietZoneMm: 4.0,
    magnificationPercent: 110,
    barWidthReductionMm: 0.020,
  },
  
  limits: {
    xDimMmMin: 0.280,
    xDimMmMax: 0.660,
    magnificationMin: 85,
    magnificationMax: 200,
    bwrMmMin: 0.010,
    bwrMmMax: 0.035,
  },
  
  notes: [
    'Ekologická voľba - vodové farby',
    'Vhodné pre priamy kontakt s potravinami',
    'Nižšia cena v porovnaní s UV',
  ],
  warnings: [
    'Nie je vhodné pre vlhké prostredie',
    'Nižšia odolnosť voči oderu',
  ],
  
  gs1ComplianceLevel: 'B',
}

const flexoWaterCardboard: PrintingProfile = {
  id: 'flexo_water_cardboard',
  name: 'Flexo Water · Kartón',
  label: 'Flexo Kartón',
  description: 'Flexotlač vodovými farbami na kartón/vlnitú lepenku',
  
  process: 'FLEXO_WATER',
  processLabel: 'Flexografia vodová',
  
  substrate: 'CARDBOARD',
  substrateLabel: 'Kartón / Vlnitá lepenka',
  substrateSurface: 'UNCOATED',
  
  applications: ['LOGISTICS', 'INDUSTRIAL', 'RETAIL'],
  applicationLabel: 'Logistika · Priemysel · Retail',
  
  lpiRange: { min: 65, max: 100 },
  dpiNative: 2540,
  colorCapability: 'SPOT',
  
  recommended: {
    xDimMm: 0.500,
    quietZoneMm: 5.0,
    magnificationPercent: 150,
    barWidthReductionMm: 0.015,
  },
  
  limits: {
    xDimMmMin: 0.400,
    xDimMmMax: 1.000,
    magnificationMin: 120,
    magnificationMax: 300,
    bwrMmMin: 0.005,
    bwrMmMax: 0.030,
  },
  
  notes: [
    'ITF-14 preferovaný pre kartóny',
    'Väčšia magnifikácia kvôli povrchovej štruktúre',
    'Použiť hrubšie bary',
  ],
  warnings: [
    'Porézny povrch - väčší dot gain',
    'Kontrolovať kvalitu na vzorkách',
  ],
  
  gs1ComplianceLevel: 'C',
}

// ============================================
// OFFSET PROFILY
// ============================================

const offsetSheetPaper: PrintingProfile = {
  id: 'offset_sheet_paper',
  name: 'Offset · Hárková',
  label: 'Offset Hárok',
  description: 'Hárková ofsetová tlač na natieraný papier',
  
  process: 'OFFSET_SHEET',
  processLabel: 'Offset hárková',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier',
  substrateSurface: 'GLOSS',
  
  applications: ['WINE_SPIRITS', 'COSMETICS', 'PHARMA'],
  applicationLabel: 'Víno · Kozmetika · Pharma',
  
  lpiRange: { min: 150, max: 200 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.015,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.005,
    bwrMmMax: 0.025,
  },
  
  notes: [
    'Najvyššia kvalita tlače pre etikety',
    'Vhodné pre prémiové produkty',
    'Možnosť špeciálnych techník (hot foil, emboss)',
  ],
  warnings: [
    'Vyššia cena pri malých nákladoch',
    'Dlhší čas prípravy',
  ],
  
  gs1ComplianceLevel: 'A',
}

const offsetWebPaper: PrintingProfile = {
  id: 'offset_web_paper',
  name: 'Offset · Rotačná',
  label: 'Offset Rotačná',
  description: 'Rotačná ofsetová tlač na papierový pás',
  
  process: 'OFFSET_WEB',
  processLabel: 'Offset rotačná',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier',
  substrateSurface: 'SATIN',
  
  applications: ['PHARMA', 'FOOD_BEVERAGE', 'RETAIL'],
  applicationLabel: 'Pharma · Potraviny · Retail',
  
  lpiRange: { min: 133, max: 175 },
  dpiNative: 2540,
  colorCapability: 'CMYK',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.018,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.010,
    bwrMmMax: 0.030,
  },
  
  notes: [
    'Ekonomická voľba pre vysoké náklady',
    'Konzistentná kvalita',
    'Rýchla produkcia',
  ],
  warnings: [
    'Minimálny objem zákazky',
  ],
  
  gs1ComplianceLevel: 'A',
}

const offsetUvFilm: PrintingProfile = {
  id: 'offset_uv_film',
  name: 'Offset UV · Fólia',
  label: 'Offset UV',
  description: 'UV ofsetová tlač na syntetické materiály',
  
  process: 'OFFSET_UV',
  processLabel: 'Offset UV',
  
  substrate: 'SYNTHETIC_YUPO',
  substrateLabel: 'Syntetický papier (Yupo)',
  substrateSurface: 'MATTE',
  
  applications: ['CHEMICAL', 'INDUSTRIAL', 'COSMETICS'],
  applicationLabel: 'Chemické · Priemysel · Kozmetika',
  
  lpiRange: { min: 150, max: 175 },
  dpiNative: 2540,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.012,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.005,
    bwrMmMax: 0.020,
  },
  
  notes: [
    'Výborná priľnavosť na syntetiku',
    'Vysoká odolnosť voči chemikáliám',
    'Vhodné pre GHS etikety',
  ],
  warnings: [],
  
  gs1ComplianceLevel: 'A',
}

// ============================================
// DIGITÁLNA TLAČ PROFILY
// ============================================

const digitalIndigoPaper: PrintingProfile = {
  id: 'digital_indigo_paper',
  name: 'HP Indigo · Papier',
  label: 'Indigo Papier',
  description: 'HP Indigo elektrofotografická tlač na papier',
  
  process: 'DIGITAL_INDIGO',
  processLabel: 'HP Indigo',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier',
  substrateSurface: 'GLOSS',
  
  applications: ['WINE_SPIRITS', 'COSMETICS', 'FOOD_BEVERAGE'],
  applicationLabel: 'Víno · Kozmetika · Potraviny',
  
  lpiRange: { min: 175, max: 230 },
  dpiNative: 812,
  colorCapability: 'EXTENDED_GAMUT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.008,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.000,
    bwrMmMax: 0.015,
  },
  
  notes: [
    'Najvyššia kvalita digitálnej tlače',
    'Ofsetová kvalita bez minimálneho nákladu',
    'Plná variabilita dát (VDP)',
    'IndiChrome - rozšírený farebný rozsah',
  ],
  warnings: [
    'Vyššia cena za kus',
  ],
  
  gs1ComplianceLevel: 'A',
}

const digitalIndigoFilm: PrintingProfile = {
  id: 'digital_indigo_film',
  name: 'HP Indigo · Fólia',
  label: 'Indigo Fólia',
  description: 'HP Indigo elektrofotografická tlač na fólie',
  
  process: 'DIGITAL_INDIGO',
  processLabel: 'HP Indigo',
  
  substrate: 'FILM_PP',
  substrateLabel: 'PP fólia',
  substrateSurface: 'GLOSS',
  
  applications: ['COSMETICS', 'PHARMA', 'FOOD_BEVERAGE'],
  applicationLabel: 'Kozmetika · Pharma · Potraviny',
  
  lpiRange: { min: 175, max: 230 },
  dpiNative: 812,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.010,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.000,
    bwrMmMax: 0.018,
  },
  
  notes: [
    'ElectroInk priľnavosť na fólie',
    'Priming vyžadovaný pre niektoré substráty',
    'Clear-on-clear možné s white ink',
  ],
  warnings: [
    'Kontrolovať adhéziu na konkrétnom substráte',
  ],
  
  gs1ComplianceLevel: 'A',
}

const digitalInkjetUv: PrintingProfile = {
  id: 'digital_inkjet_uv',
  name: 'Inkjet UV · Univerzálny',
  label: 'Inkjet UV',
  description: 'UV inkjetová tlač na rôzne substráty',
  
  process: 'DIGITAL_INKJET_UV',
  processLabel: 'Inkjet UV',
  
  substrate: 'FILM_VINYL',
  substrateLabel: 'Vinyl / Fólia',
  substrateSurface: 'GLOSS',
  
  applications: ['INDUSTRIAL', 'LOGISTICS', 'RETAIL'],
  applicationLabel: 'Priemysel · Logistika · Retail',
  
  lpiRange: { min: 100, max: 150 },
  dpiNative: 1200,
  colorCapability: 'CMYK',
  
  recommended: {
    xDimMm: 0.350,
    quietZoneMm: 4.0,
    magnificationPercent: 110,
    barWidthReductionMm: 0.015,
  },
  
  limits: {
    xDimMmMin: 0.280,
    xDimMmMax: 0.660,
    magnificationMin: 85,
    magnificationMax: 200,
    bwrMmMin: 0.005,
    bwrMmMax: 0.025,
  },
  
  notes: [
    'Flexibilná voľba pre rôzne materiály',
    'Okamžité sušenie UV lampou',
    'Dobrá odolnosť voči UV žiareniu',
  ],
  warnings: [
    'Nižšia rozlíšovacia schopnosť ako Indigo',
  ],
  
  gs1ComplianceLevel: 'B',
}

const digitalInkjetWater: PrintingProfile = {
  id: 'digital_inkjet_water',
  name: 'Inkjet Water · Papier',
  label: 'Inkjet Water',
  description: 'Vodný inkjet na papierové etikety',
  
  process: 'DIGITAL_INKJET_WATER',
  processLabel: 'Inkjet vodný',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Inkjet natieraný papier',
  substrateSurface: 'MATTE',
  
  applications: ['FOOD_BEVERAGE', 'LOGISTICS', 'RETAIL'],
  applicationLabel: 'Potraviny · Logistika · Retail',
  
  lpiRange: { min: 100, max: 133 },
  dpiNative: 1200,
  colorCapability: 'CMYK',
  
  recommended: {
    xDimMm: 0.350,
    quietZoneMm: 4.0,
    magnificationPercent: 110,
    barWidthReductionMm: 0.012,
  },
  
  limits: {
    xDimMmMin: 0.280,
    xDimMmMax: 0.660,
    magnificationMin: 85,
    magnificationMax: 200,
    bwrMmMin: 0.000,
    bwrMmMax: 0.020,
  },
  
  notes: [
    'Ekonomická voľba pre kratšie náklady',
    'Vhodné pre potravinový kontakt',
    'Memjet, Epson ColorWorks, atď.',
  ],
  warnings: [
    'Potrebný špeciálny inkjet papier',
    'Nižšia odolnosť voči vlhkosti',
  ],
  
  gs1ComplianceLevel: 'B',
}

const digitalToner: PrintingProfile = {
  id: 'digital_toner',
  name: 'Toner / Laser',
  label: 'Toner',
  description: 'Laserová / tonerová tlač na papier',
  
  process: 'DIGITAL_TONER',
  processLabel: 'Toner / Laser',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Laserový papier',
  substrateSurface: 'MATTE',
  
  applications: ['LOGISTICS', 'INDUSTRIAL', 'RETAIL'],
  applicationLabel: 'Logistika · Priemysel · Retail',
  
  lpiRange: { min: 85, max: 133 },
  dpiNative: 1200,
  colorCapability: 'CMYK',
  
  recommended: {
    xDimMm: 0.380,
    quietZoneMm: 4.5,
    magnificationPercent: 115,
    barWidthReductionMm: 0.010,
  },
  
  limits: {
    xDimMmMin: 0.300,
    xDimMmMax: 0.660,
    magnificationMin: 90,
    magnificationMax: 200,
    bwrMmMin: 0.000,
    bwrMmMax: 0.020,
  },
  
  notes: [
    'Dostupná technológia',
    'Vhodné pre interné etikety',
    'Xerox, Konica Minolta, Canon',
  ],
  warnings: [
    'Toner sa môže odlupovať pri ohybe',
    'Nie pre náročné prostredia',
  ],
  
  gs1ComplianceLevel: 'B',
}

// ============================================
// TERMOTLAČ PROFILY
// ============================================

const thermalDirect203: PrintingProfile = {
  id: 'thermal_direct_203',
  name: 'Thermal Direct · 203 DPI',
  label: 'TD 203',
  description: 'Priama termotlač 203 DPI',
  
  process: 'THERMAL_DIRECT',
  processLabel: 'Direct Thermal 203',
  
  substrate: 'PAPER_THERMAL',
  substrateLabel: 'Termopapier',
  substrateSurface: 'MATTE',
  
  applications: ['LOGISTICS', 'RETAIL', 'FOOD_BEVERAGE'],
  applicationLabel: 'Logistika · Retail · Potraviny',
  
  lpiRange: { min: 0, max: 0 },
  dpiNative: 203,
  colorCapability: 'MONO',
  
  recommended: {
    xDimMm: 0.500,
    quietZoneMm: 5.0,
    magnificationPercent: 150,
    barWidthReductionMm: 0.000,
  },
  
  limits: {
    xDimMmMin: 0.380,
    xDimMmMax: 1.000,
    magnificationMin: 115,
    magnificationMax: 300,
    bwrMmMin: 0.000,
    bwrMmMax: 0.010,
  },
  
  notes: [
    'Bez pásky - nižšie prevádzkové náklady',
    'Ideálne pre krátkodobé etikety',
    'Zebra, TSC, Honeywell',
  ],
  warnings: [
    'Etikety sčernajú teplom/svetlom',
    'Životnosť max. 6 mesiacov',
    'Nie pre pharma/archivné účely',
  ],
  
  gs1ComplianceLevel: 'C',
}

const thermalDirect300: PrintingProfile = {
  id: 'thermal_direct_300',
  name: 'Thermal Direct · 300 DPI',
  label: 'TD 300',
  description: 'Priama termotlač 300 DPI',
  
  process: 'THERMAL_DIRECT',
  processLabel: 'Direct Thermal 300',
  
  substrate: 'PAPER_THERMAL',
  substrateLabel: 'Termopapier',
  substrateSurface: 'MATTE',
  
  applications: ['LOGISTICS', 'RETAIL', 'PHARMA'],
  applicationLabel: 'Logistika · Retail · Pharma',
  
  lpiRange: { min: 0, max: 0 },
  dpiNative: 300,
  colorCapability: 'MONO',
  
  recommended: {
    xDimMm: 0.380,
    quietZoneMm: 4.0,
    magnificationPercent: 115,
    barWidthReductionMm: 0.000,
  },
  
  limits: {
    xDimMmMin: 0.300,
    xDimMmMax: 0.800,
    magnificationMin: 90,
    magnificationMax: 240,
    bwrMmMin: 0.000,
    bwrMmMax: 0.008,
  },
  
  notes: [
    'Vyššia kvalita pre menšie kódy',
    'Vhodné pre DataMatrix',
    'Lepšia čitateľnosť ako 203 DPI',
  ],
  warnings: [
    'Etikety sčernajú teplom/svetlom',
    'Vyššia cena tlačovej hlavy',
  ],
  
  gs1ComplianceLevel: 'B',
}

const thermalDirect600: PrintingProfile = {
  id: 'thermal_direct_600',
  name: 'Thermal Direct · 600 DPI',
  label: 'TD 600',
  description: 'Priama termotlač 600 DPI - vysoké rozlíšenie',
  
  process: 'THERMAL_DIRECT',
  processLabel: 'Direct Thermal 600',
  
  substrate: 'PAPER_THERMAL',
  substrateLabel: 'Termopapier HD',
  substrateSurface: 'MATTE',
  
  applications: ['PHARMA', 'COSMETICS', 'LOGISTICS'],
  applicationLabel: 'Pharma · Kozmetika · Logistika',
  
  lpiRange: { min: 0, max: 0 },
  dpiNative: 600,
  colorCapability: 'MONO',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.000,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.000,
    bwrMmMax: 0.005,
  },
  
  notes: [
    'Najvyššia kvalita termotlače',
    'Vhodné pre malé 2D kódy',
    'Vynikajúca pre pharma serialization',
  ],
  warnings: [
    'Drahšia tlačová hlava',
    'Pomalšia rýchlosť tlače',
  ],
  
  gs1ComplianceLevel: 'A',
}

const thermalTransferWax: PrintingProfile = {
  id: 'thermal_transfer_wax',
  name: 'Thermal Transfer · Wax',
  label: 'TT Wax',
  description: 'Termotransfer s voskovým ribbonom',
  
  process: 'THERMAL_TRANSFER',
  processLabel: 'Thermal Transfer Wax',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier',
  substrateSurface: 'MATTE',
  
  applications: ['LOGISTICS', 'RETAIL', 'FOOD_BEVERAGE'],
  applicationLabel: 'Logistika · Retail · Potraviny',
  
  lpiRange: { min: 0, max: 0 },
  dpiNative: 300,
  colorCapability: 'MONO',
  
  recommended: {
    xDimMm: 0.380,
    quietZoneMm: 4.0,
    magnificationPercent: 115,
    barWidthReductionMm: 0.005,
  },
  
  limits: {
    xDimMmMin: 0.300,
    xDimMmMax: 0.800,
    magnificationMin: 90,
    magnificationMax: 240,
    bwrMmMin: 0.000,
    bwrMmMax: 0.015,
  },
  
  notes: [
    'Najlacnejší ribbon',
    'Vhodné pre papierové etikety',
    'Dobrá čitateľnosť',
  ],
  warnings: [
    'Nízka odolnosť voči oderu',
    'Nie pre fólie',
  ],
  
  gs1ComplianceLevel: 'B',
}

const thermalTransferResin: PrintingProfile = {
  id: 'thermal_transfer_resin',
  name: 'Thermal Transfer · Resin',
  label: 'TT Resin',
  description: 'Termotransfer s živicovým ribbonom na fólie',
  
  process: 'THERMAL_TRANSFER',
  processLabel: 'Thermal Transfer Resin',
  
  substrate: 'FILM_PP',
  substrateLabel: 'PP / PE / PET fólia',
  substrateSurface: 'GLOSS',
  
  applications: ['CHEMICAL', 'PHARMA', 'INDUSTRIAL'],
  applicationLabel: 'Chemické · Pharma · Priemysel',
  
  lpiRange: { min: 0, max: 0 },
  dpiNative: 300,
  colorCapability: 'MONO',
  
  recommended: {
    xDimMm: 0.350,
    quietZoneMm: 4.0,
    magnificationPercent: 110,
    barWidthReductionMm: 0.008,
  },
  
  limits: {
    xDimMmMin: 0.280,
    xDimMmMax: 0.700,
    magnificationMin: 85,
    magnificationMax: 210,
    bwrMmMin: 0.000,
    bwrMmMax: 0.018,
  },
  
  notes: [
    'Výborná odolnosť voči chemikáliám',
    'Vysoká odolnosť voči oderu',
    'Vhodné pre GHS etikety',
  ],
  warnings: [
    'Drahší ribbon',
    'Vyžaduje správne nastavenie teploty',
  ],
  
  gs1ComplianceLevel: 'A',
}

const thermalTransferWaxResin: PrintingProfile = {
  id: 'thermal_transfer_waxresin',
  name: 'Thermal Transfer · Wax/Resin',
  label: 'TT Wax/Resin',
  description: 'Termotransfer s kombinovaným ribbonom',
  
  process: 'THERMAL_TRANSFER',
  processLabel: 'Thermal Transfer Wax/Resin',
  
  substrate: 'PAPER_COATED',
  substrateLabel: 'Natieraný papier / Syntetika',
  substrateSurface: 'SATIN',
  
  applications: ['LOGISTICS', 'PHARMA', 'RETAIL'],
  applicationLabel: 'Logistika · Pharma · Retail',
  
  lpiRange: { min: 0, max: 0 },
  dpiNative: 300,
  colorCapability: 'MONO',
  
  recommended: {
    xDimMm: 0.360,
    quietZoneMm: 4.0,
    magnificationPercent: 110,
    barWidthReductionMm: 0.006,
  },
  
  limits: {
    xDimMmMin: 0.290,
    xDimMmMax: 0.750,
    magnificationMin: 88,
    magnificationMax: 225,
    bwrMmMin: 0.000,
    bwrMmMax: 0.016,
  },
  
  notes: [
    'Univerzálny kompromis',
    'Dobrá odolnosť za rozumnú cenu',
    'Vhodné pre polomatné papiere',
  ],
  warnings: [],
  
  gs1ComplianceLevel: 'B',
}

// ============================================
// ŠPECIÁLNE PROFILY
// ============================================

const gravureFilm: PrintingProfile = {
  id: 'gravure_film',
  name: 'Gravúra · Flexibilné obaly',
  label: 'Gravúra',
  description: 'Hĺbkotlač pre flexibilné obaly a etikety',
  
  process: 'GRAVURE',
  processLabel: 'Rotogravure',
  
  substrate: 'FILM_BOPP',
  substrateLabel: 'BOPP / PET / Lamináty',
  substrateSurface: 'GLOSS',
  
  applications: ['FOOD_BEVERAGE', 'COSMETICS', 'PHARMA'],
  applicationLabel: 'Potraviny · Kozmetika · Pharma',
  
  lpiRange: { min: 150, max: 200 },
  dpiNative: 3000,
  colorCapability: 'CMYK_SPOT',
  
  recommended: {
    xDimMm: 0.330,
    quietZoneMm: 3.63,
    magnificationPercent: 100,
    barWidthReductionMm: 0.010,
  },
  
  limits: {
    xDimMmMin: 0.264,
    xDimMmMax: 0.660,
    magnificationMin: 80,
    magnificationMax: 200,
    bwrMmMin: 0.005,
    bwrMmMax: 0.020,
  },
  
  notes: [
    'Najvyššia kvalita pre dlhé náklady',
    'Výborná konzistencia farieb',
    'Vhodné pre fotografickú kvalitu',
  ],
  warnings: [
    'Vysoké náklady na prípravu valcov',
    'Len pre veľké náklady (100k+)',
  ],
  
  gs1ComplianceLevel: 'A',
}

const screenSpecial: PrintingProfile = {
  id: 'screen_special',
  name: 'Sieťotlač · Špeciálne',
  label: 'Sieťotlač',
  description: 'Sieťotlač pre špeciálne efekty a hrubé vrstvy',
  
  process: 'SCREEN',
  processLabel: 'Sieťotlač / Screen',
  
  substrate: 'FILM_PVC',
  substrateLabel: 'PVC / Vinyl / Špeciálne',
  substrateSurface: 'MATTE',
  
  applications: ['INDUSTRIAL', 'CHEMICAL', 'COSMETICS'],
  applicationLabel: 'Priemysel · Chemické · Kozmetika',
  
  lpiRange: { min: 65, max: 100 },
  dpiNative: 1200,
  colorCapability: 'SPOT',
  
  recommended: {
    xDimMm: 0.500,
    quietZoneMm: 6.0,
    magnificationPercent: 150,
    barWidthReductionMm: 0.020,
  },
  
  limits: {
    xDimMmMin: 0.400,
    xDimMmMax: 1.000,
    magnificationMin: 120,
    magnificationMax: 300,
    bwrMmMin: 0.010,
    bwrMmMax: 0.040,
  },
  
  notes: [
    'Hrubé vrstvy farby',
    'Špeciálne efekty (UV lak, puff)',
    'Výborná adhézia na náročné substráty',
  ],
  warnings: [
    'Nižšia rozlišovacia schopnosť',
    'Väčšie minimálne prvky',
  ],
  
  gs1ComplianceLevel: 'C',
}

// ============================================
// EXPORT
// ============================================

export const PRINTING_PROFILES: PrintingProfile[] = [
  // Flexo UV
  flexoUvPaperStandard,
  flexoUvPaperHighres,
  flexoUvFilmPE,
  flexoUvFilmPPBopp,
  flexoUvFilmPET,
  flexoUvShrink,
  // Flexo Water
  flexoWaterPaper,
  flexoWaterCardboard,
  // Offset
  offsetSheetPaper,
  offsetWebPaper,
  offsetUvFilm,
  // Digital
  digitalIndigoPaper,
  digitalIndigoFilm,
  digitalInkjetUv,
  digitalInkjetWater,
  digitalToner,
  // Thermal
  thermalDirect203,
  thermalDirect300,
  thermalDirect600,
  thermalTransferWax,
  thermalTransferResin,
  thermalTransferWaxResin,
  // Special
  gravureFilm,
  screenSpecial,
]

// Pomocné funkcie

export const getDefaultProfile = (): PrintingProfile => flexoUvPaperStandard

export const getProfileById = (id: PrintingProfileId): PrintingProfile | undefined =>
  PRINTING_PROFILES.find(p => p.id === id)

export const getProfilesByProcess = (process: PrintProcess): PrintingProfile[] =>
  PRINTING_PROFILES.filter(p => p.process === process)

export const getProfilesBySubstrate = (substrate: SubstrateCategory): PrintingProfile[] =>
  PRINTING_PROFILES.filter(p => p.substrate === substrate)

export const getProfilesByApplication = (app: ApplicationArea): PrintingProfile[] =>
  PRINTING_PROFILES.filter(p => p.applications.includes(app))

// Zoskupenie pre UI
export const PROFILE_GROUPS = [
  {
    id: 'flexo',
    label: 'Flexografia',
    profiles: [
      flexoUvPaperStandard,
      flexoUvPaperHighres,
      flexoUvFilmPE,
      flexoUvFilmPPBopp,
      flexoUvFilmPET,
      flexoUvShrink,
      flexoWaterPaper,
      flexoWaterCardboard,
    ],
  },
  {
    id: 'offset',
    label: 'Offset',
    profiles: [offsetSheetPaper, offsetWebPaper, offsetUvFilm],
  },
  {
    id: 'digital',
    label: 'Digitálna tlač',
    profiles: [
      digitalIndigoPaper,
      digitalIndigoFilm,
      digitalInkjetUv,
      digitalInkjetWater,
      digitalToner,
    ],
  },
  {
    id: 'thermal',
    label: 'Termotlač',
    profiles: [
      thermalDirect203,
      thermalDirect300,
      thermalDirect600,
      thermalTransferWax,
      thermalTransferResin,
      thermalTransferWaxResin,
    ],
  },
  {
    id: 'special',
    label: 'Špeciálne',
    profiles: [gravureFilm, screenSpecial],
  },
]

export default PRINTING_PROFILES




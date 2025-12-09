/**
 * GPCS CodeStudio - Material Library
 * 
 * Comprehensive materials for label printing and folding cartons
 */

import type { MaterialSpec } from './DieLineTypes'

export class MaterialLibrary {
  private materials: MaterialSpec[] = []

  constructor() {
    this.initializeDefaults()
  }

  private initializeDefaults() {
    this.materials = [
      // ============================================
      // PAPER LABELS - Papierové etikety
      // ============================================
      {
        id: 'PAPER_GLOSS_80',
        name: 'Lesklý papier 80g',
        type: 'LABEL_STOCK',
        caliper: 0.080,
        grainDirection: 'VERTICAL',
        weightGsm: 80,
        transparency: 0
      },
      {
        id: 'PAPER_GLOSS_90',
        name: 'Lesklý papier 90g',
        type: 'LABEL_STOCK',
        caliper: 0.095,
        grainDirection: 'VERTICAL',
        weightGsm: 90,
        transparency: 0
      },
      {
        id: 'PAPER_MATTE_80',
        name: 'Matný papier 80g',
        type: 'LABEL_STOCK',
        caliper: 0.085,
        grainDirection: 'VERTICAL',
        weightGsm: 80,
        transparency: 0
      },
      {
        id: 'PAPER_THERMAL',
        name: 'Termopapier (priama termotlač)',
        type: 'LABEL_STOCK',
        caliper: 0.075,
        grainDirection: 'NONE',
        weightGsm: 75,
        transparency: 0
      },
      {
        id: 'PAPER_THERMAL_TOP',
        name: 'Termopapier TOP (ochranná vrstva)',
        type: 'LABEL_STOCK',
        caliper: 0.080,
        grainDirection: 'NONE',
        weightGsm: 80,
        transparency: 0
      },
      {
        id: 'PAPER_VELLUM',
        name: 'Vellum papier (nekrídový)',
        type: 'LABEL_STOCK',
        caliper: 0.090,
        grainDirection: 'VERTICAL',
        weightGsm: 85,
        transparency: 0
      },
      {
        id: 'PAPER_KRAFT',
        name: 'Kraft papier (prírodný)',
        type: 'LABEL_STOCK',
        caliper: 0.100,
        grainDirection: 'VERTICAL',
        weightGsm: 90,
        transparency: 0
      },
      {
        id: 'PAPER_RECYCLED',
        name: 'Recyklovaný papier',
        type: 'LABEL_STOCK',
        caliper: 0.095,
        grainDirection: 'VERTICAL',
        weightGsm: 85,
        transparency: 0
      },

      // ============================================
      // WINE & PREMIUM LABELS - Vínne a prémiové etikety
      // ============================================
      {
        id: 'WINE_FELT',
        name: 'Vínna etiketa - plstená textúra',
        type: 'LABEL_STOCK',
        caliper: 0.140,
        grainDirection: 'VERTICAL',
        weightGsm: 90,
        transparency: 0,
        frontTexture: 'felt'
      },
      {
        id: 'WINE_LINEN',
        name: 'Vínna etiketa - ľanová textúra',
        type: 'LABEL_STOCK',
        caliper: 0.150,
        grainDirection: 'VERTICAL',
        weightGsm: 100,
        transparency: 0,
        frontTexture: 'linen'
      },
      {
        id: 'WINE_LAID',
        name: 'Vínna etiketa - vergé (rebrovaná)',
        type: 'LABEL_STOCK',
        caliper: 0.135,
        grainDirection: 'VERTICAL',
        weightGsm: 95,
        transparency: 0,
        frontTexture: 'laid'
      },
      {
        id: 'WINE_COTTON',
        name: 'Bavlnený papier (100% cotton)',
        type: 'LABEL_STOCK',
        caliper: 0.160,
        grainDirection: 'VERTICAL',
        weightGsm: 110,
        transparency: 0
      },
      {
        id: 'WINE_TINTORETTO',
        name: 'Tintoretto (jemná textúra)',
        type: 'LABEL_STOCK',
        caliper: 0.145,
        grainDirection: 'VERTICAL',
        weightGsm: 95,
        transparency: 0
      },

      // ============================================
      // FILM LABELS - Fóliové etikety
      // ============================================
      {
        id: 'PP_WHITE_50',
        name: 'PP biely 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 45,
        transparency: 0
      },
      {
        id: 'PP_CLEAR_50',
        name: 'PP transparentný 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 45,
        transparency: 0.95
      },
      {
        id: 'PP_SILVER_50',
        name: 'PP strieborný (metalický) 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 48,
        transparency: 0
      },
      {
        id: 'PP_GOLD_50',
        name: 'PP zlatý (metalický) 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 48,
        transparency: 0
      },
      {
        id: 'PE_WHITE_80',
        name: 'PE biely 80µm',
        type: 'LABEL_STOCK',
        caliper: 0.080,
        grainDirection: 'NONE',
        weightGsm: 75,
        transparency: 0
      },
      {
        id: 'PE_CLEAR_80',
        name: 'PE transparentný 80µm',
        type: 'LABEL_STOCK',
        caliper: 0.080,
        grainDirection: 'NONE',
        weightGsm: 75,
        transparency: 0.90
      },
      {
        id: 'PET_WHITE_50',
        name: 'PET biely 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 70,
        transparency: 0
      },
      {
        id: 'PET_CLEAR_50',
        name: 'PET transparentný 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 70,
        transparency: 0.92
      },
      {
        id: 'PET_SILVER_50',
        name: 'PET strieborný (metalický) 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 72,
        transparency: 0
      },
      {
        id: 'BOPP_WHITE_25',
        name: 'BOPP biely 25µm (tenký)',
        type: 'LABEL_STOCK',
        caliper: 0.025,
        grainDirection: 'NONE',
        weightGsm: 23,
        transparency: 0
      },
      {
        id: 'BOPP_CLEAR_25',
        name: 'BOPP transparentný 25µm',
        type: 'LABEL_STOCK',
        caliper: 0.025,
        grainDirection: 'NONE',
        weightGsm: 23,
        transparency: 0.96
      },

      // ============================================
      // SPECIALTY LABELS - Špeciálne etikety
      // ============================================
      {
        id: 'VINYL_WHITE_100',
        name: 'Vinyl biely 100µm (outdoor)',
        type: 'LABEL_STOCK',
        caliper: 0.100,
        grainDirection: 'NONE',
        weightGsm: 95,
        transparency: 0
      },
      {
        id: 'VINYL_CLEAR_100',
        name: 'Vinyl transparentný 100µm',
        type: 'LABEL_STOCK',
        caliper: 0.100,
        grainDirection: 'NONE',
        weightGsm: 95,
        transparency: 0.88
      },
      {
        id: 'TYPAR',
        name: 'Tyvek® (syntetický papier)',
        type: 'LABEL_STOCK',
        caliper: 0.150,
        grainDirection: 'NONE',
        weightGsm: 55,
        transparency: 0
      },
      {
        id: 'VOID_SECURITY',
        name: 'VOID bezpečnostná fólia',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 50,
        transparency: 0
      },
      {
        id: 'DESTRUCTIBLE',
        name: 'Deštruktívna fólia (tamper-evident)',
        type: 'LABEL_STOCK',
        caliper: 0.030,
        grainDirection: 'NONE',
        weightGsm: 28,
        transparency: 0
      },
      {
        id: 'REMOVABLE',
        name: 'Odnímateľná etiketa (repositionable)',
        type: 'LABEL_STOCK',
        caliper: 0.085,
        grainDirection: 'VERTICAL',
        weightGsm: 80,
        transparency: 0
      },
      {
        id: 'FREEZER',
        name: 'Mrazuvzdorná etiketa (-40°C)',
        type: 'LABEL_STOCK',
        caliper: 0.090,
        grainDirection: 'NONE',
        weightGsm: 85,
        transparency: 0
      },
      {
        id: 'HIGH_TEMP',
        name: 'Vysokoteplotná etiketa (+150°C)',
        type: 'LABEL_STOCK',
        caliper: 0.075,
        grainDirection: 'NONE',
        weightGsm: 80,
        transparency: 0
      },
      {
        id: 'WATER_RESISTANT',
        name: 'Vodeodolná etiketa (syntetická)',
        type: 'LABEL_STOCK',
        caliper: 0.080,
        grainDirection: 'NONE',
        weightGsm: 75,
        transparency: 0
      },

      // ============================================
      // SHRINK SLEEVES - Zmršťovacie rukávy
      // ============================================
      {
        id: 'PETG_SHRINK_50',
        name: 'PETG zmršťovací rukáv 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 70,
        transparency: 0.90
      },
      {
        id: 'PVC_SHRINK_50',
        name: 'PVC zmršťovací rukáv 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 68,
        transparency: 0.88
      },
      {
        id: 'OPS_SHRINK_50',
        name: 'OPS zmršťovací rukáv 50µm',
        type: 'LABEL_STOCK',
        caliper: 0.050,
        grainDirection: 'NONE',
        weightGsm: 52,
        transparency: 0.92
      },

      // ============================================
      // FOLDING CARTON - Skladacie kartóny
      // ============================================
      {
        id: 'GC1_250',
        name: 'GC1 Chromokarton 250g',
        type: 'FOLDING_CARTON',
        caliper: 0.350,
        grainDirection: 'HORIZONTAL',
        weightGsm: 250,
        transparency: 0
      },
      {
        id: 'GC1_300',
        name: 'GC1 Chromokarton 300g',
        type: 'FOLDING_CARTON',
        caliper: 0.450,
        grainDirection: 'HORIZONTAL',
        weightGsm: 300,
        transparency: 0
      },
      {
        id: 'GC1_350',
        name: 'GC1 Chromokarton 350g',
        type: 'FOLDING_CARTON',
        caliper: 0.500,
        grainDirection: 'HORIZONTAL',
        weightGsm: 350,
        transparency: 0
      },
      {
        id: 'GC2_300',
        name: 'GC2 Chromokarton (obojstranný) 300g',
        type: 'FOLDING_CARTON',
        caliper: 0.420,
        grainDirection: 'HORIZONTAL',
        weightGsm: 300,
        transparency: 0
      },
      {
        id: 'GD2_350',
        name: 'GD2 Recyklovaný kartón 350g',
        type: 'FOLDING_CARTON',
        caliper: 0.520,
        grainDirection: 'HORIZONTAL',
        weightGsm: 350,
        transparency: 0
      },
      {
        id: 'SBS_300',
        name: 'SBS (Solid Bleached Sulfate) 300g',
        type: 'FOLDING_CARTON',
        caliper: 0.400,
        grainDirection: 'HORIZONTAL',
        weightGsm: 300,
        transparency: 0
      },

      // ============================================
      // CORRUGATED - Vlnitá lepenka
      // ============================================
      {
        id: 'MICRO_FLUTE',
        name: 'Micro vlna (F-flute)',
        type: 'CORRUGATED',
        caliper: 0.8,
        grainDirection: 'VERTICAL',
        weightGsm: 350,
        transparency: 0,
        fluteType: 'F'
      },
      {
        id: 'E_FLUTE',
        name: 'E-vlna',
        type: 'CORRUGATED',
        caliper: 1.5,
        grainDirection: 'VERTICAL',
        weightGsm: 450,
        transparency: 0,
        fluteType: 'E'
      },
      {
        id: 'B_FLUTE',
        name: 'B-vlna',
        type: 'CORRUGATED',
        caliper: 3.0,
        grainDirection: 'VERTICAL',
        weightGsm: 550,
        transparency: 0,
        fluteType: 'B'
      },
      {
        id: 'C_FLUTE',
        name: 'C-vlna',
        type: 'CORRUGATED',
        caliper: 4.0,
        grainDirection: 'VERTICAL',
        weightGsm: 650,
        transparency: 0,
        fluteType: 'C'
      }
    ]
  }

  /**
   * Get all available materials
   */
  public getAllMaterials(): MaterialSpec[] {
    return [...this.materials]
  }

  /**
   * Get material by ID
   */
  public getMaterialById(id: string): MaterialSpec | undefined {
    return this.materials.find(m => m.id === id)
  }

  /**
   * Get materials by type
   */
  public getMaterialsByType(type: MaterialSpec['type']): MaterialSpec[] {
    return this.materials.filter(m => m.type === type)
  }

  /**
   * Get label materials only
   */
  public getLabelMaterials(): MaterialSpec[] {
    return this.materials.filter(m => m.type === 'LABEL_STOCK')
  }

  /**
   * Get carton materials only
   */
  public getCartonMaterials(): MaterialSpec[] {
    return this.materials.filter(m => m.type === 'FOLDING_CARTON' || m.type === 'CORRUGATED')
  }

  /**
   * Add custom material
   */
  public addCustomMaterial(material: MaterialSpec): void {
    this.materials.push(material)
  }

  /**
   * Estimate total thickness including stack
   */
  public estimateStackHeight(materialId: string, count: number): number {
    const mat = this.getMaterialById(materialId)
    if (!mat) return 0
    return mat.caliper * count
  }
}

export const materialLibrary = new MaterialLibrary()

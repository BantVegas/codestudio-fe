/**
 * GPCS CodeStudio - Layer Manager
 * 
 * Manages PDF layers (Optional Content Groups)
 * Handles layer visibility, printability, and type detection
 */

import type { PDFPageProxy } from 'pdfjs-dist'
import type {
  PDFLayer,
  LayerType,
} from '../types/PrepressTypes'

/**
 * Layer Manager class
 * Extracts and manages PDF layers
 */
export class LayerManager {
  private layers: Map<string, PDFLayer> = new Map()
  
  /**
   * Extract layers from PDF page
   */
  async extractLayers(page: PDFPageProxy): Promise<PDFLayer[]> {
    this.layers.clear()
    
    try {
      // Get optional content configuration from the page
      // pdf.js provides limited access to OCG (Optional Content Groups)
      // In a full implementation, we would parse the PDF catalog
      
      // For now, create a default artwork layer
      const defaultLayer: PDFLayer = {
        id: 'layer_artwork',
        name: 'Artwork',
        visible: true,
        defaultVisible: true,
        locked: false,
        printable: true,
        layerType: 'ARTWORK',
        isSpotColorLayer: false,
        childIds: [],
        order: 0,
        objectIds: []
      }
      
      this.layers.set(defaultLayer.id, defaultLayer)
      
      // Try to extract actual layers from page structure
      await this.extractOCGLayers(page)
      
    } catch (error) {
      console.warn('Layer extraction failed:', error)
    }
    
    return Array.from(this.layers.values())
  }
  
  /**
   * Extract Optional Content Groups from page
   */
  private async extractOCGLayers(page: PDFPageProxy): Promise<void> {
    // pdf.js doesn't expose OCG directly in a clean way
    // This would require custom PDF parsing
    // For now, we'll detect layers from naming conventions in the content
  }
  
  /**
   * Detect layer type from name
   */
  detectLayerType(name: string): LayerType {
    const lowerName = name.toLowerCase()
    
    // White/underprint layers
    if (lowerName.includes('white') || 
        lowerName.includes('underprint') ||
        lowerName.includes('under print')) {
      return 'WHITE'
    }
    
    // Varnish/coating layers
    if (lowerName.includes('varnish') || 
        lowerName.includes('coating') ||
        lowerName.includes('uv') ||
        lowerName.includes('gloss') ||
        lowerName.includes('matt')) {
      return 'VARNISH'
    }
    
    // Die line layers
    if (lowerName.includes('die') || 
        lowerName.includes('cut') ||
        lowerName.includes('crease') ||
        lowerName.includes('perf') ||
        lowerName.includes('kiss')) {
      return 'DIELINE'
    }
    
    // Foil layers
    if (lowerName.includes('foil') || 
        lowerName.includes('gold') ||
        lowerName.includes('silver') ||
        lowerName.includes('metallic')) {
      return 'FOIL'
    }
    
    // Emboss layers
    if (lowerName.includes('emboss') || 
        lowerName.includes('deboss') ||
        lowerName.includes('blind')) {
      return 'EMBOSS'
    }
    
    // Braille layers
    if (lowerName.includes('braille')) {
      return 'BRAILLE'
    }
    
    // Technical layers
    if (lowerName.includes('technical') || 
        lowerName.includes('info') ||
        lowerName.includes('notes') ||
        lowerName.includes('instructions')) {
      return 'TECHNICAL'
    }
    
    // Annotation layers
    if (lowerName.includes('annotation') || 
        lowerName.includes('comment') ||
        lowerName.includes('markup')) {
      return 'ANNOTATION'
    }
    
    return 'ARTWORK'
  }
  
  /**
   * Check if layer is a spot color layer
   */
  isSpotColorLayer(name: string): boolean {
    const lowerName = name.toLowerCase()
    
    // Common spot color layer patterns
    const spotPatterns = [
      'pantone',
      'spot',
      'pms ',
      'hks ',
      'toyo',
      'dic ',
    ]
    
    return spotPatterns.some(pattern => lowerName.includes(pattern))
  }
  
  /**
   * Get associated color name from layer name
   */
  getAssociatedColor(layerName: string): string | undefined {
    // Try to extract color name from layer name
    const patterns = [
      /pantone\s+(\d+\s*[cmu]?)/i,
      /pms\s+(\d+\s*[cmu]?)/i,
      /spot[:\s]+(.+)/i,
      /^(.+)\s+\(spot\)$/i,
    ]
    
    for (const pattern of patterns) {
      const match = layerName.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return undefined
  }
  
  /**
   * Create layer from name
   */
  createLayer(
    id: string,
    name: string,
    order: number,
    parentId?: string
  ): PDFLayer {
    const layerType = this.detectLayerType(name)
    const isSpotColorLayer = this.isSpotColorLayer(name)
    const associatedColor = isSpotColorLayer ? this.getAssociatedColor(name) : undefined
    
    const layer: PDFLayer = {
      id,
      name,
      visible: true,
      defaultVisible: true,
      locked: false,
      printable: layerType !== 'ANNOTATION' && layerType !== 'TECHNICAL',
      layerType,
      isSpotColorLayer,
      associatedColor,
      parentId,
      childIds: [],
      order,
      objectIds: []
    }
    
    this.layers.set(id, layer)
    
    // Update parent's child list
    if (parentId && this.layers.has(parentId)) {
      const parent = this.layers.get(parentId)!
      parent.childIds.push(id)
    }
    
    return layer
  }
  
  /**
   * Add object to layer
   */
  addObjectToLayer(layerId: string, objectId: string): void {
    const layer = this.layers.get(layerId)
    if (layer && !layer.objectIds.includes(objectId)) {
      layer.objectIds.push(objectId)
    }
  }
  
  /**
   * Get layer by ID
   */
  getLayer(id: string): PDFLayer | undefined {
    return this.layers.get(id)
  }
  
  /**
   * Get all layers
   */
  getAllLayers(): PDFLayer[] {
    return Array.from(this.layers.values())
  }
  
  /**
   * Get printable layers
   */
  getPrintableLayers(): PDFLayer[] {
    return Array.from(this.layers.values()).filter(l => l.printable && l.visible)
  }
  
  /**
   * Get layers by type
   */
  getLayersByType(type: LayerType): PDFLayer[] {
    return Array.from(this.layers.values()).filter(l => l.layerType === type)
  }
  
  /**
   * Get spot color layers
   */
  getSpotColorLayers(): PDFLayer[] {
    return Array.from(this.layers.values()).filter(l => l.isSpotColorLayer)
  }
  
  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId)
    if (layer) {
      layer.visible = visible
    }
  }
  
  /**
   * Set layer printability
   */
  setLayerPrintability(layerId: string, printable: boolean): void {
    const layer = this.layers.get(layerId)
    if (layer) {
      layer.printable = printable
    }
  }
  
  /**
   * Set layer lock state
   */
  setLayerLocked(layerId: string, locked: boolean): void {
    const layer = this.layers.get(layerId)
    if (layer) {
      layer.locked = locked
    }
  }
  
  /**
   * Reorder layers
   */
  reorderLayers(layerIds: string[]): void {
    layerIds.forEach((id, index) => {
      const layer = this.layers.get(id)
      if (layer) {
        layer.order = index
      }
    })
  }
  
  /**
   * Get layer hierarchy
   */
  getLayerHierarchy(): PDFLayer[] {
    const rootLayers = Array.from(this.layers.values())
      .filter(l => !l.parentId)
      .sort((a, b) => a.order - b.order)
    
    return rootLayers
  }
  
  /**
   * Flatten layer hierarchy
   */
  getFlattenedLayers(): PDFLayer[] {
    const result: PDFLayer[] = []
    
    const addLayerAndChildren = (layer: PDFLayer) => {
      result.push(layer)
      for (const childId of layer.childIds) {
        const child = this.layers.get(childId)
        if (child) {
          addLayerAndChildren(child)
        }
      }
    }
    
    const rootLayers = this.getLayerHierarchy()
    for (const layer of rootLayers) {
      addLayerAndChildren(layer)
    }
    
    return result
  }
  
  /**
   * Reset layer manager
   */
  reset(): void {
    this.layers.clear()
  }
}

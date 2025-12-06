/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/LabelCanvas/LabelCanvas.tsx
import React, { useMemo, useRef, useState, useCallback } from 'react'
import type {
  LabelConfig,
  Layer,
  LabelObject,
  BarcodeObject,
  TextObject,
  ImageObject,
  ReferenceBox,
  SnapPoint,
  DistortionSettings,
} from '../../types/barcodeTypes'

interface LabelCanvasProps {
  labelConfig: LabelConfig
  layers: Layer[]
  selectedObjectId: string | null
  onSelectObject: (id: string | null) => void
  onUpdateObject: (layerId: string, objectId: string, updates: Partial<LabelObject>) => void
  distortionSettings: DistortionSettings
  zoom: number
  showRulers: boolean
  snapToGrid: boolean
  snapToObjects: boolean
}

// Konverzia mm na px pre zobrazenie
const MM_TO_PX = 3.7795275591 // pri 96 DPI

export const LabelCanvas: React.FC<LabelCanvasProps> = ({
  labelConfig,
  layers,
  selectedObjectId,
  onSelectObject,
  onUpdateObject,
  distortionSettings,
  zoom,
  showRulers,
  snapToGrid,
  snapToObjects,
}) => {
  const canvasRef = useRef<SVGSVGElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const {
    widthMm,
    heightMm,
    bleedMm,
    safeMarginMm,
    cornerRadiusMm,
    showBleedZone,
    showTrimZone,
    showSafeZone,
    showGrid,
    gridSizeMm,
  } = labelConfig

  // Výpočet rozmerov s distorziou
  const effectiveWidth = useMemo(() => {
    if (!distortionSettings.enabled) return widthMm
    return widthMm * (1 + distortionSettings.crossDirectionPercent / 100)
  }, [widthMm, distortionSettings])

  const effectiveHeight = useMemo(() => {
    if (!distortionSettings.enabled) return heightMm
    return heightMm * (1 + distortionSettings.webDirectionPercent / 100)
  }, [heightMm, distortionSettings])

  // Rozmery v px
  const bleedPx = bleedMm * MM_TO_PX * zoom
  const trimWidthPx = effectiveWidth * MM_TO_PX * zoom
  const trimHeightPx = effectiveHeight * MM_TO_PX * zoom
  const safeMarginPx = safeMarginMm * MM_TO_PX * zoom
  const cornerRadiusPx = cornerRadiusMm * MM_TO_PX * zoom
  const gridSizePx = gridSizeMm * MM_TO_PX * zoom

  // Celkové rozmery SVG vrátane bleed
  const totalWidthPx = trimWidthPx + 2 * bleedPx
  const totalHeightPx = trimHeightPx + 2 * bleedPx

  // Padding pre rulers
  const rulerSize = showRulers ? 25 : 0
  const svgWidth = totalWidthPx + rulerSize + 40
  const svgHeight = totalHeightPx + rulerSize + 40

  // Snap points
  const snapPoints = useMemo<SnapPoint[]>(() => {
    const points: SnapPoint[] = []
    const refs: ReferenceBox[] = ['TRIM', 'SAFE']
    
    refs.forEach(ref => {
      const offsetX = ref === 'SAFE' ? safeMarginMm : 0
      const offsetY = ref === 'SAFE' ? safeMarginMm : 0
      const w = ref === 'SAFE' ? widthMm - 2 * safeMarginMm : widthMm
      const h = ref === 'SAFE' ? heightMm - 2 * safeMarginMm : heightMm

      // Rohy
      points.push({ id: `${ref}_TL`, name: 'Ľavý horný', xMm: offsetX, yMm: offsetY, reference: ref })
      points.push({ id: `${ref}_TR`, name: 'Pravý horný', xMm: offsetX + w, yMm: offsetY, reference: ref })
      points.push({ id: `${ref}_BL`, name: 'Ľavý dolný', xMm: offsetX, yMm: offsetY + h, reference: ref })
      points.push({ id: `${ref}_BR`, name: 'Pravý dolný', xMm: offsetX + w, yMm: offsetY + h, reference: ref })
      
      // Stredy hrán
      points.push({ id: `${ref}_TC`, name: 'Horný stred', xMm: offsetX + w / 2, yMm: offsetY, reference: ref })
      points.push({ id: `${ref}_BC`, name: 'Dolný stred', xMm: offsetX + w / 2, yMm: offsetY + h, reference: ref })
      points.push({ id: `${ref}_LC`, name: 'Ľavý stred', xMm: offsetX, yMm: offsetY + h / 2, reference: ref })
      points.push({ id: `${ref}_RC`, name: 'Pravý stred', xMm: offsetX + w, yMm: offsetY + h / 2, reference: ref })
      
      // Stred
      points.push({ id: `${ref}_C`, name: 'Stred', xMm: offsetX + w / 2, yMm: offsetY + h / 2, reference: ref })
    })

    return points
  }, [widthMm, heightMm, safeMarginMm])

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid || gridSizeMm <= 0 || gridSizePx <= 0 || isDragging) return { vertical: [], horizontal: [] }

    const vertical: number[] = []
    const horizontal: number[] = []

    for (let x = 0; x <= widthMm; x += gridSizeMm) {
      vertical.push(x * MM_TO_PX * zoom)
    }
    for (let y = 0; y <= heightMm; y += gridSizeMm) {
      horizontal.push(y * MM_TO_PX * zoom)
    }

    return { vertical, horizontal }
  }, [widthMm, heightMm, zoom, isDragging, gridSizePx])

  // Ruler ticks
  const rulerTicks = useMemo(() => {
    const horizontal: { pos: number; label: string; major: boolean }[] = []
    const vertical: { pos: number; label: string; major: boolean }[] = []

    const step = zoom > 0.5 ? 5 : 10 // mm

    for (let x = 0; x <= widthMm; x += step) {
      horizontal.push({
        pos: x * MM_TO_PX * zoom,
        label: x % (step * 2) === 0 ? String(x) : '',
        major: x % (step * 2) === 0,
      })
    }

    for (let y = 0; y <= heightMm; y += step) {
      vertical.push({
        pos: y * MM_TO_PX * zoom,
        label: y % (step * 2) === 0 ? String(y) : '',
        major: y % (step * 2) === 0,
      })
    }

    return { horizontal, vertical }
  }, [widthMm, heightMm, zoom])

  // Základná drag logika (pripravená pre budúce presúvanie objektov)
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true)
    setDragOffset({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragOffset.x
      const dy = e.clientY - dragOffset.y
      // Rezervované pre budúci posun objektov, momentálne len využitie pre TS
      void dx
      void dy
    }
    setIsDragging(false)
  }, [isDragging, dragOffset])

  // Snap vybraného objektu na najbližší grid podľa gridSizeMm
  const snapSelectedToGrid = useCallback(() => {
    if (!snapToGrid || !selectedObjectId || gridSizeMm <= 0 || isDragging) return

    const snap = (vMm: number) => Math.round(vMm / gridSizeMm) * gridSizeMm

    for (const layer of layers) {
      const obj = layer.objects.find(o => o.id === selectedObjectId)
      if (obj) {
        onUpdateObject(layer.id, obj.id, {
          xMm: snap(obj.xMm),
          yMm: snap(obj.yMm),
        })
        break
      }
    }
  }, [snapToGrid, selectedObjectId, gridSizeMm, layers, onUpdateObject])

  // Handle object click
  const handleObjectClick = useCallback((e: React.MouseEvent, objectId: string) => {
    e.stopPropagation()
    onSelectObject(objectId)
  }, [onSelectObject])

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(() => {
    onSelectObject(null)
  }, [onSelectObject])

  // Render barcode object
  const renderBarcode = (obj: BarcodeObject, layerVisible: boolean) => {
    if (!obj.visible || !layerVisible) return null

    const x = (bleedMm + obj.xMm) * MM_TO_PX * zoom
    const y = (bleedMm + obj.yMm) * MM_TO_PX * zoom
    const w = obj.widthMm * MM_TO_PX * zoom
    const h = obj.heightMm * MM_TO_PX * zoom
    const isSelected = selectedObjectId === obj.id

    return (
      <g
        key={obj.id}
        transform={`translate(${x}, ${y})`}
        onClick={(e) => handleObjectClick(e, obj.id)}
        style={{ cursor: obj.locked ? 'not-allowed' : 'pointer' }}
      >
        {/* White box */}
        {obj.whiteBoxEnabled && (
          <rect
            x={-obj.whiteBoxPaddingMm * MM_TO_PX * zoom}
            y={-obj.whiteBoxPaddingMm * MM_TO_PX * zoom}
            width={w + 2 * obj.whiteBoxPaddingMm * MM_TO_PX * zoom}
            height={h + 2 * obj.whiteBoxPaddingMm * MM_TO_PX * zoom}
            rx={obj.whiteBoxCornerRadiusMm * MM_TO_PX * zoom}
            fill="#FFFFFF"
          />
        )}
        
        {/* Barcode placeholder */}
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={obj.fillColor}
          stroke={isSelected ? '#3b82f6' : 'transparent'}
          strokeWidth={isSelected ? 2 : 0}
        />
        
        {/* Simplified bars visualization */}
        <g>
          {Array.from({ length: 20 }).map((_, i) => (
            <rect
              key={i}
              x={i * (w / 30) + w * 0.1}
              y={0}
              width={w / 50}
              height={h * 0.8}
              fill={obj.strokeColor || '#000000'}
            />
          ))}
        </g>

        {/* HR Text */}
        {obj.showHrText && (
          <text
            x={w / 2}
            y={h + 12}
            textAnchor="middle"
            fontSize={obj.hrFontSizePt * zoom}
            fill={obj.hrTextColor}
            fontFamily={obj.hrFontFamily}
          >
            {obj.hrCustomText || obj.value || 'BARCODE'}
          </text>
        )}

        {/* Selection handles */}
        {isSelected && !obj.locked && (
          <>
            <rect x={-4} y={-4} width={8} height={8} fill="#3b82f6" />
            <rect x={w - 4} y={-4} width={8} height={8} fill="#3b82f6" />
            <rect x={-4} y={h - 4} width={8} height={8} fill="#3b82f6" />
            <rect x={w - 4} y={h - 4} width={8} height={8} fill="#3b82f6" />
          </>
        )}
      </g>
    )
  }

  // Render text object
  const renderText = (obj: TextObject, layerVisible: boolean) => {
    if (!obj.visible || !layerVisible) return null

    const x = (bleedMm + obj.xMm) * MM_TO_PX * zoom
    const y = (bleedMm + obj.yMm) * MM_TO_PX * zoom
    const isSelected = selectedObjectId === obj.id

    return (
      <g
        key={obj.id}
        transform={`translate(${x}, ${y})`}
        onClick={(e) => handleObjectClick(e, obj.id)}
        style={{ cursor: obj.locked ? 'not-allowed' : 'pointer' }}
      >
        <text
          x={0}
          y={obj.fontSizePt * zoom}
          fontSize={obj.fontSizePt * zoom}
          fontFamily={obj.fontFamily}
          fontWeight={obj.fontWeight}
          fontStyle={obj.fontStyle}
          fill={obj.fillColor}
          opacity={obj.opacity}
        >
          {obj.content}
        </text>

        {isSelected && (
          <rect
            x={-2}
            y={-2}
            width={obj.widthMm * MM_TO_PX * zoom + 4}
            height={obj.heightMm * MM_TO_PX * zoom + 4}
            fill="transparent"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}
      </g>
    )
  }

  // Render image object
  const renderImage = (obj: ImageObject, layerVisible: boolean) => {
    if (!obj.visible || !layerVisible) return null

    const x = (bleedMm + obj.xMm) * MM_TO_PX * zoom
    const y = (bleedMm + obj.yMm) * MM_TO_PX * zoom
    const w = obj.widthMm * MM_TO_PX * zoom
    const h = obj.heightMm * MM_TO_PX * zoom
    const isSelected = selectedObjectId === obj.id

    return (
      <g
        key={obj.id}
        transform={`translate(${x}, ${y})`}
        onClick={(e) => handleObjectClick(e, obj.id)}
        style={{ cursor: obj.locked ? 'not-allowed' : 'pointer' }}
      >
        {obj.src ? (
          <image
            href={obj.src}
            x={0}
            y={0}
            width={w}
            height={h}
            preserveAspectRatio={obj.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}
            opacity={obj.opacity}
          />
        ) : (
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}

        {isSelected && (
          <>
            <rect x={-4} y={-4} width={8} height={8} fill="#3b82f6" />
            <rect x={w - 4} y={-4} width={8} height={8} fill="#3b82f6" />
            <rect x={-4} y={h - 4} width={8} height={8} fill="#3b82f6" />
            <rect x={w - 4} y={h - 4} width={8} height={8} fill="#3b82f6" />
          </>
        )}
      </g>
    )
  }

  // Render object based on type
  const renderObject = (obj: LabelObject, layerVisible: boolean) => {
    switch (obj.type) {
      case 'barcode':
        return renderBarcode(obj as BarcodeObject, layerVisible)
      case 'text':
        return renderText(obj as TextObject, layerVisible)
      case 'image':
        return renderImage(obj as ImageObject, layerVisible)
      default:
        return null
    }
  }

  return (
    <div className="relative overflow-auto rounded-lg border border-slate-700 bg-slate-800 p-4">
      <svg
        ref={canvasRef}
        width={svgWidth}
        height={svgHeight}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ background: '#1e293b' }}
      >
        {/* Rulers */}
        {showRulers && (
          <g>
            {/* Horizontal ruler */}
            <rect x={rulerSize} y={0} width={totalWidthPx} height={rulerSize} fill="#334155" />
            {rulerTicks.horizontal.map((tick, i) => (
              <g key={`h-${i}`} transform={`translate(${rulerSize + bleedPx + tick.pos}, 0)`}>
                <line
                  x1={0}
                  y1={tick.major ? 15 : 20}
                  x2={0}
                  y2={rulerSize}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                {tick.label && (
                  <text x={0} y={12} fontSize={8} fill="#94a3b8" textAnchor="middle">
                    {tick.label}
                  </text>
                )}
              </g>
            ))}

            {/* Vertical ruler */}
            <rect x={0} y={rulerSize} width={rulerSize} height={totalHeightPx} fill="#334155" />
            {rulerTicks.vertical.map((tick, i) => (
              <g key={`v-${i}`} transform={`translate(0, ${rulerSize + bleedPx + tick.pos})`}>
                <line
                  x1={tick.major ? 15 : 20}
                  y1={0}
                  x2={rulerSize}
                  y2={0}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                {tick.label && (
                  <text x={12} y={4} fontSize={8} fill="#94a3b8" textAnchor="middle">
                    {tick.label}
                  </text>
                )}
              </g>
            ))}

            {/* Corner */}
            <rect x={0} y={0} width={rulerSize} height={rulerSize} fill="#1e293b" />
            <text x={rulerSize / 2} y={rulerSize / 2 + 3} fontSize={8} fill="#64748b" textAnchor="middle">
              mm
            </text>
          </g>
        )}

        {/* Main canvas area */}
        <g transform={`translate(${rulerSize + 20}, ${rulerSize + 20})`}>
          {/* Bleed zone */}
          {showBleedZone && (
            <rect
              x={0}
              y={0}
              width={totalWidthPx}
              height={totalHeightPx}
              fill="#fef3c7"
              fillOpacity={0.2}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}

          {/* Trim zone (main label area) */}
          <rect
            x={bleedPx}
            y={bleedPx}
            width={trimWidthPx}
            height={trimHeightPx}
            rx={cornerRadiusPx}
            fill="#ffffff"
            stroke={showTrimZone ? '#3b82f6' : '#e5e7eb'}
            strokeWidth={showTrimZone ? 2 : 1}
          />

          {/* Safe zone */}
          {showSafeZone && (
            <rect
              x={bleedPx + safeMarginPx}
              y={bleedPx + safeMarginPx}
              width={trimWidthPx - 2 * safeMarginPx}
              height={trimHeightPx - 2 * safeMarginPx}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}

          {/* Grid */}
          {showGrid && (
            <g opacity={0.3}>
              {gridLines.vertical.map((x, i) => (
                <line
                  key={`gv-${i}`}
                  x1={bleedPx + x}
                  y1={bleedPx}
                  x2={bleedPx + x}
                  y2={bleedPx + trimHeightPx}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                />
              ))}
              {gridLines.horizontal.map((y, i) => (
                <line
                  key={`gh-${i}`}
                  x1={bleedPx}
                  y1={bleedPx + y}
                  x2={bleedPx + trimWidthPx}
                  y2={bleedPx + y}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                />
              ))}
            </g>
          )}

          {/* Snap points */}
          {snapToObjects && (
            <g opacity={0.5}>
              {snapPoints.map(point => (
                <circle
                  key={point.id}
                  cx={bleedPx + point.xMm * MM_TO_PX * zoom}
                  cy={bleedPx + point.yMm * MM_TO_PX * zoom}
                  r={3}
                  fill={point.reference === 'SAFE' ? '#10b981' : '#3b82f6'}
                />
              ))}
            </g>
          )}

          {/* Layers and objects */}
          <g transform={`translate(${bleedPx}, ${bleedPx})`}>
            {layers
              .slice()
              .reverse()
              .map(layer =>
                layer.objects.map(obj => renderObject(obj, layer.visible))
              )}
          </g>

          {/* Distortion indicator */}
          {distortionSettings.enabled && distortionSettings.previewDistorted && (
            <g>
              <text
                x={totalWidthPx / 2}
                y={totalHeightPx + 20}
                fontSize={10}
                fill="#f59e0b"
                textAnchor="middle"
              >
                Distorzia: Web {distortionSettings.webDirectionPercent}% / Cross {distortionSettings.crossDirectionPercent}%
              </text>
            </g>
          )}
        </g>
      </svg>

    </div>
  )
}

export default LabelCanvas
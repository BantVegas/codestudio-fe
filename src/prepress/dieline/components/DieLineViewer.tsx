import React, { useEffect, useRef, useState } from 'react'
import type { DieLineInfo, DiePath, DieSegment, DieLineType, Point2D } from '../DieLineTypes'

interface DieLineViewerProps {
  dieLine: DieLineInfo | null
  showDimensions?: boolean
  showGrid?: boolean
  width?: number
  height?: number
  onSegmentClick?: (segmentId: string) => void
}

export const DieLineViewer: React.FC<DieLineViewerProps> = ({
  dieLine,
  showDimensions = true,
  showGrid = true,
  width = 800,
  height = 600,
  onSegmentClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  // Initialize view when die line changes
  useEffect(() => {
    if (dieLine) {
      fitToScreen()
    }
  }, [dieLine])

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Setup transform
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    if (showGrid) {
      drawGrid(ctx)
    }

    if (dieLine) {
      // Draw background (paper size)
      // ctx.fillStyle = '#ffffff'
      // ctx.fillRect(0, 0, dieLine.width, dieLine.height)
      
      // Draw paths
      dieLine.paths.forEach(path => {
        drawPath(ctx, path)
      })

      if (showDimensions) {
        drawDimensions(ctx, dieLine)
      }
    }

    ctx.restore()
  }, [dieLine, scale, offset, showGrid, showDimensions])

  const fitToScreen = () => {
    if (!dieLine) return
    
    const padding = 50
    const availWidth = width - padding * 2
    const availHeight = height - padding * 2
    
    const scaleX = availWidth / dieLine.width
    const scaleY = availHeight / dieLine.height
    const newScale = Math.min(scaleX, scaleY)
    
    setScale(newScale)
    
    // Center
    setOffset({
      x: (width - dieLine.width * newScale) / 2,
      y: (height - dieLine.height * newScale) / 2
    })
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    // Determine grid size based on scale
    // e.g. every 10mm, 50mm, or 100mm
    const gridSize = 10 // mm
    
    // We need to cover the visible area
    // Simplified: draw a large enough grid
    const range = 2000 // mm
    
    ctx.beginPath()
    ctx.strokeStyle = '#e5e7eb' // gray-200
    ctx.lineWidth = 1 / scale // Keep line width constant (1px)

    for (let x = -range; x <= range; x += gridSize) {
      ctx.moveTo(x, -range)
      ctx.lineTo(x, range)
    }
    for (let y = -range; y <= range; y += gridSize) {
      ctx.moveTo(-range, y)
      ctx.lineTo(range, y)
    }
    ctx.stroke()
    
    // Origin
    ctx.beginPath()
    ctx.strokeStyle = '#9ca3af' // gray-400
    ctx.lineWidth = 2 / scale
    ctx.moveTo(-20, 0)
    ctx.lineTo(20, 0)
    ctx.moveTo(0, -20)
    ctx.lineTo(0, 20)
    ctx.stroke()
  }

  const drawPath = (ctx: CanvasRenderingContext2D, path: DiePath) => {
    ctx.beginPath()
    
    path.segments.forEach((seg, index) => {
      if (index === 0) {
        ctx.moveTo(seg.start.x, seg.start.y)
      }
      
      // Setup style based on line type
      const style = getLineStyle(seg.lineType)
      ctx.strokeStyle = style.color
      ctx.lineWidth = style.width / scale
      ctx.setLineDash(style.dash.map(d => d / scale))
      
      // Draw segment
      if (seg.type === 'LINE') {
        ctx.lineTo(seg.end.x, seg.end.y)
      } else if (seg.type === 'ARC' && seg.center) {
        // Arc drawing logic needed here
        // Simplified: Line for now
        ctx.lineTo(seg.end.x, seg.end.y)
      }
      
      // Since we need different styles per segment, we might need to stroke each segment individually
      // But for performance, batching by style is better.
      // For simplicity in this viewer, we stroke immediately if style changes, otherwise continue
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(seg.end.x, seg.end.y)
    })
  }

  const getLineStyle = (type: DieLineType) => {
    switch (type) {
      case 'CUT':
        return { color: '#ef4444', width: 2, dash: [] } // Red solid
      case 'CREASE':
        return { color: '#22c55e', width: 2, dash: [5, 3] } // Green dashed
      case 'PERFORATION':
        return { color: '#eab308', width: 2, dash: [2, 2] } // Yellow dotted
      case 'PARTIAL_CUT':
        return { color: '#f97316', width: 2, dash: [10, 2] } // Orange long dash
      case 'BLEED':
        return { color: '#3b82f6', width: 1, dash: [] } // Blue
      case 'ANNOTATION':
        return { color: '#6b7280', width: 1, dash: [] } // Gray
      default:
        return { color: '#000000', width: 1, dash: [] }
    }
  }

  const drawDimensions = (ctx: CanvasRenderingContext2D, dieLine: DieLineInfo) => {
    // Draw overall bounding box dimensions
    const { width, height } = dieLine
    const padding = 10
    
    ctx.fillStyle = '#000000'
    ctx.font = `${12 / scale}px sans-serif`
    ctx.textAlign = 'center'
    
    // Width
    ctx.fillText(`${width.toFixed(1)} mm`, width / 2, height + padding + 10)
    
    // Height
    ctx.save()
    ctx.translate(-padding - 10, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${height.toFixed(1)} mm`, 0, 0)
    ctx.restore()
  }

  // Interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastPos.x
      const dy = e.clientY - lastPos.y
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomSensitivity = 0.001
    const newScale = scale * (1 - e.deltaY * zoomSensitivity)
    setScale(Math.max(0.1, Math.min(50, newScale)))
  }

  return (
    <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button 
          className="bg-white p-2 rounded shadow text-sm hover:bg-gray-100"
          onClick={fitToScreen}
        >
          Fit
        </button>
        <div className="bg-white p-2 rounded shadow text-sm">
          {(scale * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  )
}

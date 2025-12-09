/**
 * GPCS CodeStudio - 3D Die Line Viewer
 * 
 * Three.js based 3D visualization of folded box structures
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import type { DieLineInfo, DieLineType } from '../../prepress/dieline/DieLineTypes'

interface DieLineViewer3DProps {
  dieLine: DieLineInfo | null
  foldAngle: number // 0-100 (0 = flat, 100 = fully folded)
}

// Line type colors for 3D
const LINE_COLORS_3D: Record<DieLineType, number> = {
  'CUT': 0xef4444,
  'CREASE': 0x22c55e,
  'PERFORATION': 0xeab308,
  'PARTIAL_CUT': 0xf97316,
  'REVERSE_CREASE': 0x10b981,
  'SCORE': 0x14b8a6,
  'ZIPPER': 0x8b5cf6,
  'BLEED': 0x3b82f6,
  'ANNOTATION': 0x6b7280,
  'GLUE': 0xa855f7,
  'VARNISH_FREE': 0xec4899,
  'STRIPPING': 0x64748b,
  'REGISTER': 0x06b6d4,
  'UNKNOWN': 0x9ca3af
}

export const DieLineViewer3D: React.FC<DieLineViewer3DProps> = ({ dieLine, foldAngle }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const boxGroupRef = useRef<THREE.Group | null>(null)
  const animationRef = useRef<number>(0)
  
  const [isRotating, setIsRotating] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(150, 100, 200)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(100, 150, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0x10b981, 0.3)
    fillLight.position.set(-100, 50, -100)
    scene.add(fillLight)

    // Grid helper
    const gridHelper = new THREE.GridHelper(300, 30, 0x334155, 0x1e293b)
    gridHelper.position.y = -50
    scene.add(gridHelper)

    // Box group
    const boxGroup = new THREE.Group()
    scene.add(boxGroup)
    boxGroupRef.current = boxGroup

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      
      if (isRotating && boxGroupRef.current) {
        boxGroupRef.current.rotation.y += 0.005
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationRef.current)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // Update rotation state
  useEffect(() => {
    // Just triggers re-render for animation loop
  }, [isRotating])

  // Build 3D box from die line
  useEffect(() => {
    if (!boxGroupRef.current || !dieLine) return

    const group = boxGroupRef.current
    
    // Clear previous geometry
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }

    // Get dimensions from die line or use defaults
    const L = dieLine.width || 100  // Length
    const W = dieLine.height || 60  // Width  
    const D = Math.min(L, W) * 0.4  // Depth (estimated)

    // Calculate fold progress (0 = flat, 1 = fully folded)
    const foldProgress = foldAngle / 100
    const angle = (Math.PI / 2) * foldProgress

    // Material for panels
    const panelMaterial = new THREE.MeshPhongMaterial({
      color: 0x1e3a5f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      flatShading: false
    })

    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 })
    const cutMaterial = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })

    // Create box panels based on fold angle
    // Bottom panel (base)
    const bottomGeom = new THREE.PlaneGeometry(L, W)
    const bottomPanel = new THREE.Mesh(bottomGeom, panelMaterial.clone())
    bottomPanel.rotation.x = -Math.PI / 2
    bottomPanel.position.y = 0
    bottomPanel.castShadow = true
    bottomPanel.receiveShadow = true
    group.add(bottomPanel)

    // Add edges to bottom
    const bottomEdges = new THREE.EdgesGeometry(bottomGeom)
    const bottomLines = new THREE.LineSegments(bottomEdges, cutMaterial)
    bottomLines.rotation.x = -Math.PI / 2
    bottomLines.position.y = 0.1
    group.add(bottomLines)

    // Front panel
    const frontGeom = new THREE.PlaneGeometry(L, D)
    const frontPanel = new THREE.Mesh(frontGeom, panelMaterial.clone())
    frontPanel.position.z = W / 2
    frontPanel.position.y = D / 2 * Math.sin(angle)
    frontPanel.position.z = W / 2 + D / 2 * (1 - Math.cos(angle))
    frontPanel.rotation.x = Math.PI / 2 - angle
    frontPanel.castShadow = true
    group.add(frontPanel)

    const frontEdges = new THREE.EdgesGeometry(frontGeom)
    const frontLines = new THREE.LineSegments(frontEdges, edgeMaterial)
    frontLines.position.copy(frontPanel.position)
    frontLines.rotation.copy(frontPanel.rotation)
    group.add(frontLines)

    // Back panel
    const backGeom = new THREE.PlaneGeometry(L, D)
    const backPanel = new THREE.Mesh(backGeom, panelMaterial.clone())
    backPanel.position.z = -W / 2
    backPanel.position.y = D / 2 * Math.sin(angle)
    backPanel.position.z = -W / 2 - D / 2 * (1 - Math.cos(angle))
    backPanel.rotation.x = -(Math.PI / 2 - angle)
    backPanel.castShadow = true
    group.add(backPanel)

    const backEdges = new THREE.EdgesGeometry(backGeom)
    const backLines = new THREE.LineSegments(backEdges, edgeMaterial)
    backLines.position.copy(backPanel.position)
    backLines.rotation.copy(backPanel.rotation)
    group.add(backLines)

    // Left panel
    const leftGeom = new THREE.PlaneGeometry(W, D)
    const leftPanel = new THREE.Mesh(leftGeom, panelMaterial.clone())
    leftPanel.position.x = -L / 2
    leftPanel.position.y = D / 2 * Math.sin(angle)
    leftPanel.position.x = -L / 2 - D / 2 * (1 - Math.cos(angle))
    leftPanel.rotation.y = Math.PI / 2
    leftPanel.rotation.x = angle
    leftPanel.castShadow = true
    group.add(leftPanel)

    const leftEdges = new THREE.EdgesGeometry(leftGeom)
    const leftLines = new THREE.LineSegments(leftEdges, edgeMaterial)
    leftLines.position.copy(leftPanel.position)
    leftLines.rotation.copy(leftPanel.rotation)
    group.add(leftLines)

    // Right panel
    const rightGeom = new THREE.PlaneGeometry(W, D)
    const rightPanel = new THREE.Mesh(rightGeom, panelMaterial.clone())
    rightPanel.position.x = L / 2
    rightPanel.position.y = D / 2 * Math.sin(angle)
    rightPanel.position.x = L / 2 + D / 2 * (1 - Math.cos(angle))
    rightPanel.rotation.y = -Math.PI / 2
    rightPanel.rotation.x = angle
    rightPanel.castShadow = true
    group.add(rightPanel)

    const rightEdges = new THREE.EdgesGeometry(rightGeom)
    const rightLines = new THREE.LineSegments(rightEdges, edgeMaterial)
    rightLines.position.copy(rightPanel.position)
    rightLines.rotation.copy(rightPanel.rotation)
    group.add(rightLines)

    // Top flaps (only visible when folding)
    if (foldProgress > 0.3) {
      const flapProgress = Math.min(1, (foldProgress - 0.3) / 0.7)
      const flapAngle = (Math.PI / 2) * flapProgress

      // Front top flap
      const frontFlapGeom = new THREE.PlaneGeometry(L, D * 0.5)
      const frontFlap = new THREE.Mesh(frontFlapGeom, panelMaterial.clone())
      const frontTopY = D * Math.sin(angle)
      const frontTopZ = W / 2 + D * (1 - Math.cos(angle))
      frontFlap.position.set(0, frontTopY + D * 0.25 * Math.sin(flapAngle), frontTopZ - D * 0.25 * (1 - Math.cos(flapAngle)))
      frontFlap.rotation.x = Math.PI / 2 - angle - flapAngle
      frontFlap.castShadow = true
      group.add(frontFlap)

      // Back top flap
      const backFlapGeom = new THREE.PlaneGeometry(L, D * 0.5)
      const backFlap = new THREE.Mesh(backFlapGeom, panelMaterial.clone())
      const backTopZ = -W / 2 - D * (1 - Math.cos(angle))
      backFlap.position.set(0, frontTopY + D * 0.25 * Math.sin(flapAngle), backTopZ + D * 0.25 * (1 - Math.cos(flapAngle)))
      backFlap.rotation.x = -(Math.PI / 2 - angle - flapAngle)
      backFlap.castShadow = true
      group.add(backFlap)
    }

    // Center the group
    group.position.y = 20

  }, [dieLine, foldAngle])

  // Mouse handlers for manual rotation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setIsRotating(false)
    setLastMouse({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !boxGroupRef.current) return
    
    const deltaX = e.clientX - lastMouse.x
    const deltaY = e.clientY - lastMouse.y
    
    boxGroupRef.current.rotation.y += deltaX * 0.01
    boxGroupRef.current.rotation.x += deltaY * 0.01
    
    setLastMouse({ x: e.clientX, y: e.clientY })
  }, [isDragging, lastMouse])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!cameraRef.current) return
    const camera = cameraRef.current
    const zoomSpeed = 0.1
    const direction = e.deltaY > 0 ? 1 : -1
    
    camera.position.multiplyScalar(1 + direction * zoomSpeed)
    camera.position.clampLength(50, 500)
  }, [])

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`p-2 rounded-lg transition-colors ${
            isRotating 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
          title={isRotating ? 'Stop rotation' : 'Auto rotate'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <button
          onClick={() => {
            if (boxGroupRef.current) {
              boxGroupRef.current.rotation.set(0, 0, 0)
            }
            if (cameraRef.current) {
              cameraRef.current.position.set(150, 100, 200)
              cameraRef.current.lookAt(0, 0, 0)
            }
          }}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors"
          title="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>

      {/* Empty state */}
      {!dieLine && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">Load a structure to preview in 3D</p>
          </div>
        </div>
      )}
    </div>
  )
}

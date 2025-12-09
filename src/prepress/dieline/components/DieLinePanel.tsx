import React, { useState } from 'react'
import { dieLineManager } from '../DieLineManager'
import { parametricEngine } from '../parametric/ParametricEngine'
import { materialLibrary } from '../MaterialLibrary'
import type { DieLineInfo, DieValidationResult, MaterialSpec } from '../DieLineTypes'

interface DieLinePanelProps {
  onDieLineLoaded: (dieLine: DieLineInfo) => void
  activeDieLine: DieLineInfo | null
}

export const DieLinePanel: React.FC<DieLinePanelProps> = ({ 
  onDieLineLoaded, 
  activeDieLine 
}) => {
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'PARAMETRIC' | 'INFO'>('IMPORT')
  const [error, setError] = useState<string | null>(null)
  
  // Parametric state
  const [length, setLength] = useState(100)
  const [width, setWidth] = useState(50)
  const [depth, setDepth] = useState(30)
  const [selectedMaterialId, setSelectedMaterialId] = useState(materialLibrary.getAllMaterials()[0].id)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const dieLine = await dieLineManager.loadDieLine(text, file.name)
      onDieLineLoaded(dieLine)
      setError(null)
    } catch (err) {
      setError('Failed to load file. Check console for details.')
      console.error(err)
    }
  }

  const handleGenerate = () => {
    const material = materialLibrary.getMaterialById(selectedMaterialId)
    if (!material) return

    const dieLine = parametricEngine.generateECMA_A20(
      { L: length, W: width, D: depth },
      material
    )
    onDieLineLoaded(dieLine)
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80">
      <div className="flex border-b border-gray-200">
        <TabButton 
          active={activeTab === 'IMPORT'} 
          onClick={() => setActiveTab('IMPORT')}
        >
          Import
        </TabButton>
        <TabButton 
          active={activeTab === 'PARAMETRIC'} 
          onClick={() => setActiveTab('PARAMETRIC')}
        >
          Library
        </TabButton>
        <TabButton 
          active={activeTab === 'INFO'} 
          onClick={() => setActiveTab('INFO')}
        >
          Info
        </TabButton>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">
            {error}
          </div>
        )}

        {activeTab === 'IMPORT' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CAD File
              </label>
              <input
                type="file"
                accept=".cf2,.cff,.dxf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Supported formats: CFF2 (.cf2), DXF
              </p>
            </div>
          </div>
        )}

        {activeTab === 'PARAMETRIC' && (
          <div className="space-y-4">
            <h3 className="font-medium">ECMA A20.20.03.01</h3>
            <p className="text-xs text-gray-500 mb-4">Reverse Tuck End box</p>

            <div className="space-y-3">
              <NumberInput label="Length (L)" value={length} onChange={setLength} />
              <NumberInput label="Width (W)" value={width} onChange={setWidth} />
              <NumberInput label="Depth (D)" value={depth} onChange={setDepth} />
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Material
                </label>
                <select 
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm"
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                >
                  {materialLibrary.getAllMaterials().map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Generate Structure
              </button>
            </div>
          </div>
        )}

        {activeTab === 'INFO' && activeDieLine && (
          <div className="space-y-4">
            <InfoRow label="Name" value={activeDieLine.name} />
            <InfoRow label="Format" value={activeDieLine.format} />
            <InfoRow label="Dimensions" value={`${activeDieLine.width.toFixed(1)} x ${activeDieLine.height.toFixed(1)} mm`} />
            <InfoRow label="Material" value={activeDieLine.material?.name || 'Unknown'} />
            
            <div className="mt-4">
              <h4 className="font-medium text-sm mb-2">Validation</h4>
              {activeDieLine.errors.length === 0 && activeDieLine.warnings.length === 0 ? (
                <div className="text-green-600 text-sm flex items-center gap-1">
                  ✓ Structure valid
                </div>
              ) : (
                <div className="space-y-1">
                  {activeDieLine.errors.map((e, i) => (
                    <div key={i} className="text-red-600 text-xs">• {e}</div>
                  ))}
                  {activeDieLine.warnings.map((w, i) => (
                    <div key={i} className="text-yellow-600 text-xs">• {w}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    className={`flex-1 py-3 text-sm font-medium border-b-2 ${
      active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
    onClick={onClick}
  >
    {children}
  </button>
)

const NumberInput: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        className="block w-full text-sm border-gray-300 rounded-md"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-xs">mm</span>
      </div>
    </div>
  </div>
)

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className="text-gray-900 text-sm font-medium truncate ml-2">{value}</span>
  </div>
)

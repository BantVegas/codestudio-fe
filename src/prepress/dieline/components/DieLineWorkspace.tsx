import React, { useState } from 'react'
import { DieLineViewer } from './DieLineViewer'
import { DieLinePanel } from './DieLinePanel'
import type { DieLineInfo } from '../DieLineTypes'

export const DieLineWorkspace: React.FC = () => {
  const [activeDieLine, setActiveDieLine] = useState<DieLineInfo | null>(null)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Structural Design
            </h1>
            <p className="text-xs text-gray-500">
              {activeDieLine ? activeDieLine.name : 'No file loaded'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
              3D Preview
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm">
              Export CF2
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-hidden relative">
          <div className="absolute inset-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {activeDieLine ? (
              <DieLineViewer 
                dieLine={activeDieLine}
                // Dynamic sizing would require ResizeObserver
                width={1200}
                height={800}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium">No Structure Loaded</p>
                  <p className="text-sm">Import a CAD file or generate from library</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Sidebar Panel */}
      <DieLinePanel 
        activeDieLine={activeDieLine}
        onDieLineLoaded={setActiveDieLine}
      />
    </div>
  )
}

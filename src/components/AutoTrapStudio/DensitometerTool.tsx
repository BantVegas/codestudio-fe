/**
 * GPCS CodeStudio - Densitometer Tool
 * Meranie denzity farieb - ESKO kompatibilný
 */

import React, { useState } from 'react'

interface DensitometerReading {
  x: number
  y: number
  rgb: { r: number; g: number; b: number }
  cmyk: { c: number; m: number; y: number; k: number }
  lab: { l: number; a: number; b: number }
  density: number
  luminance: number
  hexColor: string
}

interface DensitometerToolProps {
  isActive: boolean
  onToggle: () => void
  currentReading: DensitometerReading | null
  readings: DensitometerReading[]
  onClearReadings: () => void
  onSampleColor: (x: number, y: number) => void
}

export const DensitometerTool: React.FC<DensitometerToolProps> = ({
  isActive,
  onToggle,
  currentReading,
  readings,
  onClearReadings
}) => {
  const [showHistory, setShowHistory] = useState(false)

  const formatNumber = (n: number, decimals = 2) => n.toFixed(decimals)

  const getDensityColor = (density: number) => {
    if (density < 0.5) return 'text-green-400'
    if (density < 1.5) return 'text-yellow-400'
    if (density < 2.5) return 'text-orange-400'
    return 'text-red-400'
  }

  const getLuminanceColor = (luminance: number) => {
    if (luminance > 70) return 'text-white'
    if (luminance > 40) return 'text-slate-300'
    return 'text-slate-500'
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <span>🔬</span> Densitometer
          </h3>
          <button
            onClick={onToggle}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              isActive
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {isActive ? '✓ Aktívny' : 'Aktivovať'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {isActive ? 'Kliknite na obrázok pre meranie' : 'Meranie denzity a luminancie farieb'}
        </p>
      </div>

      {/* Current Reading */}
      {currentReading ? (
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-start gap-3">
            {/* Color Swatch */}
            <div
              className="w-16 h-16 rounded-lg border-2 border-slate-600 shadow-lg"
              style={{ backgroundColor: currentReading.hexColor }}
            />

            {/* Values */}
            <div className="flex-1 space-y-1">
              {/* Position */}
              <div className="text-xs text-slate-500">
                Pozícia: {currentReading.x}, {currentReading.y}
              </div>

              {/* Density */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Density:</span>
                <span className={`text-lg font-bold ${getDensityColor(currentReading.density)}`}>
                  {formatNumber(currentReading.density)}
                </span>
              </div>

              {/* Luminance */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Luminance:</span>
                <span className={`text-lg font-bold ${getLuminanceColor(currentReading.luminance)}`}>
                  {formatNumber(currentReading.luminance, 0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Color Values */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {/* RGB */}
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-500 mb-1">RGB</div>
              <div className="font-mono text-white">
                {currentReading.rgb.r}, {currentReading.rgb.g}, {currentReading.rgb.b}
              </div>
            </div>

            {/* CMYK */}
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-500 mb-1">CMYK</div>
              <div className="font-mono text-white">
                {formatNumber(currentReading.cmyk.c, 0)}% {formatNumber(currentReading.cmyk.m, 0)}% {formatNumber(currentReading.cmyk.y, 0)}% {formatNumber(currentReading.cmyk.k, 0)}%
              </div>
            </div>

            {/* LAB */}
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-500 mb-1">LAB</div>
              <div className="font-mono text-white">
                {formatNumber(currentReading.lab.l, 0)} {formatNumber(currentReading.lab.a, 0)} {formatNumber(currentReading.lab.b, 0)}
              </div>
            </div>
          </div>

          {/* Hex */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">HEX:</span>
            <code className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono text-white">
              {currentReading.hexColor}
            </code>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 text-sm">
          {isActive ? 'Kliknite na obrázok...' : 'Aktivujte nástroj pre meranie'}
        </div>
      )}

      {/* Density Guide */}
      <div className="p-3 border-b border-slate-800">
        <div className="text-xs text-slate-500 mb-2">Density Guide:</div>
        <div className="flex items-center gap-1">
          <div className="flex-1 h-2 rounded-l bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500" />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0 (svetlá)</span>
          <span>4 (tmavá)</span>
        </div>
      </div>

      {/* Trap Direction Hint */}
      <div className="p-3 border-b border-slate-800 bg-slate-800/30">
        <div className="text-xs text-slate-400">
          <strong className="text-cyan-400">Tip:</strong> Farba s nižšou denzitou (svetlejšia) 
          sa trapuje do farby s vyššou denzitou (tmavšia).
        </div>
      </div>

      {/* History Toggle */}
      <div className="p-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center justify-center gap-2"
        >
          <span>{showHistory ? '▼' : '▶'}</span>
          História meraní ({readings.length})
        </button>
      </div>

      {/* History */}
      {showHistory && readings.length > 0 && (
        <div className="border-t border-slate-800">
          <div className="max-h-32 overflow-y-auto">
            {readings.slice(-10).reverse().map((reading, index) => (
              <div
                key={index}
                className="p-2 border-b border-slate-800 flex items-center gap-2 text-xs"
              >
                <div
                  className="w-4 h-4 rounded border border-slate-600"
                  style={{ backgroundColor: reading.hexColor }}
                />
                <span className="text-slate-400">D: {formatNumber(reading.density)}</span>
                <span className="text-slate-400">L: {formatNumber(reading.luminance, 0)}%</span>
                <span className="text-slate-500 font-mono">{reading.hexColor}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onClearReadings}
            className="w-full py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            Vymazať históriu
          </button>
        </div>
      )}
    </div>
  )
}

export default DensitometerTool

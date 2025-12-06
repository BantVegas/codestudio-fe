// src/components/LoginPage/LoginPage.tsx
import React, { useState } from 'react'

export type AppMode = 'CODE_GENERATOR' | 'AUTO_TRAPPING'

interface LoginPageProps {
  onLogin: (mode: AppMode) => void
}

// Floating particle component
const FloatingParticle: React.FC<{ delay: number; size: number; duration: number; left: number }> = ({
  delay,
  size,
  duration,
  left,
}) => (
  <div
    className="absolute rounded-full opacity-20"
    style={{
      width: size,
      height: size,
      left: `${left}%`,
      bottom: '-20px',
      background: `linear-gradient(135deg, #00d4ff, #ff00d4, #ffaa00)`,
      animation: `float ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  />
)

// Animated gear component
const AnimatedGear: React.FC<{ size: number; top: number; left: number; duration: number; reverse?: boolean }> = ({
  size,
  top,
  left,
  duration,
  reverse,
}) => (
  <svg
    className="absolute opacity-10"
    style={{
      width: size,
      height: size,
      top: `${top}%`,
      left: `${left}%`,
      animation: `spin ${duration}s linear infinite ${reverse ? 'reverse' : ''}`,
    }}
    viewBox="0 0 100 100"
    fill="currentColor"
  >
    <path
      d="M97.6,55.7V44.3l-13.6-2.9c-0.8-3.4-2.1-6.6-3.8-9.5l7.4-11.7l-8-8L67.9,19.6c-2.9-1.7-6.1-3-9.5-3.8L55.7,2.4H44.3
      l-2.9,13.6c-3.4,0.8-6.6,2.1-9.5,3.8l-11.7-7.4l-8,8l7.4,11.7c-1.7,2.9-3,6.1-3.8,9.5L2.4,44.3v11.4l13.6,2.9
      c0.8,3.4,2.1,6.6,3.8,9.5l-7.4,11.7l8,8l11.7-7.4c2.9,1.7,6.1,3,9.5,3.8l2.9,13.6h11.4l2.9-13.6c3.4-0.8,6.6-2.1,9.5-3.8
      l11.7,7.4l8-8l-7.4-11.7c1.7-2.9,3-6.1,3.8-9.5L97.6,55.7z M50,65c-8.3,0-15-6.7-15-15c0-8.3,6.7-15,15-15c8.3,0,15,6.7,15,15
      C65,58.3,58.3,65,50,65z"
      className="text-cyan-400"
    />
  </svg>
)

// Animated barcode lines
const AnimatedBarcode: React.FC<{ top: number; left: number; width: number }> = ({ top, left, width }) => (
  <div
    className="absolute flex gap-0.5 opacity-10"
    style={{ top: `${top}%`, left: `${left}%`, width }}
  >
    {Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="bg-gradient-to-b from-cyan-400 to-pink-500"
        style={{
          width: Math.random() * 3 + 1,
          height: 40 + Math.random() * 30,
          animation: `pulse ${1 + Math.random() * 2}s ease-in-out infinite`,
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
)

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedMode, setSelectedMode] = useState<AppMode>('CODE_GENERATOR')

  // Generate random particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    delay: Math.random() * 5,
    size: 10 + Math.random() * 30,
    duration: 8 + Math.random() * 10,
    left: Math.random() * 100,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 800))

    if (username === 'codestudio' && password === 'gpcs1') {
      // Success animation
      await new Promise(resolve => setTimeout(resolve, 300))
      onLogin(selectedMode)
    } else {
      setError('Nesprávne meno alebo heslo')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating particles */}
        {particles.map(p => (
          <FloatingParticle key={p.id} {...p} />
        ))}

        {/* Animated gears */}
        <AnimatedGear size={200} top={10} left={5} duration={20} />
        <AnimatedGear size={150} top={60} left={85} duration={15} reverse />
        <AnimatedGear size={100} top={80} left={10} duration={25} />
        <AnimatedGear size={120} top={20} left={80} duration={18} reverse />

        {/* Animated barcodes */}
        <AnimatedBarcode top={15} left={70} width={100} />
        <AnimatedBarcode top={75} left={5} width={80} />

        {/* Gradient orbs */}
        <div
          className="absolute h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
            top: '10%',
            left: '60%',
            animation: 'pulse 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #ff00d4 0%, transparent 70%)',
            bottom: '10%',
            left: '10%',
            animation: 'pulse 10s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
        <div
          className="absolute h-64 w-64 rounded-full opacity-15 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #ffaa00 0%, transparent 70%)',
            top: '50%',
            right: '20%',
            animation: 'pulse 12s ease-in-out infinite',
            animationDelay: '4s',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main container - login vľavo, tlačidlá vpravo (oddelené) */}
      <div className="relative z-10 flex min-h-screen items-center justify-center gap-24 px-8">
        {/* ĽAVO - Login sekcia */}
        <div
          className="w-full max-w-md"
          style={{
            animation: 'fadeInUp 0.8s ease-out',
          }}
        >
            {/* Logo section */}
            <div className="mb-8 text-center">
              {/* GPCS Logo - SVG recreation */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  {/* Gear + G logo */}
                  <svg
                    width="120"
                    height="120"
                    viewBox="0 0 200 200"
                    className="drop-shadow-2xl"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(0, 212, 255, 0.3))' }}
                  >
                    {/* Gear */}
                    <path
                      d="M100,20 L108,35 L125,30 L128,48 L145,50 L140,68 L155,78 L145,92 L155,108 L140,118 L145,135 L128,138 L125,155 L108,150 L100,165 L92,150 L75,155 L72,138 L55,135 L60,118 L45,108 L55,92 L45,78 L60,68 L55,50 L72,48 L75,30 L92,35 Z"
                      fill="#1e3a5f"
                      className="animate-pulse"
                      style={{ animationDuration: '3s' }}
                    />
                    {/* Inner circle */}
                    <circle cx="100" cy="92" r="35" fill="#0f172a" />
                    {/* Colorful swoosh */}
                    <path
                      d="M85,60 Q60,90 85,120 Q95,100 90,80 Q100,95 110,75 Q95,85 85,60"
                      fill="url(#swooshGradient)"
                    />
                    {/* G letter */}
                    <text
                      x="95"
                      y="105"
                      fontSize="45"
                      fontWeight="bold"
                      fill="#1e3a5f"
                      fontFamily="Arial, sans-serif"
                    >
                      G
                    </text>
                    {/* Connection dots */}
                    <circle cx="130" cy="110" r="5" fill="#00d4ff" />
                    <circle cx="145" cy="125" r="4" fill="#00d4ff" />
                    <circle cx="155" cy="115" r="3" fill="#00d4ff" />
                    <line x1="130" y1="110" x2="145" y2="125" stroke="#00d4ff" strokeWidth="2" />
                    <line x1="145" y1="125" x2="155" y2="115" stroke="#00d4ff" strokeWidth="2" />
                    
                    <defs>
                      <linearGradient id="swooshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00d4ff" />
                        <stop offset="50%" stopColor="#ff00d4" />
                        <stop offset="100%" stopColor="#ffaa00" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Company name */}
              <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-100">
                <span className="text-cyan-400">GPCS</span>{' '}
                <span className="text-slate-300">s.r.o.</span>
              </h1>
              <p className="text-sm tracking-widest text-slate-500">
                GLOBAL PRINTING AND CONTROL SOLUTION
              </p>
            </div>

            {/* Login card */}
            <div
              className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl"
              style={{
                boxShadow: '0 0 60px rgba(0, 212, 255, 0.1), 0 0 100px rgba(255, 0, 212, 0.05)',
              }}
            >
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-slate-200">
                  {selectedMode === 'CODE_GENERATOR' ? 'CodeStudio' : 'AutoTrap Studio'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Prihláste sa do aplikácie</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Používateľské meno
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Zadajte meno"
                      autoComplete="username"
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Heslo
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 pr-12 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      placeholder="Zadajte heslo"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Prihlasujem...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Prihlásiť sa
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  )}
                  
                  {/* Button shine effect */}
                  <div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    style={{
                      animation: 'shine 3s infinite',
                    }}
                  />
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center text-xs text-slate-600">
                © 2024 GPCS s.r.o. • CodeStudio v1.0
              </div>
            </div>
          </div>

        {/* PRAVO - App Mode Selector tlačidlá (vedľa seba, väčšie, celé sa hýbu) */}
        <div 
          className="flex gap-8"
          style={{
            animation: 'fadeInUp 0.8s ease-out 0.2s both',
          }}
        >
          {/* CODE GENERATOR Button */}
          <button
            type="button"
            onClick={() => setSelectedMode('CODE_GENERATOR')}
            className={`group relative overflow-hidden rounded-3xl border-3 px-14 py-10 transition-all duration-300 hover:-translate-y-3 hover:scale-105 ${
              selectedMode === 'CODE_GENERATOR'
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 shadow-2xl shadow-cyan-500/50'
                : 'border-slate-600 bg-slate-800/60 hover:border-cyan-400/70 hover:shadow-xl hover:shadow-cyan-500/20'
            }`}
            style={{
              transform: selectedMode === 'CODE_GENERATOR' ? 'scale(1.08) translateY(-8px)' : undefined,
            }}
          >
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/20 to-blue-500/0 transition-opacity duration-300 ${
              selectedMode === 'CODE_GENERATOR' ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
            }`} />
            
            {/* Icon */}
            <div className="relative mb-5 flex justify-center">
              <svg
                className={`h-24 w-24 transition-all duration-300 ${
                  selectedMode === 'CODE_GENERATOR' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            
            {/* Text */}
            <div className="relative text-center">
              <h3 className={`text-2xl font-bold tracking-wide transition-colors duration-300 ${
                selectedMode === 'CODE_GENERATOR' ? 'text-cyan-300' : 'text-slate-300 group-hover:text-cyan-200'
              }`}>
                CODE GENERATOR
              </h3>
              <p className={`mt-3 text-base transition-colors duration-300 ${
                selectedMode === 'CODE_GENERATOR' ? 'text-cyan-400/80' : 'text-slate-500 group-hover:text-slate-400'
              }`}>
                Čiarové kódy & QR
              </p>
            </div>
            
            {/* Active indicator */}
            {selectedMode === 'CODE_GENERATOR' && (
              <div className="absolute -bottom-1 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
            )}
          </button>

          {/* AUTO TRAPPING Button */}
          <button
            type="button"
            onClick={() => setSelectedMode('AUTO_TRAPPING')}
            className={`group relative overflow-hidden rounded-3xl border-3 px-14 py-10 transition-all duration-300 hover:-translate-y-3 hover:scale-105 ${
              selectedMode === 'AUTO_TRAPPING'
                ? 'border-pink-400 bg-gradient-to-br from-pink-500/30 to-purple-600/30 shadow-2xl shadow-pink-500/50'
                : 'border-slate-600 bg-slate-800/60 hover:border-pink-400/70 hover:shadow-xl hover:shadow-pink-500/20'
            }`}
            style={{
              transform: selectedMode === 'AUTO_TRAPPING' ? 'scale(1.08) translateY(-8px)' : undefined,
            }}
          >
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-pink-500/0 via-pink-500/20 to-purple-500/0 transition-opacity duration-300 ${
              selectedMode === 'AUTO_TRAPPING' ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
            }`} />
            
            {/* Icon */}
            <div className="relative mb-5 flex justify-center">
              <svg
                className={`h-24 w-24 transition-all duration-300 ${
                  selectedMode === 'AUTO_TRAPPING' ? 'text-pink-400' : 'text-slate-400 group-hover:text-pink-300'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            
            {/* Text */}
            <div className="relative text-center">
              <h3 className={`text-2xl font-bold tracking-wide transition-colors duration-300 ${
                selectedMode === 'AUTO_TRAPPING' ? 'text-pink-300' : 'text-slate-300 group-hover:text-pink-200'
              }`}>
                AUTO TRAPPING
              </h3>
              <p className={`mt-3 text-base transition-colors duration-300 ${
                selectedMode === 'AUTO_TRAPPING' ? 'text-pink-400/80' : 'text-slate-500 group-hover:text-slate-400'
              }`}>
                Automatický trapping
              </p>
            </div>
            
            {/* Active indicator */}
            {selectedMode === 'AUTO_TRAPPING' && (
              <div className="absolute -bottom-1 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500" />
            )}
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.2;
            transform: scale(1.05);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          50%, 100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes barcodeWave {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.85);
          }
        }
        
        @keyframes qrPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  )
}

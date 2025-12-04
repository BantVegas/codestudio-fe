// src/lib/jobStorage.ts
import type { CodeJob, CodeJobId } from '../types/jobTypes'

const STORAGE_KEY = 'gpcs_codestudio_jobs_v1'

type JobsState = {
  jobs: CodeJob[]
}

function readRaw(): JobsState {
  if (typeof window === 'undefined') {
    return { jobs: [] }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { jobs: [] }
    const parsed = JSON.parse(raw) as JobsState
    if (!Array.isArray(parsed.jobs)) return { jobs: [] }
    return { jobs: parsed.jobs }
  } catch {
    return { jobs: [] }
  }
}

function writeRaw(state: JobsState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // nič – nech to nespadne
  }
}

export function listJobs(): CodeJob[] {
  return readRaw().jobs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function getJob(id: CodeJobId): CodeJob | undefined {
  return readRaw().jobs.find(j => j.id === id)
}

export function saveJob(job: CodeJob): void {
  const state = readRaw()
  const existingIndex = state.jobs.findIndex(j => j.id === job.id)
  const now = new Date().toISOString()

  const normalized: CodeJob = {
    ...job,
    createdAt: job.createdAt || now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    state.jobs[existingIndex] = normalized
  } else {
    state.jobs.push(normalized)
  }
  writeRaw(state)
}

export function deleteJob(id: CodeJobId): void {
  const state = readRaw()
  state.jobs = state.jobs.filter(j => j.id !== id)
  writeRaw(state)
}

export function deleteAllJobs(): void {
  writeRaw({ jobs: [] })
}

export function createEmptyJob(name = 'Nový job'): CodeJob {
  const now = new Date().toISOString()
  const id = `job_${now}_${Math.random().toString(36).slice(2, 8)}`

  const job: CodeJob = {
    id,
    name,
    createdAt: now,
    updatedAt: now,

    codeType: 'CODE128',
    dataMode: 'PLAIN',
    rawCodeValue: '',

    vdpEnabled: false,
    vdpMode: 'LINEAR',
    vdpPattern: '',
    vdpPrefix: '',
    vdpAlphaStartChar: 'A',
    serialCurrent: 1,
    serialPadding: 4,

    labelPreset: '50x30',
    labelWidthMm: 50,
    labelHeightMm: 30,
    bleedMm: 0,
    rotation: 0,
    printDirection: 'ALONG_WEB',

    activeProfileId: null,

    barHeightPx: 80,
    showHrText: true,
    hrFontSizePt: 10,
    barColor: '#000000',
    bgColor: '#ffffff',
    textColor: '#000000',

    qrLogoDataUrl: null,
    qrLogoScale: 0.3,

    hrCustomText: '',

    exportDpi: 300,
  }

  return job
}

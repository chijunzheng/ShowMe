/**
 * Living World Store (local filesystem)
 *
 * Persists Living World state between server restarts in development.
 * Stored under backend/data/living-world/<clientId>/state.json (gitignored).
 *
 * Note: This is intentionally a lightweight local store. In production, prefer
 * durable storage (e.g., Firestore + GCS).
 */

import fs from 'fs/promises'
import path from 'path'
import logger from '../utils/logger.js'

const LOCAL_DIR = process.env.SHOWME_LOCAL_LIVING_WORLD_DIR
  || path.join(process.cwd(), 'data', 'living-world')

const LOCAL_ENABLED = process.env.SHOWME_LOCAL_LIVING_WORLD === '1'
  || process.env.NODE_ENV !== 'production'

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function getClientDir(clientId) {
  return path.join(LOCAL_DIR, sanitizeSegment(clientId))
}

function getStatePath(clientId) {
  return path.join(getClientDir(clientId), 'state.json')
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function loadLivingWorldState(clientId) {
  if (!LOCAL_ENABLED) return null
  if (!clientId) return null

  try {
    const filePath = getStatePath(clientId)
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('WORLD', 'Failed to load living world state from local store', {
        error: error.message,
        clientId,
      })
    }
    return null
  }
}

export async function saveLivingWorldState(clientId, worldState) {
  if (!LOCAL_ENABLED) return false
  if (!clientId) return false
  if (!worldState || typeof worldState !== 'object') return false

  try {
    const clientDir = getClientDir(clientId)
    await ensureDir(clientDir)

    const filePath = getStatePath(clientId)
    const tmpPath = path.join(
      clientDir,
      `state.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`
    )

    await fs.writeFile(tmpPath, JSON.stringify(worldState), 'utf8')
    await fs.rename(tmpPath, filePath)
    return true
  } catch (error) {
    logger.warn('WORLD', 'Failed to save living world state to local store', {
      error: error.message,
      clientId,
    })
    return false
  }
}


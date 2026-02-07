/**
 * User Progress Service Tests
 *
 * Focus: local progress persistence and badge unlock behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

function createTempProgressFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'showme-progress-'))
  return { dir, file: path.join(dir, 'userProgress.json') }
}

const ORIGINAL_ENV = {
  SHOWME_LOCAL_PROGRESS: process.env.SHOWME_LOCAL_PROGRESS,
  SHOWME_LOCAL_PROGRESS_FILE: process.env.SHOWME_LOCAL_PROGRESS_FILE,
  NODE_ENV: process.env.NODE_ENV,
}

function restoreEnv() {
  if (ORIGINAL_ENV.SHOWME_LOCAL_PROGRESS === undefined) {
    delete process.env.SHOWME_LOCAL_PROGRESS
  } else {
    process.env.SHOWME_LOCAL_PROGRESS = ORIGINAL_ENV.SHOWME_LOCAL_PROGRESS
  }

  if (ORIGINAL_ENV.SHOWME_LOCAL_PROGRESS_FILE === undefined) {
    delete process.env.SHOWME_LOCAL_PROGRESS_FILE
  } else {
    process.env.SHOWME_LOCAL_PROGRESS_FILE = ORIGINAL_ENV.SHOWME_LOCAL_PROGRESS_FILE
  }

  if (ORIGINAL_ENV.NODE_ENV === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV
  }
}

describe('userProgress local persistence', () => {
  let temp = null

  beforeEach(() => {
    temp = createTempProgressFile()
    process.env.SHOWME_LOCAL_PROGRESS = '1'
    process.env.SHOWME_LOCAL_PROGRESS_FILE = temp.file
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    vi.resetModules()
    if (temp?.dir) {
      fs.rmSync(temp.dir, { recursive: true, force: true })
    }
    restoreEnv()
  })

  it('unlocks CURIOUS_MIND only once', async () => {
    vi.resetModules()
    const { recordActivity } = await import('../userProgress.js')

    const clientId = 'client_123_abc'
    const first = await recordActivity(clientId, 'question_asked')
    expect(first.newBadges).toContain('CURIOUS_MIND')

    const second = await recordActivity(clientId, 'question_asked')
    expect(second.newBadges).not.toContain('CURIOUS_MIND')
  })

  it('persists progress to disk across module reload', async () => {
    vi.resetModules()
    const { recordActivity } = await import('../userProgress.js')

    const clientId = 'client_456_def'
    await recordActivity(clientId, 'question_asked')
    expect(fs.existsSync(temp.file)).toBe(true)

    vi.resetModules()
    const { getUserProgress, recordActivity: recordAgain } = await import('../userProgress.js')

    const result = await getUserProgress(clientId)
    expect(result.progress.badges).toContain('CURIOUS_MIND')

    const second = await recordAgain(clientId, 'question_asked')
    expect(second.newBadges).not.toContain('CURIOUS_MIND')
  })

  it('unlocks FIRST_STEPS after topic_learned', async () => {
    vi.resetModules()
    const { recordActivity, getUserProgress } = await import('../userProgress.js')

    const clientId = 'client_topic_001'
    const result = await recordActivity(clientId, 'topic_learned')

    expect(result.newBadges).toContain('FIRST_STEPS')

    const progress = await getUserProgress(clientId)
    expect(progress.progress.totalTopicsLearned).toBe(1)
  })

  it('unlocks MYSTERY_SOLVER after mystery_complete', async () => {
    vi.resetModules()
    const { recordActivity } = await import('../userProgress.js')

    const clientId = 'client_mystery_001'
    const result = await recordActivity(clientId, 'mystery_complete')

    expect(result.newBadges).toContain('MYSTERY_SOLVER')
  })
})

import { Firestore } from '@google-cloud/firestore'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_LOCAL_GRAPH_FILE = path.resolve(__dirname, '..', '..', '.data', 'knowledgeGraph.json')
const LOCAL_GRAPH_FILE = process.env.SHOWME_LOCAL_GRAPH_FILE || DEFAULT_LOCAL_GRAPH_FILE
const LOCAL_GRAPH_SAVE_DEBOUNCE_MS = process.env.NODE_ENV === 'test' ? 0 : 300

const COLLECTION_NAME = 'knowledgeGraphs'

let db = null
let firestoreUnavailable = false
let warnedLocalFallback = false

const localGraph = new Map()
let localGraphLoaded = false
let localGraphSaveTimer = null

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toStringOrEmpty(value, maxLen = 500) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.slice(0, maxLen)
}

function sanitizeId(value, fallback = '') {
  const sanitized = toStringOrEmpty(value, 120).replace(/[^a-zA-Z0-9_\-:.]/g, '_')
  return sanitized || fallback
}

function createDefaultGraph() {
  return {
    nodes: [],
    edges: [],
    clusters: [],
    gaps: [],
    explorerRank: {
      level: 1,
      title: 'Stargazer',
      icon: '🔭',
      topicsToNextRank: 3,
    },
  }
}

function normalizeGraph(graph) {
  if (!graph || typeof graph !== 'object') {
    return createDefaultGraph()
  }

  const nodes = Array.isArray(graph.nodes)
    ? graph.nodes.slice(0, 800).map((node) => ({
      id: sanitizeId(node?.id, `node_${Date.now()}`),
      name: toStringOrEmpty(node?.name, 160) || 'Unknown Topic',
      concepts: Array.isArray(node?.concepts)
        ? node.concepts
          .map((value) => toStringOrEmpty(value, 120))
          .filter(Boolean)
          .slice(0, 30)
        : [],
      masteryScores: {
        slideshow: clamp(Number(node?.masteryScores?.slideshow || 0), 0, 1),
        mystery: clamp(Number(node?.masteryScores?.mystery || 0), 0, 1),
        wonder: clamp(Number(node?.masteryScores?.wonder || 0), 0, 1),
        story: clamp(Number(node?.masteryScores?.story || 0), 0, 1),
      },
      brightness: toStringOrEmpty(node?.brightness, 32) || 'dim',
      position: (typeof node?.position?.x === 'number' && typeof node?.position?.y === 'number')
        ? { x: node.position.x, y: node.position.y }
        : null,
      followUps: Array.isArray(node?.followUps)
        ? node.followUps.map((id) => sanitizeId(id)).filter(Boolean).slice(0, 40)
        : [],
      unlockedAt: Number.isFinite(Number(node?.unlockedAt)) ? Number(node.unlockedAt) : Date.now(),
      lastReviewedAt: Number.isFinite(Number(node?.lastReviewedAt)) ? Number(node.lastReviewedAt) : Date.now(),
      category: toStringOrEmpty(node?.category, 100) || 'general',
    }))
    : []

  const edges = Array.isArray(graph.edges)
    ? graph.edges.slice(0, 3000).map((edge) => ({
      id: sanitizeId(edge?.id, `edge_${Date.now()}`),
      from: sanitizeId(edge?.from),
      to: sanitizeId(edge?.to),
      type: toStringOrEmpty(edge?.type, 40) || 'extends',
      strength: clamp(Number(edge?.strength || 0.5), 0, 1),
      discovered: !!edge?.discovered,
      explanation: toStringOrEmpty(edge?.explanation, 600),
    })).filter((edge) => edge.from && edge.to && edge.from !== edge.to)
    : []

  const clusters = Array.isArray(graph.clusters)
    ? graph.clusters.slice(0, 300).map((cluster) => ({
      id: sanitizeId(cluster?.id, `cluster_${Date.now()}`),
      name: toStringOrEmpty(cluster?.name, 120) || 'Knowledge',
      icon: toStringOrEmpty(cluster?.icon, 16) || '✨',
      nodeIds: Array.isArray(cluster?.nodeIds)
        ? cluster.nodeIds.map((id) => sanitizeId(id)).filter(Boolean).slice(0, 400)
        : [],
      color: toStringOrEmpty(cluster?.color, 32) || '#6366F1',
    }))
    : []

  const gaps = Array.isArray(graph.gaps)
    ? graph.gaps.slice(0, 250).map((gap) => ({
      id: sanitizeId(gap?.id, `gap_${Date.now()}`),
      suggestedTopic: toStringOrEmpty(gap?.suggestedTopic, 160),
      type: toStringOrEmpty(gap?.type, 40) || 'bridge',
      connectsTo: Array.isArray(gap?.connectsTo)
        ? gap.connectsTo.map((id) => sanitizeId(id)).filter(Boolean).slice(0, 40)
        : [],
      relatedNodeIds: Array.isArray(gap?.relatedNodeIds)
        ? gap.relatedNodeIds.map((id) => sanitizeId(id)).filter(Boolean).slice(0, 40)
        : [],
      reasoning: toStringOrEmpty(gap?.reasoning, 1000),
      curiosityHook: toStringOrEmpty(gap?.curiosityHook, 400),
    })).filter((gap) => gap.suggestedTopic)
    : []

  const explorerRank = {
    level: Number.isFinite(Number(graph?.explorerRank?.level)) ? Number(graph.explorerRank.level) : 1,
    title: toStringOrEmpty(graph?.explorerRank?.title, 120) || 'Stargazer',
    icon: toStringOrEmpty(graph?.explorerRank?.icon, 16) || '🔭',
    topicsToNextRank: Number.isFinite(Number(graph?.explorerRank?.topicsToNextRank))
      ? Number(graph.explorerRank.topicsToNextRank)
      : Math.max(0, 3 - nodes.length),
  }

  return {
    nodes,
    edges,
    clusters,
    gaps,
    explorerRank,
  }
}

function loadLocalGraphFromDisk() {
  if (localGraphLoaded) return
  localGraphLoaded = true

  try {
    if (!LOCAL_GRAPH_FILE || !fs.existsSync(LOCAL_GRAPH_FILE)) {
      return
    }

    const raw = fs.readFileSync(LOCAL_GRAPH_FILE, 'utf8')
    if (!raw) return

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return

    Object.entries(parsed).forEach(([clientId, graph]) => {
      if (!clientId || !graph || typeof graph !== 'object') return
      localGraph.set(clientId, normalizeGraph(graph))
    })
  } catch (error) {
    logger.warn('GRAPH', 'Failed to load local graph from disk', { error: error.message })
  }
}

function writeLocalGraphToDisk() {
  try {
    if (!LOCAL_GRAPH_FILE) return
    const dir = path.dirname(LOCAL_GRAPH_FILE)
    fs.mkdirSync(dir, { recursive: true })
    const payload = Object.fromEntries(localGraph.entries())
    fs.writeFileSync(LOCAL_GRAPH_FILE, JSON.stringify(payload, null, 2), 'utf8')
  } catch (error) {
    logger.warn('GRAPH', 'Failed to persist local graph', { error: error.message })
  }
}

function scheduleLocalGraphSave() {
  if (!LOCAL_GRAPH_FILE) return

  if (LOCAL_GRAPH_SAVE_DEBOUNCE_MS === 0) {
    writeLocalGraphToDisk()
    return
  }

  if (localGraphSaveTimer) {
    clearTimeout(localGraphSaveTimer)
  }

  localGraphSaveTimer = setTimeout(() => {
    localGraphSaveTimer = null
    writeLocalGraphToDisk()
  }, LOCAL_GRAPH_SAVE_DEBOUNCE_MS)
}

function getLocalGraph(clientId) {
  loadLocalGraphFromDisk()
  return localGraph.get(clientId) || null
}

function setLocalGraph(clientId, graph) {
  localGraph.set(clientId, graph)
  scheduleLocalGraphSave()
}

function shouldUseLocalGraph() {
  if (process.env.SHOWME_LOCAL_GRAPH === '1') return true
  if (process.env.NODE_ENV === 'production') return false
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) return true
  return firestoreUnavailable
}

function isFirestoreUnavailableError(error) {
  if (!error) return false
  if (typeof error.code === 'number' && [5, 7, 14, 16].includes(error.code)) return true
  const message = String(error.message || '')
  return /NOT_FOUND|PERMISSION_DENIED|UNAUTHENTICATED|UNAVAILABLE|credentials|default credentials|Unable to detect a Project Id|Project Id|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(message)
}

function markFirestoreUnavailable(error) {
  if (process.env.NODE_ENV === 'production') return
  if (!isFirestoreUnavailableError(error)) return
  if (!firestoreUnavailable) {
    firestoreUnavailable = true
  }
  if (!warnedLocalFallback) {
    warnedLocalFallback = true
    logger.warn('GRAPH', 'Falling back to local graph store', { error: error?.message })
  }
}

function getFirestore() {
  if (db) return db

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
    logger.info('GRAPH', 'Firestore connected')
    return db
  } catch (error) {
    markFirestoreUnavailable(error)
    logger.error('GRAPH', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

export async function loadGraphState(clientId) {
  if (!clientId) {
    return { graph: null, error: 'clientId required' }
  }

  if (shouldUseLocalGraph()) {
    const graph = getLocalGraph(clientId)
    return { graph: graph || null, error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      return { graph: getLocalGraph(clientId), error: null }
    }
    return { graph: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { graph: null, error: null }
    }

    const data = doc.data()
    return { graph: normalizeGraph(data?.graph), error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalGraph()) {
      return { graph: getLocalGraph(clientId), error: null }
    }
    logger.error('GRAPH', 'Failed to load graph state', { clientId, error: error.message })
    return { graph: null, error: error.message }
  }
}

export async function saveGraphState(clientId, graphInput) {
  if (!clientId) {
    return { success: false, error: 'clientId required' }
  }

  const graph = normalizeGraph(graphInput)

  if (shouldUseLocalGraph()) {
    setLocalGraph(clientId, graph)
    return { success: true, error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      setLocalGraph(clientId, graph)
      return { success: true, error: null }
    }
    return { success: false, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    await docRef.set({
      clientId,
      graph,
      updatedAt: Date.now(),
    }, { merge: true })

    return { success: true, error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalGraph()) {
      setLocalGraph(clientId, graph)
      return { success: true, error: null }
    }
    logger.error('GRAPH', 'Failed to save graph state', { clientId, error: error.message })
    return { success: false, error: error.message }
  }
}

export default {
  loadGraphState,
  saveGraphState,
}

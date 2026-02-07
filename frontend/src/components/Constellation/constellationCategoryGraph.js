import {
  formatCategoryLabel,
  getClusterStyle,
  normalizeCategoryKey,
} from '../../utils/clusterStyle'

function normalizeTopicLabel(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function sortNodeRefs(a, b) {
  const aName = normalizeTopicLabel(a?.name)
  const bName = normalizeTopicLabel(b?.name)
  if (aName !== bName) return aName.localeCompare(bName)
  return String(a?.id || '').localeCompare(String(b?.id || ''))
}

function sortComponentNodes(componentIds, nodeById) {
  return [...componentIds]
    .map((id) => nodeById.get(id))
    .filter(Boolean)
    .sort(sortNodeRefs)
}

/**
 * Build visual clusters from node categories.
 * These clusters are deterministic and independent from persisted graph clusters.
 *
 * @param {Array} nodes
 * @returns {Array<{id: string, key: string, name: string, color: string, icon: string, nodeIds: string[]}>}
 */
export function buildVisualCategoryClusters(nodes = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return []
  }

  const grouped = new Map()
  nodes.forEach((node) => {
    if (!node?.id) return
    const key = normalizeCategoryKey(node.category)
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(node)
  })

  return Array.from(grouped.entries())
    .map(([key, categoryNodes]) => {
      const style = getClusterStyle(key)
      const sortedNodeIds = [...categoryNodes]
        .sort(sortNodeRefs)
        .map((node) => node.id)
      return {
        id: `visual_category_${key.replace(/\s+/g, '_')}`,
        key,
        name: formatCategoryLabel(key),
        color: style.color,
        icon: style.icon,
        nodeIds: sortedNodeIds,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function buildUndirectedAdjacency(edgeList = []) {
  const adjacency = new Map()

  edgeList.forEach((edge) => {
    if (!edge?.from || !edge?.to) return
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set())
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set())
    adjacency.get(edge.from).add(edge.to)
    adjacency.get(edge.to).add(edge.from)
  })

  return adjacency
}

function getConnectedComponents(nodeIds, adjacency) {
  const remaining = new Set(nodeIds)
  const components = []

  while (remaining.size > 0) {
    const [start] = remaining
    const queue = [start]
    const component = new Set()
    remaining.delete(start)

    while (queue.length > 0) {
      const current = queue.shift()
      component.add(current)
      const neighbors = adjacency.get(current) || new Set()
      neighbors.forEach((neighbor) => {
        if (!remaining.has(neighbor)) return
        remaining.delete(neighbor)
        queue.push(neighbor)
      })
    }

    components.push(component)
  }

  return components
}

/**
 * Build minimal inferred edges to visually connect disconnected components
 * inside the same non-general category.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {Array<{id: string, from: string, to: string, categoryKey: string, inferred: true}>}
 */
export function buildInferredCategoryEdges(nodes = [], edges = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return []
  }

  const nodeById = new Map()
  const categoryNodeIds = new Map()

  nodes.forEach((node) => {
    if (!node?.id) return
    const categoryKey = normalizeCategoryKey(node.category)
    nodeById.set(node.id, { id: node.id, name: node.name, categoryKey })
    if (!categoryNodeIds.has(categoryKey)) {
      categoryNodeIds.set(categoryKey, [])
    }
    categoryNodeIds.get(categoryKey).push(node.id)
  })

  const inferredEdges = []

  Array.from(categoryNodeIds.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([categoryKey, nodeIds]) => {
      if (categoryKey === 'general') return
      if (nodeIds.length < 2) return

      const categorySet = new Set(nodeIds)
      const categoryRealEdges = (edges || []).filter((edge) => {
        return categorySet.has(edge?.from) && categorySet.has(edge?.to)
      })
      const adjacency = buildUndirectedAdjacency(categoryRealEdges)
      nodeIds.forEach((id) => {
        if (!adjacency.has(id)) adjacency.set(id, new Set())
      })

      const components = getConnectedComponents(nodeIds, adjacency)
      if (components.length <= 1) return

      const representatives = components
        .map((component) => {
          const sortedNodes = sortComponentNodes(component, nodeById)
          const representative = sortedNodes[0]
          return {
            representative,
            sortName: normalizeTopicLabel(representative?.name),
            sortId: representative?.id || '',
          }
        })
        .sort((a, b) => {
          if (a.sortName !== b.sortName) return a.sortName.localeCompare(b.sortName)
          return a.sortId.localeCompare(b.sortId)
        })

      for (let i = 1; i < representatives.length; i += 1) {
        const from = representatives[i - 1].representative.id
        const to = representatives[i].representative.id
        inferredEdges.push({
          id: `inferred_category_${categoryKey.replace(/\s+/g, '_')}_${from}_${to}`,
          from,
          to,
          categoryKey,
          inferred: true,
        })
      }
    })

  return inferredEdges
}

/**
 * useKnowledgeGraph Hook
 * Manages knowledge graph data fetching and state
 */

import { useState, useCallback, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export function useKnowledgeGraph(clientId) {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [stats, setStats] = useState(null)
  const [categoryColors, setCategoryColors] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch the knowledge graph
  const fetchGraph = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/graph?clientId=${encodeURIComponent(clientId)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch graph')
      }

      setGraph(data.graph || { nodes: [], edges: [] })
      setStats(data.stats)
      setCategoryColors(data.categoryColors || {})
    } catch (err) {
      setError(err.message)
      console.error('Failed to fetch knowledge graph:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!clientId) return

    try {
      const response = await fetch(`${API_URL}/api/graph/suggestions?clientId=${encodeURIComponent(clientId)}`)
      const data = await response.json()

      if (response.ok) {
        setSuggestions(data.suggestions || [])
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
    }
  }, [clientId])

  // Classify and add a topic to the graph
  const addTopic = useCallback(async (topicName, topicId) => {
    if (!clientId || !topicName) return { error: 'Missing required fields' }

    try {
      const response = await fetch(`${API_URL}/api/graph/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          topicName,
          topicId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to classify topic')
      }

      // Update local state with new graph
      if (data.graph) {
        setGraph(data.graph)
      }

      // Refresh suggestions
      fetchSuggestions()

      return {
        classification: data.classification,
        graph: data.graph,
        error: null,
      }
    } catch (err) {
      console.error('Failed to add topic to graph:', err)
      return { error: err.message }
    }
  }, [clientId, fetchSuggestions])

  // Initial fetch
  useEffect(() => {
    if (clientId) {
      fetchGraph()
      fetchSuggestions()
    }
  }, [clientId, fetchGraph, fetchSuggestions])

  return {
    graph,
    stats,
    categoryColors,
    suggestions,
    loading,
    error,
    fetchGraph,
    fetchSuggestions,
    addTopic,
  }
}

export default useKnowledgeGraph

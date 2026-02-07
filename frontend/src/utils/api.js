const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function stripTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function getApiBase() {
  const configuredBase = typeof import.meta.env.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL.trim()
    : ''

  if (configuredBase) {
    return stripTrailingSlash(configuredBase)
  }

  if (typeof window === 'undefined') {
    return ''
  }

  if (LOCAL_HOSTNAMES.has(window.location.hostname)) {
    return 'http://localhost:3002'
  }

  // Cloud Run / production: same-origin by default.
  return ''
}

export function toApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBase()}${normalizedPath}`
}

export default {
  getApiBase,
  toApiUrl,
}

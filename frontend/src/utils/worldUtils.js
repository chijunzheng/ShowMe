/**
 * World Utilities
 * Shared utility functions for the Living World feature
 */

/**
 * Topic to zone mapping logic
 */
export function determineZone(topicName, category) {
  if (category) {
    const normalizedCategory = category.toLowerCase()
    if (['nature', 'civilization', 'arcane'].includes(normalizedCategory)) {
      return normalizedCategory
    }
  }

  const topicLower = topicName.toLowerCase()

  const natureKeywords = [
    'volcano', 'mountain', 'ocean', 'river', 'forest', 'tree', 'plant',
    'animal', 'dinosaur', 'fish', 'bird', 'insect', 'weather', 'rain',
    'snow', 'earthquake', 'tornado', 'hurricane', 'ecosystem', 'biology',
    'earth', 'rock', 'mineral', 'crystal', 'water', 'nature', 'wildlife',
    'climate', 'environment', 'solar', 'star', 'planet', 'moon', 'sun',
  ]

  const civilizationKeywords = [
    'pyramid', 'castle', 'city', 'building', 'bridge', 'architecture',
    'history', 'war', 'king', 'queen', 'empire', 'civilization', 'invention',
    'machine', 'computer', 'robot', 'car', 'train', 'plane', 'ship',
    'medicine', 'hospital', 'school', 'library', 'museum', 'art', 'music',
    'sport', 'olympics', 'government', 'law', 'economy', 'money', 'trade',
  ]

  if (natureKeywords.some(keyword => topicLower.includes(keyword))) {
    return 'nature'
  }

  if (civilizationKeywords.some(keyword => topicLower.includes(keyword))) {
    return 'civilization'
  }

  return 'arcane'
}

export function generatePieceId() {
  return `piece_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function selectPieceIcon(topicName, zone) {
  const topicLower = topicName.toLowerCase()

  if (topicLower.includes('volcano')) return '🌋'
  if (topicLower.includes('mountain')) return '🏔️'
  if (topicLower.includes('ocean') || topicLower.includes('sea')) return '🌊'
  if (topicLower.includes('forest') || topicLower.includes('tree')) return '🌲'
  if (topicLower.includes('dinosaur')) return '🦕'
  if (topicLower.includes('animal')) return '🦁'
  if (topicLower.includes('bird')) return '🦅'
  if (topicLower.includes('fish')) return '🐠'
  if (topicLower.includes('star') || topicLower.includes('space')) return '⭐'
  if (topicLower.includes('planet')) return '🪐'
  if (topicLower.includes('sun')) return '☀️'
  if (topicLower.includes('moon')) return '🌙'
  if (topicLower.includes('weather')) return '🌤️'
  if (topicLower.includes('rain')) return '🌧️'
  if (topicLower.includes('snow')) return '❄️'
  if (topicLower.includes('flower') || topicLower.includes('plant')) return '🌸'
  if (topicLower.includes('pyramid')) return '🏛️'
  if (topicLower.includes('castle')) return '🏰'
  if (topicLower.includes('city')) return '🏙️'
  if (topicLower.includes('robot')) return '🤖'
  if (topicLower.includes('computer')) return '💻'
  if (topicLower.includes('car')) return '🚗'
  if (topicLower.includes('train')) return '🚂'
  if (topicLower.includes('plane') || topicLower.includes('airplane')) return '✈️'
  if (topicLower.includes('ship') || topicLower.includes('boat')) return '🚢'
  if (topicLower.includes('art') || topicLower.includes('painting')) return '🎨'
  if (topicLower.includes('music')) return '🎵'
  if (topicLower.includes('book') || topicLower.includes('library')) return '📚'
  if (topicLower.includes('science') || topicLower.includes('lab')) return '🔬'

  switch (zone) {
    case 'nature': return '🌿'
    case 'civilization': return '🏛️'
    case 'arcane': return '✨'
    default: return '🌍'
  }
}

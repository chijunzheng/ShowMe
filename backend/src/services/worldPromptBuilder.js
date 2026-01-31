/**
 * World Prompt Builder Service
 * Living World feature: Generates prompts for AI image generation
 *
 * This service builds prompts for:
 * 1. Base world generation - Initial barren landscape
 * 2. Evolution prompts - Adding elements as topics are learned
 *
 * The world evolves through terrain effects that map to topic domains,
 * creating a continuous landscape that transforms with knowledge.
 */

/**
 * World style constants for consistent visual identity
 * These ensure all generated images maintain the same aesthetic
 */
export const WORLD_STYLE = {
  base: 'Painterly digital illustration inspired by Studio Ghibli, with soft edges and dreamlike quality',
  lighting: 'Consistent golden-hour lighting from upper left, casting long gentle shadows',
  palette: 'Soft watercolor textures, warm but muted colors with subtle gradients',
  atmosphere: 'Gentle mist in valleys, atmospheric perspective for depth',
  composition: '16:9 widescreen format with clear horizon line at one-third height'
}

/**
 * Terrain effect mappings
 * Maps terrain types to their zones and progression of elements
 * Elements are ordered from simplest to most evolved
 */
export const TERRAIN_EFFECTS = {
  water: {
    zone: 'nature',
    elements: ['stream', 'river', 'lake', 'coastline', 'ocean'],
    description: 'Bodies of water that grow from trickling streams to vast oceans'
  },
  mountains: {
    zone: 'nature',
    elements: ['hills', 'peaks', 'mountain range', 'snow caps', 'alpine meadows'],
    description: 'Elevated terrain from gentle hills to majestic snow-capped peaks'
  },
  forest: {
    zone: 'nature',
    elements: ['saplings', 'trees', 'grove', 'forest', 'old growth'],
    description: 'Vegetation that grows from young saplings to ancient forests'
  },
  desert: {
    zone: 'nature',
    elements: ['sand dunes', 'rocky outcrops', 'oasis', 'canyon', 'mesa'],
    description: 'Arid landscapes with sand, rock formations, and hidden oases'
  },
  weather: {
    zone: 'nature',
    elements: ['clouds', 'rain', 'rainbow', 'aurora', 'storms'],
    description: 'Atmospheric phenomena from gentle clouds to dramatic skies'
  },
  life: {
    zone: 'nature',
    elements: ['insects', 'birds', 'mammals', 'mythical creatures', 'spirits'],
    description: 'Living creatures from small insects to mystical beings'
  },
  structure: {
    zone: 'civilization',
    elements: ['path', 'bridge', 'cottage', 'village', 'castle'],
    description: 'Human-made structures from simple paths to grand architecture'
  },
  abstract: {
    zone: 'arcane',
    elements: ['floating crystals', 'glowing runes', 'mystic portal', 'constellation threads', 'aurora veil'],
    description: 'Arcane phenomena that manifest as subtle magical forces and celestial patterns'
  }
}

/**
 * Zone-specific styling modifiers
 */
const ZONE_MODIFIERS = {
  nature: {
    colors: 'greens, browns, and earth tones',
    mood: 'peaceful and organic',
    elements: 'natural flora and fauna'
  },
  civilization: {
    colors: 'warm stone colors, terracotta, and wood tones',
    mood: 'welcoming and lived-in',
    elements: 'handcrafted structures with character'
  },
  arcane: {
    colors: 'purples, deep blues, and ethereal glows',
    mood: 'mysterious and magical',
    elements: 'floating crystals, runes, and mystical energy'
  }
}

/**
 * Build the base world generation prompt
 * Returns a prompt to generate the initial barren landscape
 *
 * @returns {string} Complete prompt for base world image generation
 */
export function buildBaseWorldPrompt() {
  return `Create a ${WORLD_STYLE.base}.

COMPOSITION (16:9 widescreen):
- SKY: Soft gradient from dawn colors at the horizon to deeper blue above, wispy clouds catching early light
- BACKGROUND: Distant mountains silhouetted against the sky, misty and ethereal
- MIDGROUND: Rolling plains and gentle terrain, barren but not a desert wasteland, sparse hardy grasses and a few low shrubs, hints of potential
- FOREGROUND: Textured earth and rock formations with a shallow dry streambed and a few small reflective puddles catching dawn light

MOOD & ATMOSPHERE:
- Barren but beautiful - a world waiting to bloom
- Misty morning atmosphere, the dawn of a new world
- Sense of quiet potential and peaceful emptiness
- ${WORLD_STYLE.atmosphere}

STYLE:
- ${WORLD_STYLE.lighting}
- ${WORLD_STYLE.palette}
- Dreamlike quality with soft focus on distant elements

RESTRICTIONS:
- No text or UI elements
- No buildings or human structures
- No lush vegetation or dense forests (keep greenery sparse and subtle)
- No characters or creatures
- Keep the landscape simple and uncluttered, like a pristine canvas

This is the beginning - a pristine canvas where knowledge will bring life.`
}

/**
 * Build an evolution prompt for adding new elements to the world
 *
 * @param {Object} options - Evolution options
 * @param {string} options.topicName - The topic just learned
 * @param {'nature' | 'civilization' | 'arcane'} options.zone - The zone for this evolution
 * @param {'water' | 'mountains' | 'forest' | 'desert' | 'weather' | 'life' | 'structure' | 'abstract'} options.terrainEffect - Type of terrain to add
 * @param {'sky' | 'background' | 'midground' | 'foreground'} [options.compositionLayer] - Where the new element should appear
 * @param {string} [options.elementToAdd] - Specific element to add (overrides generic progression)
 * @param {string} [options.placementHint] - Short placement hint within the frame
 * @param {string[]} [options.existingElements=[]] - What already exists in the world
 * @param {string} [options.styleDescriptor] - The world's style DNA
 * @returns {string} Complete prompt for evolution image generation
 */
export function buildEvolutionPrompt(options) {
  const {
    topicName,
    summary = '',
    zone = 'nature',
    terrainEffect,
    compositionLayer = null,
    placementHint = null,
    existingElements = [],
    styleDescriptor = WORLD_STYLE.base,
    terrainLevel = 0,
    elementToAdd = null
  } = options

  // Get terrain effect details, fallback to generic if not found
  const terrain = TERRAIN_EFFECTS[terrainEffect] || {
    zone: 'nature',
    elements: ['subtle change'],
    description: 'A gentle evolution of the landscape'
  }

  // Get zone modifiers, fallback to nature if invalid
  const zoneStyle = ZONE_MODIFIERS[zone] || ZONE_MODIFIERS.nature

  // Select an appropriate element from the terrain progression
  const resolvedElementToAdd = (typeof elementToAdd === 'string' && elementToAdd.trim())
    ? elementToAdd.trim()
    : getTerrainElement(terrainEffect, terrainLevel)

  const layerLabel = compositionLayer
    ? String(compositionLayer).toUpperCase()
    : null

  const placementGuidance = compositionLayer
    ? `
TARGET LAYER: ${layerLabel}
- SKY: upper third of the image (clouds, light, celestial, atmosphere)
- BACKGROUND: near the horizon (distant mountains, mesas, far features)
- MIDGROUND: center band (forests, structures, main landforms)
- FOREGROUND: lower third (water edges, paths, close terrain details)`
    : ''

  const placementHintSection = (typeof placementHint === 'string' && placementHint.trim())
    ? `\nPLACEMENT HINT: ${placementHint.trim()}`
    : ''

  // Prevent the model from "rewarding" topics by painting huge auroras/cloud ribbons in the sky
  // unless this evolution is explicitly about sky phenomena.
  const allowMajorSkyChanges = terrainEffect === 'weather' || terrainEffect === 'abstract' || compositionLayer === 'sky'
  const skyRestrictions = allowMajorSkyChanges
    ? ''
    : `
IMPORTANT RESTRICTION:
- Do NOT introduce new auroras, swirling magical sky ribbons, or dramatic new cloud formations.
- Keep the sky largely unchanged; focus the evolution in the ${layerLabel || 'ground layers'}.
- The new element must NOT appear in the sky or float above the landscape.`

  // Build preservation list
  const preservationSection = existingElements.length > 0
    ? `PRESERVE THESE EXISTING ELEMENTS:
${existingElements.map(el => `- ${el}`).join('\n')}
Do not remove or alter these features. They are part of the world's history.`
    : `This is an early evolution of the world. The base landscape should remain visible.`

  // Build the evolution prompt
  return `WORLD EVOLUTION: Learning about "${topicName}"
${summary ? `\nTOPIC SUMMARY: ${summary}` : ''}

The current world state includes: ${styleDescriptor}

${preservationSection}
${placementGuidance}
${placementHintSection}

ADD TO THE WORLD:
Based on learning about "${topicName}", add ${terrain.description.toLowerCase()}.
Specifically, introduce a ${resolvedElementToAdd} that emerges naturally from the existing landscape.
${skyRestrictions}

ZONE CHARACTERISTICS (${zone}):
- Colors: ${zoneStyle.colors}
- Mood: ${zoneStyle.mood}
- Elements: ${zoneStyle.elements}

STYLE REQUIREMENTS:
- Maintain ${WORLD_STYLE.lighting}
- Continue ${WORLD_STYLE.palette}
- Keep the horizon line consistent with the existing world
- Preserve atmospheric perspective and depth
- The addition should feel organic, as if it grew from the world itself

COMPOSITION GUIDANCE:
- The new ${resolvedElementToAdd} should integrate with the existing landscape
- Maintain the 16:9 widescreen format
- Keep the same camera angle and horizon position
- Add visual interest without overwhelming existing elements

RESTRICTIONS:
- No text or UI elements
- No sudden or jarring changes
- The evolution should feel natural and gradual
- Maintain the dreamlike, ${styleDescriptor} quality throughout

This evolution represents knowledge taking root in the world.`
}

/**
 * Get a random element from a terrain type based on complexity level
 *
 * @param {string} terrainEffect - The terrain effect type
 * @param {number} [level=0] - Complexity level (0-4, higher = more evolved)
 * @returns {string} The terrain element at that level
 */
export function getTerrainElement(terrainEffect, level = 0) {
  const terrain = TERRAIN_EFFECTS[terrainEffect]
  if (!terrain) {
    return 'subtle change'
  }

  // Clamp level to valid range
  const safeLevel = Math.max(0, Math.min(level, terrain.elements.length - 1))
  return terrain.elements[safeLevel]
}

/**
 * Get all valid terrain effect types
 *
 * @returns {string[]} Array of terrain effect names
 */
export function getTerrainEffectTypes() {
  return Object.keys(TERRAIN_EFFECTS)
}

/**
 * Get terrain effects for a specific zone
 *
 * @param {'nature' | 'civilization' | 'arcane'} zone - The zone to filter by
 * @returns {Object} Terrain effects belonging to that zone
 */
export function getTerrainEffectsForZone(zone) {
  const effects = {}
  for (const [key, value] of Object.entries(TERRAIN_EFFECTS)) {
    if (value.zone === zone) {
      effects[key] = value
    }
  }
  return effects
}

export default {
  buildBaseWorldPrompt,
  buildEvolutionPrompt,
  getTerrainElement,
  getTerrainEffectTypes,
  getTerrainEffectsForZone,
  TERRAIN_EFFECTS,
  WORLD_STYLE
}

/**
 * TinyLLM module for generating SpectralCube configurations from text prompts
 *
 * This module provides client-side cube generation capabilities using:
 * 1. Rule-based keyword matching for common material descriptions
 * 2. Preset templates for well-defined materials
 * 3. Random generation for fallback scenarios
 *
 * The implementation prioritizes browser compatibility and offline operation
 * while providing reasonable generation quality for common material types.
 */

import type {
  SpectralCube,
  Color3,
  ColorShift3,
  NoiseType,
  MaterialType,
  BreakPattern,
  GradientAxis,
  CubeGradient,
} from '../types/cube'
import { validateCube } from './validation'

/** Generation result with status information */
export interface GenerationResult {
  success: boolean
  cube: SpectralCube | null
  method: 'keyword' | 'template' | 'random' | 'hybrid'
  confidence: number
  warnings: string[]
}

/** Material keyword mappings for rule-based generation */
interface MaterialKeywords {
  color: Color3
  roughness: number
  transparency: number
  noiseType: NoiseType
  noiseScale: number
  material: MaterialType
  breakPattern: BreakPattern
  density: number
  tags: string[]
}

/** Keyword database for material recognition */
const MATERIAL_KEYWORDS: Record<string, Partial<MaterialKeywords>> = {
  // Stone variants
  stone: {
    color: [0.5, 0.48, 0.45],
    roughness: 0.8,
    noiseType: 'perlin',
    noiseScale: 8,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.5,
    tags: ['stone', 'natural'],
  },
  rock: {
    color: [0.45, 0.42, 0.4],
    roughness: 0.85,
    noiseType: 'perlin',
    noiseScale: 6,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.6,
    tags: ['rock', 'natural'],
  },
  granite: {
    color: [0.55, 0.52, 0.5],
    roughness: 0.6,
    noiseType: 'worley',
    noiseScale: 12,
    material: 'stone',
    breakPattern: 'shatter',
    density: 2.7,
    tags: ['granite', 'stone'],
  },
  marble: {
    color: [0.9, 0.88, 0.85],
    roughness: 0.2,
    noiseType: 'perlin',
    noiseScale: 4,
    material: 'stone',
    breakPattern: 'shatter',
    density: 2.7,
    tags: ['marble', 'stone', 'elegant'],
  },
  cobblestone: {
    color: [0.45, 0.43, 0.4],
    roughness: 0.9,
    noiseType: 'worley',
    noiseScale: 10,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.4,
    tags: ['cobblestone', 'stone', 'path'],
  },

  // Wood variants
  wood: {
    color: [0.55, 0.35, 0.2],
    roughness: 0.6,
    noiseType: 'perlin',
    noiseScale: 16,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.7,
    tags: ['wood', 'natural'],
  },
  oak: {
    color: [0.6, 0.4, 0.25],
    roughness: 0.55,
    noiseType: 'perlin',
    noiseScale: 20,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.75,
    tags: ['oak', 'wood'],
  },
  birch: {
    color: [0.85, 0.8, 0.7],
    roughness: 0.4,
    noiseType: 'perlin',
    noiseScale: 18,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.65,
    tags: ['birch', 'wood', 'light'],
  },
  bark: {
    color: [0.35, 0.25, 0.18],
    roughness: 0.95,
    noiseType: 'crackle',
    noiseScale: 6,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.5,
    tags: ['bark', 'wood', 'tree'],
  },

  // Metal variants
  metal: {
    color: [0.6, 0.6, 0.65],
    roughness: 0.3,
    noiseType: 'worley',
    noiseScale: 4,
    material: 'metal',
    breakPattern: 'shatter',
    density: 7.8,
    tags: ['metal', 'industrial'],
  },
  iron: {
    color: [0.5, 0.5, 0.52],
    roughness: 0.4,
    noiseType: 'perlin',
    noiseScale: 6,
    material: 'metal',
    breakPattern: 'shatter',
    density: 7.9,
    tags: ['iron', 'metal'],
  },
  steel: {
    color: [0.65, 0.68, 0.7],
    roughness: 0.15,
    noiseType: 'worley',
    noiseScale: 3,
    material: 'metal',
    breakPattern: 'shatter',
    density: 8.0,
    tags: ['steel', 'metal', 'modern'],
  },
  gold: {
    color: [0.95, 0.8, 0.3],
    roughness: 0.1,
    noiseType: 'perlin',
    noiseScale: 2,
    material: 'metal',
    breakPattern: 'shatter',
    density: 19.3,
    tags: ['gold', 'metal', 'precious'],
  },
  copper: {
    color: [0.85, 0.55, 0.35],
    roughness: 0.35,
    noiseType: 'worley',
    noiseScale: 5,
    material: 'metal',
    breakPattern: 'shatter',
    density: 8.9,
    tags: ['copper', 'metal'],
  },
  rust: {
    color: [0.6, 0.35, 0.2],
    roughness: 0.85,
    noiseType: 'worley',
    noiseScale: 8,
    material: 'metal',
    breakPattern: 'crumble',
    density: 5.2,
    tags: ['rust', 'metal', 'weathered'],
  },

  // Crystal/Glass variants
  crystal: {
    color: [0.8, 0.85, 0.95],
    roughness: 0.05,
    transparency: 0.4,
    noiseType: 'worley',
    noiseScale: 3,
    material: 'crystal',
    breakPattern: 'shatter',
    density: 3.2,
    tags: ['crystal', 'fantasy'],
  },
  glass: {
    color: [0.9, 0.92, 0.95],
    roughness: 0.02,
    transparency: 0.2,
    noiseType: 'perlin',
    noiseScale: 1,
    material: 'glass',
    breakPattern: 'shatter',
    density: 2.5,
    tags: ['glass', 'transparent'],
  },
  ice: {
    color: [0.85, 0.92, 0.98],
    roughness: 0.15,
    transparency: 0.5,
    noiseType: 'crackle',
    noiseScale: 4,
    material: 'crystal',
    breakPattern: 'shatter',
    density: 0.9,
    tags: ['ice', 'cold', 'frozen'],
  },
  gem: {
    color: [0.6, 0.2, 0.8],
    roughness: 0.05,
    transparency: 0.3,
    noiseType: 'worley',
    noiseScale: 2,
    material: 'crystal',
    breakPattern: 'shatter',
    density: 3.5,
    tags: ['gem', 'precious', 'fantasy'],
  },

  // Natural/Organic variants
  grass: {
    color: [0.3, 0.5, 0.2],
    roughness: 0.7,
    noiseType: 'perlin',
    noiseScale: 12,
    material: 'organic',
    breakPattern: 'crumble',
    density: 0.3,
    tags: ['grass', 'natural', 'green'],
  },
  moss: {
    color: [0.25, 0.4, 0.2],
    roughness: 0.9,
    noiseType: 'perlin',
    noiseScale: 10,
    material: 'organic',
    breakPattern: 'crumble',
    density: 0.2,
    tags: ['moss', 'natural', 'green'],
  },
  dirt: {
    color: [0.4, 0.3, 0.2],
    roughness: 0.95,
    noiseType: 'perlin',
    noiseScale: 8,
    material: 'organic',
    breakPattern: 'crumble',
    density: 1.5,
    tags: ['dirt', 'earth', 'natural'],
  },
  sand: {
    color: [0.85, 0.75, 0.55],
    roughness: 0.85,
    noiseType: 'perlin',
    noiseScale: 20,
    material: 'organic',
    breakPattern: 'crumble',
    density: 1.6,
    tags: ['sand', 'beach', 'desert'],
  },

  // Building materials
  brick: {
    color: [0.7, 0.35, 0.25],
    roughness: 0.75,
    noiseType: 'perlin',
    noiseScale: 6,
    material: 'stone',
    breakPattern: 'crumble',
    density: 1.9,
    tags: ['brick', 'building', 'red'],
  },
  concrete: {
    color: [0.6, 0.58, 0.55],
    roughness: 0.7,
    noiseType: 'perlin',
    noiseScale: 4,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.4,
    tags: ['concrete', 'building', 'modern'],
  },

  // Fantasy/Magic variants
  magic: {
    color: [0.6, 0.3, 0.9],
    roughness: 0.1,
    transparency: 0.4,
    noiseType: 'worley',
    noiseScale: 5,
    material: 'crystal',
    breakPattern: 'dissolve',
    density: 1.0,
    tags: ['magic', 'fantasy', 'glowing'],
  },
  lava: {
    color: [0.95, 0.4, 0.1],
    roughness: 0.6,
    noiseType: 'crackle',
    noiseScale: 6,
    material: 'liquid',
    breakPattern: 'melt',
    density: 3.1,
    tags: ['lava', 'hot', 'volcanic'],
  },
  water: {
    color: [0.3, 0.5, 0.8],
    roughness: 0.05,
    transparency: 0.3,
    noiseType: 'perlin',
    noiseScale: 8,
    material: 'liquid',
    breakPattern: 'dissolve',
    density: 1.0,
    tags: ['water', 'liquid', 'blue'],
  },
}

/** Color modifiers based on descriptive words */
const COLOR_MODIFIERS: Record<
  string,
  Partial<{ colorShift: ColorShift3; roughnessShift: number }>
> = {
  dark: { colorShift: [-0.2, -0.2, -0.2] },
  light: { colorShift: [0.2, 0.2, 0.2] },
  bright: { colorShift: [0.15, 0.15, 0.15], roughnessShift: -0.1 },
  pale: { colorShift: [0.1, 0.1, 0.12] },
  deep: { colorShift: [-0.1, -0.1, -0.05] },
  weathered: { roughnessShift: 0.2 },
  polished: { roughnessShift: -0.3 },
  rough: { roughnessShift: 0.25 },
  smooth: { roughnessShift: -0.2 },
  old: { roughnessShift: 0.15 },
  new: { roughnessShift: -0.1 },
  ancient: { roughnessShift: 0.2 },
  fresh: { roughnessShift: -0.15 },
  wet: { roughnessShift: -0.25 },
  dry: { roughnessShift: 0.1 },
  dusty: { roughnessShift: 0.2 },
  shiny: { roughnessShift: -0.35 },
  matte: { roughnessShift: 0.2 },
  glossy: { roughnessShift: -0.4 },
  // Color-specific modifiers
  red: { colorShift: [0.3, -0.1, -0.1] },
  blue: { colorShift: [-0.1, -0.05, 0.3] },
  green: { colorShift: [-0.1, 0.25, -0.1] },
  yellow: { colorShift: [0.25, 0.2, -0.15] },
  orange: { colorShift: [0.3, 0.1, -0.15] },
  purple: { colorShift: [0.15, -0.1, 0.25] },
  pink: { colorShift: [0.25, 0.05, 0.15] },
  white: { colorShift: [0.3, 0.3, 0.3] },
  black: { colorShift: [-0.35, -0.35, -0.35] },
  gray: { colorShift: [0, 0, 0] },
  grey: { colorShift: [0, 0, 0] },
  brown: { colorShift: [0.1, -0.05, -0.15] },
  cyan: { colorShift: [-0.1, 0.2, 0.25] },
  magenta: { colorShift: [0.2, -0.1, 0.2] },
}

/** Gradient patterns based on descriptions */
const GRADIENT_PATTERNS: Record<
  string,
  { axis: GradientAxis; factor: number; colorShift: ColorShift3 }[]
> = {
  top: [{ axis: 'y', factor: 0.3, colorShift: [0.1, 0.1, 0.1] }],
  bottom: [{ axis: 'y', factor: -0.3, colorShift: [-0.1, -0.1, -0.1] }],
  vertical: [{ axis: 'y', factor: 0.4, colorShift: [0.15, 0.1, 0.05] }],
  horizontal: [{ axis: 'x', factor: 0.3, colorShift: [0.1, 0.05, 0.1] }],
  radial: [{ axis: 'radial', factor: 0.25, colorShift: [-0.1, -0.1, 0.1] }],
  center: [{ axis: 'radial', factor: -0.3, colorShift: [0.1, 0.1, 0.15] }],
  edge: [{ axis: 'radial', factor: 0.35, colorShift: [-0.15, -0.1, -0.05] }],
  layered: [
    { axis: 'y', factor: 0.25, colorShift: [0.1, 0.05, 0] },
    { axis: 'x', factor: 0.15, colorShift: [0, 0.05, 0.1] },
  ],
}

/**
 * Generates a unique cube ID based on timestamp and random suffix
 */
function generateCubeId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `gen_${timestamp}_${random}`
}

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Applies color shift to a base color, clamping results to valid range
 */
function applyColorShift(base: Color3, shift: ColorShift3): Color3 {
  return [
    clamp(base[0] + shift[0], 0, 1),
    clamp(base[1] + shift[1], 0, 1),
    clamp(base[2] + shift[2], 0, 1),
  ]
}

/**
 * Tokenizes and normalizes a prompt for keyword matching
 */
function tokenizePrompt(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^\wа-яёА-ЯЁ\s]/g, ' ') // Handle both English and Russian
    .split(/\s+/)
    .filter((word) => word.length > 1)
}

/**
 * Translates common Russian material words to English
 */
const RUSSIAN_TRANSLATIONS: Record<string, string> = {
  камень: 'stone',
  камня: 'stone',
  каменный: 'stone',
  каменная: 'stone',
  дерево: 'wood',
  деревянный: 'wood',
  деревянная: 'wood',
  металл: 'metal',
  металлический: 'metal',
  металлическая: 'metal',
  стекло: 'glass',
  стеклянный: 'glass',
  стеклянная: 'glass',
  кристалл: 'crystal',
  кристаллический: 'crystal',
  лёд: 'ice',
  лед: 'ice',
  ледяной: 'ice',
  ледяная: 'ice',
  трава: 'grass',
  травяной: 'grass',
  мох: 'moss',
  мшистый: 'moss',
  песок: 'sand',
  песчаный: 'sand',
  песчаная: 'sand',
  кирпич: 'brick',
  кирпичный: 'brick',
  кирпичная: 'brick',
  бетон: 'concrete',
  бетонный: 'concrete',
  гранит: 'granite',
  гранитный: 'granite',
  мрамор: 'marble',
  мраморный: 'marble',
  золото: 'gold',
  золотой: 'gold',
  золотая: 'gold',
  медь: 'copper',
  медный: 'copper',
  медная: 'copper',
  железо: 'iron',
  железный: 'iron',
  железная: 'iron',
  сталь: 'steel',
  стальной: 'steel',
  стальная: 'steel',
  ржавый: 'rust',
  ржавая: 'rust',
  ржавчина: 'rust',
  вода: 'water',
  водяной: 'water',
  водяная: 'water',
  лава: 'lava',
  лавовый: 'lava',
  магия: 'magic',
  магический: 'magic',
  магическая: 'magic',
  дуб: 'oak',
  дубовый: 'oak',
  береза: 'birch',
  берёза: 'birch',
  берёзовый: 'birch',
  кора: 'bark',
  грязь: 'dirt',
  земля: 'dirt',
  земляной: 'dirt',
  булыжник: 'cobblestone',
  // Color words
  темный: 'dark',
  тёмный: 'dark',
  темная: 'dark',
  тёмная: 'dark',
  светлый: 'light',
  светлая: 'light',
  яркий: 'bright',
  яркая: 'bright',
  красный: 'red',
  красная: 'red',
  синий: 'blue',
  синяя: 'blue',
  зеленый: 'green',
  зелёный: 'green',
  зеленая: 'green',
  зелёная: 'green',
  желтый: 'yellow',
  жёлтый: 'yellow',
  желтая: 'yellow',
  жёлтая: 'yellow',
  белый: 'white',
  белая: 'white',
  черный: 'black',
  чёрный: 'black',
  черная: 'black',
  чёрная: 'black',
  серый: 'gray',
  серая: 'gray',
  коричневый: 'brown',
  коричневая: 'brown',
  фиолетовый: 'purple',
  фиолетовая: 'purple',
  оранжевый: 'orange',
  оранжевая: 'orange',
  розовый: 'pink',
  розовая: 'pink',
  // Texture words
  полированный: 'polished',
  полированная: 'polished',
  шероховатый: 'rough',
  шероховатая: 'rough',
  гладкий: 'smooth',
  гладкая: 'smooth',
  блестящий: 'shiny',
  блестящая: 'shiny',
  матовый: 'matte',
  матовая: 'matte',
  старый: 'old',
  старая: 'old',
  новый: 'new',
  новая: 'new',
  древний: 'ancient',
  древняя: 'ancient',
  мокрый: 'wet',
  мокрая: 'wet',
  сухой: 'dry',
  сухая: 'dry',
  пыльный: 'dusty',
  пыльная: 'dusty',
  выветренный: 'weathered',
  выветренная: 'weathered',
  замерзший: 'frozen',
  замерзшая: 'frozen',
  замороженный: 'frozen',
  замороженная: 'frozen',
  светящийся: 'glowing',
  светящаяся: 'glowing',
}

/**
 * Translates tokens from Russian to English where possible
 */
function translateTokens(tokens: string[]): string[] {
  return tokens.map((token) => RUSSIAN_TRANSLATIONS[token] || token)
}

/**
 * Finds the best matching material from keywords
 */
function findMaterialMatch(tokens: string[]): {
  material: Partial<MaterialKeywords> | null
  score: number
} {
  let bestMatch: Partial<MaterialKeywords> | null = null
  let bestScore = 0

  for (const token of tokens) {
    if (MATERIAL_KEYWORDS[token]) {
      const score = token.length // Longer matches are more specific
      if (score > bestScore) {
        bestMatch = MATERIAL_KEYWORDS[token]
        bestScore = score
      }
    }
  }

  return { material: bestMatch, score: bestScore }
}

/**
 * Collects color and texture modifiers from tokens
 */
function collectModifiers(tokens: string[]): {
  colorShift: ColorShift3
  roughnessShift: number
  modifierCount: number
} {
  let colorShift: ColorShift3 = [0, 0, 0]
  let roughnessShift = 0
  let modifierCount = 0

  for (const token of tokens) {
    const modifier = COLOR_MODIFIERS[token]
    if (modifier) {
      modifierCount++
      if (modifier.colorShift) {
        colorShift = [
          colorShift[0] + modifier.colorShift[0],
          colorShift[1] + modifier.colorShift[1],
          colorShift[2] + modifier.colorShift[2],
        ]
      }
      if (modifier.roughnessShift !== undefined) {
        roughnessShift += modifier.roughnessShift
      }
    }
  }

  return { colorShift, roughnessShift, modifierCount }
}

/**
 * Collects gradient patterns from tokens
 */
function collectGradients(tokens: string[]): CubeGradient[] {
  const gradients: CubeGradient[] = []
  const usedAxes = new Set<GradientAxis>()

  for (const token of tokens) {
    const pattern = GRADIENT_PATTERNS[token]
    if (pattern) {
      for (const grad of pattern) {
        if (!usedAxes.has(grad.axis)) {
          gradients.push({ ...grad })
          usedAxes.add(grad.axis)
        }
      }
    }
  }

  return gradients
}

/**
 * Generates random parameters for a cube
 */
function generateRandomParameters(): Partial<MaterialKeywords> {
  const noiseTypes: NoiseType[] = ['perlin', 'worley', 'crackle']
  const materialTypes: MaterialType[] = [
    'stone',
    'wood',
    'metal',
    'glass',
    'organic',
    'crystal',
    'liquid',
  ]
  const breakPatterns: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']

  return {
    color: [
      Math.random() * 0.8 + 0.1,
      Math.random() * 0.8 + 0.1,
      Math.random() * 0.8 + 0.1,
    ] as Color3,
    roughness: Math.random() * 0.8 + 0.1,
    transparency: Math.random() > 0.7 ? Math.random() * 0.5 + 0.3 : 1.0,
    noiseType: noiseTypes[Math.floor(Math.random() * noiseTypes.length)],
    noiseScale: Math.random() * 15 + 2,
    material: materialTypes[Math.floor(Math.random() * materialTypes.length)],
    breakPattern: breakPatterns[Math.floor(Math.random() * breakPatterns.length)],
    density: Math.random() * 8 + 0.5,
    tags: ['generated', 'random'],
  }
}

/**
 * Main generation function - generates a SpectralCube from a text prompt
 *
 * @param prompt - Text description of the desired cube (supports English and Russian)
 * @returns GenerationResult with the generated cube and metadata
 */
export async function generateFromPrompt(prompt: string): Promise<GenerationResult> {
  const warnings: string[] = []
  let method: 'keyword' | 'template' | 'random' | 'hybrid' = 'keyword'
  let confidence = 0

  // Tokenize and translate prompt
  const rawTokens = tokenizePrompt(prompt)
  const tokens = translateTokens(rawTokens)

  // Find material match
  const { material: baseMaterial, score: materialScore } = findMaterialMatch(tokens)

  // Collect modifiers
  const { colorShift, roughnessShift, modifierCount } = collectModifiers(tokens)

  // Collect gradients
  const gradients = collectGradients(tokens)

  // Determine generation method and confidence
  let params: Partial<MaterialKeywords>

  if (baseMaterial && materialScore > 0) {
    params = { ...baseMaterial }
    confidence = Math.min(0.5 + materialScore * 0.1 + modifierCount * 0.05, 0.95)

    if (modifierCount > 0 || gradients.length > 0) {
      method = 'hybrid'
    }
  } else if (modifierCount > 0) {
    // No material but have modifiers - start with random and apply modifiers
    params = generateRandomParameters()
    method = 'hybrid'
    confidence = 0.3 + modifierCount * 0.1
    warnings.push('No specific material recognized, using random base with detected modifiers')
  } else {
    // Full random generation
    params = generateRandomParameters()
    method = 'random'
    confidence = 0.2
    warnings.push('No recognizable keywords found, using random generation')
  }

  // Apply color and roughness modifiers
  const baseColor = params.color || [0.5, 0.5, 0.5]
  const finalColor = applyColorShift(baseColor as Color3, colorShift)

  const baseRoughness = params.roughness ?? 0.5
  const finalRoughness = clamp(baseRoughness + roughnessShift, 0, 1)

  // Build the SpectralCube
  const cube: SpectralCube = {
    id: generateCubeId(),
    prompt: prompt,
    base: {
      color: finalColor,
      roughness: finalRoughness,
      transparency: params.transparency ?? 1.0,
    },
    gradients: gradients.length > 0 ? gradients : undefined,
    noise: {
      type: params.noiseType || 'perlin',
      scale: params.noiseScale || 8,
      octaves: 4,
      persistence: 0.5,
    },
    physics: {
      material: params.material || 'stone',
      density: params.density || 2.5,
      break_pattern: params.breakPattern || 'crumble',
    },
    meta: {
      name: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      tags: [...(params.tags || []), 'generated'],
      author: 'TinyLLM',
      created: new Date().toISOString(),
    },
  }

  // Validate the generated cube
  const validationResult = validateCube(cube)
  if (!validationResult.valid) {
    warnings.push(
      `Validation warnings: ${validationResult.errors.map((e) => e.message).join(', ')}`
    )
    confidence *= 0.8
  }

  return {
    success: true,
    cube,
    method,
    confidence,
    warnings,
  }
}

/**
 * Generates a cube from a preset template
 *
 * @param templateName - Name of the preset template
 * @returns GenerationResult with the template cube
 */
export async function generateFromTemplate(templateName: string): Promise<GenerationResult> {
  const normalizedName = templateName.toLowerCase().trim()
  const material = MATERIAL_KEYWORDS[normalizedName]

  if (!material) {
    return {
      success: false,
      cube: null,
      method: 'template',
      confidence: 0,
      warnings: [
        `Template "${templateName}" not found. Available: ${Object.keys(MATERIAL_KEYWORDS).join(', ')}`,
      ],
    }
  }

  const cube: SpectralCube = {
    id: generateCubeId(),
    prompt: `${templateName} (template)`,
    base: {
      color: material.color || [0.5, 0.5, 0.5],
      roughness: material.roughness ?? 0.5,
      transparency: material.transparency ?? 1.0,
    },
    noise: {
      type: material.noiseType || 'perlin',
      scale: material.noiseScale || 8,
      octaves: 4,
      persistence: 0.5,
    },
    physics: {
      material: material.material || 'stone',
      density: material.density || 2.5,
      break_pattern: material.breakPattern || 'crumble',
    },
    meta: {
      name: templateName.charAt(0).toUpperCase() + templateName.slice(1),
      tags: material.tags || [],
      author: 'TinyLLM',
      created: new Date().toISOString(),
    },
  }

  return {
    success: true,
    cube,
    method: 'template',
    confidence: 1.0,
    warnings: [],
  }
}

/**
 * Generates a completely random cube
 *
 * @returns GenerationResult with a random cube
 */
export async function generateRandom(): Promise<GenerationResult> {
  const params = generateRandomParameters()

  const cube: SpectralCube = {
    id: generateCubeId(),
    prompt: 'Random generation',
    base: {
      color: params.color as Color3,
      roughness: params.roughness ?? 0.5,
      transparency: params.transparency ?? 1.0,
    },
    noise: {
      type: params.noiseType || 'perlin',
      scale: params.noiseScale || 8,
      octaves: 4,
      persistence: 0.5,
    },
    physics: {
      material: params.material || 'stone',
      density: params.density || 2.5,
      break_pattern: params.breakPattern || 'crumble',
    },
    meta: {
      name: 'Random Cube',
      tags: ['generated', 'random'],
      author: 'TinyLLM',
      created: new Date().toISOString(),
    },
  }

  return {
    success: true,
    cube,
    method: 'random',
    confidence: 0.2,
    warnings: [],
  }
}

/**
 * Returns the list of available template names
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(MATERIAL_KEYWORDS)
}

/**
 * Checks if TinyLLM is available and ready
 * In this implementation, it's always ready since we use rule-based generation
 */
export function isReady(): boolean {
  return true
}

/**
 * Initializes the TinyLLM module (no-op in this implementation)
 * Provided for API compatibility with potential future ML-based implementations
 */
export async function initialize(): Promise<void> {
  // No initialization needed for rule-based generation
  return Promise.resolve()
}

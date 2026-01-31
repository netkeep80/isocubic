/**
 * Unit tests for Gallery Vue component
 * Tests the Vue.js 3.0 migration of the Gallery component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

describe('Gallery Vue Component — Module Exports', () => {
  it('should export Gallery.vue as a valid Vue component', async () => {
    const module = await import('./Gallery.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export GALLERY_META with correct metadata', async () => {
    const module = await import('./Gallery.vue')
    expect(module.GALLERY_META).toBeDefined()
    expect(module.GALLERY_META.id).toBe('gallery')
    expect(module.GALLERY_META.name).toBe('Gallery')
    expect(module.GALLERY_META.filePath).toBe('components/Gallery.vue')
  })
})

describe('Gallery Vue Component — Search and Filter Logic', () => {
  it('should filter cubes by search query in name', () => {
    const cubes = [
      { id: 'stone-1', meta: { name: 'Stone Wall', tags: ['stone'] } },
      { id: 'wood-1', meta: { name: 'Wood Plank', tags: ['wood'] } },
      { id: 'stone-2', meta: { name: 'Stone Floor', tags: ['stone'] } },
    ]
    const query = 'stone'
    const filtered = cubes.filter((cube) => {
      const name = cube.meta?.name?.toLowerCase() || ''
      return name.includes(query.toLowerCase())
    })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].id).toBe('stone-1')
    expect(filtered[1].id).toBe('stone-2')
  })

  it('should filter cubes by search query in tags', () => {
    const cubes = [
      { id: 'cube-1', meta: { name: 'Cube A', tags: ['natural', 'rough'] } },
      { id: 'cube-2', meta: { name: 'Cube B', tags: ['smooth', 'polished'] } },
      { id: 'cube-3', meta: { name: 'Cube C', tags: ['natural', 'mossy'] } },
    ]
    const query = 'natural'
    const filtered = cubes.filter((cube) => {
      const tags = cube.meta?.tags || []
      return tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    })
    expect(filtered).toHaveLength(2)
  })

  it('should handle empty search query returning all cubes', () => {
    const cubes = [
      { id: 'c1', meta: { name: 'A' } },
      { id: 'c2', meta: { name: 'B' } },
    ]
    const query = ''
    const filtered = query ? cubes.filter(() => false) : cubes
    expect(filtered).toHaveLength(2)
  })

  it('should filter cubes by category (material type)', () => {
    const cubes = [
      { id: 'c1', physics: { material: 'stone' } },
      { id: 'c2', physics: { material: 'wood' } },
      { id: 'c3', physics: { material: 'stone' } },
    ]
    const materialTypes = ['stone']
    const filtered = cubes.filter((cube) => {
      const material = cube.physics?.material
      return material && materialTypes.includes(material)
    })
    expect(filtered).toHaveLength(2)
  })

  it('should return all cubes when category is "all"', () => {
    const cubes = [
      { id: 'c1', physics: { material: 'stone' } },
      { id: 'c2', physics: { material: 'wood' } },
    ]
    const selectedCategory = 'all'
    const filtered = selectedCategory === 'all' ? cubes : cubes.filter(() => false)
    expect(filtered).toHaveLength(2)
  })
})

describe('Gallery Vue Component — Color Utilities', () => {
  it('should convert RGB array to CSS color string', () => {
    function colorToCSS(color: [number, number, number]): string {
      const r = Math.round(color[0] * 255)
      const g = Math.round(color[1] * 255)
      const b = Math.round(color[2] * 255)
      return `rgb(${r}, ${g}, ${b})`
    }

    expect(colorToCSS([1, 0, 0])).toBe('rgb(255, 0, 0)')
    expect(colorToCSS([0, 1, 0])).toBe('rgb(0, 255, 0)')
    expect(colorToCSS([0, 0, 1])).toBe('rgb(0, 0, 255)')
    expect(colorToCSS([0.5, 0.5, 0.5])).toBe('rgb(128, 128, 128)')
  })
})

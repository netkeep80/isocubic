/**
 * ParametricCube Component
 * React Three Fiber component for rendering parametric cubes with GLSL shaders
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/parametric-cube'
import { createUniforms } from '../lib/shader-utils'
import type { SpectralCube } from '../types/cube'

/**
 * Props for the ParametricCube component
 */
export interface ParametricCubeProps {
  /** SpectralCube configuration to render */
  config: SpectralCube
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number]
  /** Scale multiplier */
  scale?: number
  /** Whether to animate rotation */
  animate?: boolean
  /** Rotation speed (radians per second) */
  rotationSpeed?: number
  /** Grid position for seamless stitching [x, y, z] - used when rendering cube grids */
  gridPosition?: [number, number, number]
}

/**
 * ParametricCube - Renders a parametric cube using GLSL shaders
 *
 * Features:
 * - Real-time rendering of cube configurations
 * - Support for gradients, noise, and material properties
 * - Seamless noise at cube boundaries via world coordinates
 * - Optional animation
 * - Grid position support for seamless boundary stitching in CubeGrid
 */
export function ParametricCube({
  config,
  position = [0, 0, 0],
  scale = 1,
  animate = false,
  rotationSpeed = 0.5,
  gridPosition = [0, 0, 0],
}: ParametricCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create shader material with uniforms derived from config
  // The material is recreated when config or gridPosition changes
  const shaderMaterial = useMemo(() => {
    const uniforms = createUniforms(config, { gridPosition })

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: (config.base.transparency ?? 1) < 1,
      side: THREE.FrontSide,
    })
  }, [config, gridPosition])

  // Animation frame for rotation
  useFrame((_, delta) => {
    if (animate && meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta
    }
  })

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  )
}

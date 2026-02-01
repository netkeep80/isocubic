<!--
  PromptGeneratorWindow.vue — Window wrapper for PromptGenerator component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import PromptGenerator from '../PromptGenerator.vue'
import { PROMPT_GENERATOR_META } from '../PromptGenerator.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

const emit = defineEmits<{
  cubeGenerated: [cube: CubeConfig]
  cubesGenerated: [cubes: CubeConfig[]]
}>()

function handleCubeGenerated(cube: CubeConfig) {
  emit('cubeGenerated', cube)
}

function handleCubesGenerated(cubes: CubeConfig[]) {
  emit('cubesGenerated', cubes)
}
</script>

<template>
  <ComponentInfo :meta="PROMPT_GENERATOR_META">
    <PromptGenerator
      @cube-generated="handleCubeGenerated"
      @cubes-generated="handleCubesGenerated"
    />
  </ComponentInfo>
</template>

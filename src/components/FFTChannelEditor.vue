<!-- FFTChannelEditor component for editing FFT coefficients by channel (R, G, B, A) * * This component provides advanced UI for editing FFT channel data including: * - Tabs for switching between R/G/B/A channels * - DC component editor (amplitude and phase with circular widget) * - Coefficient editor (up to 8 coefficients per channel) * - Spectrum visualization showing frequency components * - Presets for common FFT configurations * * ISSUE 27: Редактор FFT-каналов (FFT Channels Editor) -->
<script lang="ts">
// Re-export presets for backward compatibility
import { FFT_CHANNEL_PRESETS } from '../lib/fft-presets'
import type { FFTChannelPreset } from '../lib/fft-presets'
export { FFT_CHANNEL_PRESETS }
export type { FFTChannelPreset }

/** Channel identifiers */
export type ChannelId = 'R' | 'G' | 'B' | 'A'
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FFTCubeConfig, FFTChannel, FFTChannels, FFTCoefficient } from '../types/cube'
import { createDefaultFFTChannel } from '../types/cube'
import { calculateChannelEnergy, calculateTotalEnergy } from '../lib/energyPhysics'

/** Available channels in order */
const CHANNELS: ChannelId[] = ['R', 'G', 'B', 'A']

/** Channel display names and colors */
const CHANNEL_INFO: Record<ChannelId, { name: string; color: string; bgColor: string }> = {
  R: { name: 'Red', color: '#dc3545', bgColor: 'rgba(220, 53, 69, 0.1)' },
  G: { name: 'Green', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)' },
  B: { name: 'Blue', color: '#007bff', bgColor: 'rgba(0, 123, 255, 0.1)' },
  A: { name: 'Alpha', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)' },
}

/** Maximum coefficients per channel (shader limitation) */
const MAX_COEFFICIENTS = 8

/** Props for FFTChannelEditor component */
const props = withDefaults(
  defineProps<{
    /** Current FFT cube configuration */
    currentCube: FFTCubeConfig | null
    /** Custom class name */
    className?: string
  }>(),
  {
    className: '',
  }
)

const emit = defineEmits<{
  (e: 'update:cube', cube: FFTCubeConfig): void
}>()

// Local state
const activeChannel = ref<ChannelId>('R')
const showPresets = ref(false)
const isDraggingPhase = ref(false)

// Get the current channel data
const currentChannel = computed<FFTChannel | undefined>(() => {
  if (!props.currentCube) return undefined
  return props.currentCube.channels[activeChannel.value]
})

// Calculate max frequency based on FFT size
const maxFreq = computed(() => {
  return props.currentCube ? props.currentCube.fft_size / 2 : 4
})

// Calculate total energy
const totalEnergy = computed(() => {
  return props.currentCube ? calculateTotalEnergy(props.currentCube) : 0
})

// Spectrum visualization computed values
const spectrumBars = computed(() => {
  const channel = currentChannel.value
  if (!channel) return []

  const color = CHANNEL_INFO[activeChannel.value].color
  const bars: { label: string; amplitude: number; color: string }[] = [
    { label: 'DC', amplitude: channel.dcAmplitude, color },
  ]

  channel.coefficients.forEach((coeff) => {
    const freqLabel = `(${coeff.freqX},${coeff.freqY},${coeff.freqZ})`
    bars.push({
      label: freqLabel,
      amplitude: coeff.amplitude,
      color,
    })
  })

  return bars
})

const spectrumMaxAmplitude = computed(() => {
  const channel = currentChannel.value
  if (!channel) return 0.1
  return Math.max(channel.dcAmplitude, ...channel.coefficients.map((c) => c.amplitude), 0.1)
})

const spectrumChannelEnergy = computed(() => {
  const channel = currentChannel.value
  if (!channel) return 0
  return calculateChannelEnergy(channel)
})

// Phase selector computed values
const phaseSelectorSize = 60
const phaseSelectorCenter = phaseSelectorSize / 2
const phaseSelectorRadius = phaseSelectorSize / 2 - 4
const phaseSelectorHandleRadius = 6

const phaseHandleX = computed(() => {
  const phase = currentChannel.value?.dcPhase ?? 0
  return phaseSelectorCenter + phaseSelectorRadius * Math.cos(phase - Math.PI / 2)
})

const phaseHandleY = computed(() => {
  const phase = currentChannel.value?.dcPhase ?? 0
  return phaseSelectorCenter + phaseSelectorRadius * Math.sin(phase - Math.PI / 2)
})

const phaseArcD = computed(() => {
  const phase = currentChannel.value?.dcPhase ?? 0
  return `M ${phaseSelectorCenter} ${phaseSelectorCenter - phaseSelectorRadius} A ${phaseSelectorRadius} ${phaseSelectorRadius} 0 ${phase > Math.PI ? 1 : 0} 1 ${phaseHandleX.value} ${phaseHandleY.value}`
})

// Update a single channel
function updateChannel(channelId: ChannelId, updates: Partial<FFTChannel>) {
  if (!props.currentCube) return

  const existingChannel = props.currentCube.channels[channelId] || createDefaultFFTChannel()
  const updatedChannel: FFTChannel = {
    ...existingChannel,
    ...updates,
  }

  const updatedChannels: FFTChannels = {
    ...props.currentCube.channels,
    [channelId]: updatedChannel,
  }

  const updatedCube: FFTCubeConfig = {
    ...props.currentCube,
    channels: updatedChannels,
    meta: {
      ...props.currentCube.meta,
      modified: new Date().toISOString(),
    },
  }

  // Recalculate current energy
  updatedCube.current_energy = calculateTotalEnergy(updatedCube)

  emit('update:cube', updatedCube)
}

// Update DC amplitude
function updateDCAmplitude(value: number) {
  updateChannel(activeChannel.value, { dcAmplitude: value })
}

// Update DC phase
function updateDCPhase(value: number) {
  updateChannel(activeChannel.value, { dcPhase: value })
}

// Phase selector mouse handler
function handlePhaseMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
  const x = e.clientX - rect.left - phaseSelectorCenter
  const y = e.clientY - rect.top - phaseSelectorCenter
  let angle = Math.atan2(y, x) + Math.PI / 2
  if (angle < 0) angle += 2 * Math.PI
  updateDCPhase(angle)
}

// Update a coefficient
function updateCoefficient(index: number, coeff: FFTCoefficient) {
  if (!currentChannel.value) return
  const newCoefficients = [...currentChannel.value.coefficients]
  newCoefficients[index] = coeff
  updateChannel(activeChannel.value, { coefficients: newCoefficients })
}

// Add a new coefficient
function addCoefficient() {
  if (!currentChannel.value) return
  if (currentChannel.value.coefficients.length >= MAX_COEFFICIENTS) return

  const newCoefficients: FFTCoefficient[] = [
    ...currentChannel.value.coefficients,
    {
      amplitude: 0.5,
      phase: 0,
      freqX: 1,
      freqY: 0,
      freqZ: 0,
    },
  ]
  updateChannel(activeChannel.value, { coefficients: newCoefficients })
}

// Remove a coefficient
function removeCoefficient(index: number) {
  if (!currentChannel.value) return
  const newCoefficients = currentChannel.value.coefficients.filter((_, i) => i !== index)
  updateChannel(activeChannel.value, { coefficients: newCoefficients })
}

// Apply a preset
function applyPreset(preset: FFTChannelPreset) {
  if (!props.currentCube) return

  const updatedCube: FFTCubeConfig = {
    ...props.currentCube,
    channels: { ...preset.channels },
    meta: {
      ...props.currentCube.meta,
      modified: new Date().toISOString(),
    },
  }

  updatedCube.current_energy = calculateTotalEnergy(updatedCube)
  emit('update:cube', updatedCube)
  showPresets.value = false
}

// Helper to get bar height percentage
function barHeight(amplitude: number): string {
  return `${(amplitude / spectrumMaxAmplitude.value) * 100}%`
}

// Helper to get bar opacity
function barOpacity(amplitude: number): number {
  return 0.3 + 0.7 * (amplitude / spectrumMaxAmplitude.value)
}
</script>

<template>
  <!-- Empty state -->
  <div v-if="!currentCube" :class="['fft-channel-editor', className]">
    <div class="fft-channel-editor__empty">
      <p>No FFT cube selected</p>
      <p>Select a magical cube to edit its FFT channels</p>
    </div>
  </div>

  <!-- Main editor -->
  <div v-else :class="['fft-channel-editor', className]">
    <div class="fft-channel-editor__header">
      <h3 class="fft-channel-editor__title">FFT Channels</h3>
      <button
        type="button"
        class="fft-channel-editor__presets-btn"
        @click="showPresets = !showPresets"
      >
        {{ showPresets ? 'Hide Presets' : 'Presets' }}
      </button>
    </div>

    <!-- Presets panel -->
    <div v-if="showPresets" class="fft-channel-editor__presets-panel">
      <h4>Apply Preset</h4>
      <div class="fft-channel-editor__presets-list">
        <button
          v-for="preset in FFT_CHANNEL_PRESETS"
          :key="preset.id"
          type="button"
          class="fft-channel-editor__preset-item"
          @click="applyPreset(preset)"
        >
          <span class="fft-channel-editor__preset-name">{{ preset.name }}</span>
          <span class="fft-channel-editor__preset-desc">{{ preset.description }}</span>
        </button>
      </div>
    </div>

    <!-- Total energy indicator -->
    <div class="fft-channel-editor__total-energy">
      <span>Total Energy:</span>
      <span class="fft-channel-editor__total-energy-value">{{ totalEnergy.toFixed(2) }}</span>
    </div>

    <!-- Channel tabs -->
    <div class="fft-channel-editor__tabs">
      <button
        v-for="channelId in CHANNELS"
        :key="channelId"
        type="button"
        :class="[
          'fft-channel-editor__tab',
          activeChannel === channelId ? 'fft-channel-editor__tab--active' : '',
        ]"
        :style="{
          borderColor: activeChannel === channelId ? CHANNEL_INFO[channelId].color : 'transparent',
          backgroundColor:
            activeChannel === channelId ? CHANNEL_INFO[channelId].bgColor : 'transparent',
        }"
        @click="activeChannel = channelId"
      >
        <span
          class="fft-channel-editor__tab-dot"
          :style="{
            backgroundColor: CHANNEL_INFO[channelId].color,
            opacity:
              currentCube.channels[channelId] &&
              (currentCube.channels[channelId]!.dcAmplitude > 0 ||
                currentCube.channels[channelId]!.coefficients.length > 0)
                ? 1
                : 0.3,
          }"
        />
        <span class="fft-channel-editor__tab-name">{{ CHANNEL_INFO[channelId].name }}</span>
      </button>
    </div>

    <!-- Channel content -->
    <div
      class="fft-channel-editor__content"
      :style="{ backgroundColor: CHANNEL_INFO[activeChannel].bgColor }"
    >
      <!-- Spectrum visualization -->
      <div class="fft-channel-editor__section">
        <h4 class="fft-channel-editor__section-title">Spectrum</h4>

        <!-- Spectrum: empty state -->
        <div
          v-if="!currentChannel"
          class="fft-channel-editor__spectrum fft-channel-editor__spectrum--empty"
        >
          <span>No data</span>
        </div>

        <!-- Spectrum: with data -->
        <div v-else class="fft-channel-editor__spectrum">
          <div class="fft-channel-editor__spectrum-bars">
            <div
              v-for="(bar, idx) in spectrumBars"
              :key="idx"
              class="fft-channel-editor__spectrum-bar-container"
            >
              <div
                class="fft-channel-editor__spectrum-bar"
                :style="{
                  height: barHeight(bar.amplitude),
                  backgroundColor: bar.color,
                  opacity: barOpacity(bar.amplitude),
                }"
                :title="`${bar.label}: ${bar.amplitude.toFixed(3)}`"
              />
              <span class="fft-channel-editor__spectrum-label">{{ bar.label }}</span>
            </div>
          </div>
          <div class="fft-channel-editor__spectrum-energy">
            Energy: {{ spectrumChannelEnergy.toFixed(2) }}
          </div>
        </div>
      </div>

      <!-- DC Component -->
      <div class="fft-channel-editor__section">
        <h4 class="fft-channel-editor__section-title">DC Component (Average)</h4>
        <div class="fft-channel-editor__dc-editor">
          <div class="fft-channel-editor__dc-amplitude">
            <label>
              Amplitude
              <span class="fft-channel-editor__value">
                {{ (currentChannel?.dcAmplitude ?? 0).toFixed(2) }}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              :value="currentChannel?.dcAmplitude ?? 0"
              @input="updateDCAmplitude(parseFloat(($event.target as HTMLInputElement).value))"
            />
          </div>
          <div class="fft-channel-editor__dc-phase">
            <label>
              Phase
              <span class="fft-channel-editor__value">
                {{ (((currentChannel?.dcPhase ?? 0) * 180) / Math.PI).toFixed(0) }}&deg;
              </span>
            </label>
            <!-- PhaseSelector inline -->
            <svg
              :width="phaseSelectorSize"
              :height="phaseSelectorSize"
              class="fft-channel-editor__phase-selector"
              style="cursor: pointer"
              @mousedown="isDraggingPhase = true"
              @mouseup="isDraggingPhase = false"
              @mouseleave="isDraggingPhase = false"
              @mousemove="isDraggingPhase ? handlePhaseMouseMove($event) : undefined"
            >
              <!-- Background circle -->
              <circle
                :cx="phaseSelectorCenter"
                :cy="phaseSelectorCenter"
                :r="phaseSelectorRadius"
                fill="none"
                stroke="#ddd"
                stroke-width="2"
              />
              <!-- Phase arc -->
              <path
                :d="phaseArcD"
                fill="none"
                :stroke="CHANNEL_INFO[activeChannel].color"
                stroke-width="3"
                stroke-linecap="round"
              />
              <!-- Handle -->
              <circle
                :cx="phaseHandleX"
                :cy="phaseHandleY"
                :r="phaseSelectorHandleRadius"
                :fill="CHANNEL_INFO[activeChannel].color"
                stroke="white"
                stroke-width="2"
              />
              <!-- Center dot -->
              <circle :cx="phaseSelectorCenter" :cy="phaseSelectorCenter" r="3" fill="#666" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Coefficients -->
      <div class="fft-channel-editor__section">
        <div class="fft-channel-editor__coefficients-header">
          <h4 class="fft-channel-editor__section-title">
            Coefficients ({{ currentChannel?.coefficients.length ?? 0 }}/{{ MAX_COEFFICIENTS }})
          </h4>
          <button
            type="button"
            class="fft-channel-editor__add-btn"
            :disabled="!currentChannel || currentChannel.coefficients.length >= MAX_COEFFICIENTS"
            title="Add coefficient"
            @click="addCoefficient"
          >
            + Add
          </button>
        </div>

        <!-- Coefficients list -->
        <div
          v-if="currentChannel && currentChannel.coefficients.length > 0"
          class="fft-channel-editor__coefficients-list"
        >
          <div
            v-for="(coeff, idx) in currentChannel.coefficients"
            :key="idx"
            class="fft-channel-editor__coefficient"
          >
            <div class="fft-channel-editor__coefficient-header">
              <span class="fft-channel-editor__coefficient-index">#{{ idx + 1 }}</span>
              <button
                type="button"
                class="fft-channel-editor__coefficient-remove"
                title="Remove coefficient"
                @click="removeCoefficient(idx)"
              >
                &times;
              </button>
            </div>

            <div class="fft-channel-editor__coefficient-fields">
              <!-- Amplitude -->
              <div class="fft-channel-editor__field fft-channel-editor__field--amplitude">
                <label>
                  Amplitude
                  <span class="fft-channel-editor__value">{{ coeff.amplitude.toFixed(2) }}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  :value="coeff.amplitude"
                  @input="
                    updateCoefficient(idx, {
                      ...coeff,
                      amplitude: parseFloat(($event.target as HTMLInputElement).value),
                    })
                  "
                />
              </div>

              <!-- Phase -->
              <div class="fft-channel-editor__field fft-channel-editor__field--phase">
                <label>
                  Phase
                  <span class="fft-channel-editor__value">
                    {{ ((coeff.phase * 180) / Math.PI).toFixed(0) }}&deg;
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  :max="2 * Math.PI"
                  step="0.01"
                  :value="coeff.phase"
                  @input="
                    updateCoefficient(idx, {
                      ...coeff,
                      phase: parseFloat(($event.target as HTMLInputElement).value),
                    })
                  "
                />
              </div>

              <!-- Frequency indices -->
              <div class="fft-channel-editor__freq-fields">
                <div class="fft-channel-editor__field fft-channel-editor__field--freq">
                  <label>freqX</label>
                  <input
                    type="number"
                    min="0"
                    :max="maxFreq"
                    :value="coeff.freqX"
                    @input="
                      updateCoefficient(idx, {
                        ...coeff,
                        freqX: parseInt(($event.target as HTMLInputElement).value, 10) || 0,
                      })
                    "
                  />
                </div>
                <div class="fft-channel-editor__field fft-channel-editor__field--freq">
                  <label>freqY</label>
                  <input
                    type="number"
                    min="0"
                    :max="maxFreq"
                    :value="coeff.freqY"
                    @input="
                      updateCoefficient(idx, {
                        ...coeff,
                        freqY: parseInt(($event.target as HTMLInputElement).value, 10) || 0,
                      })
                    "
                  />
                </div>
                <div class="fft-channel-editor__field fft-channel-editor__field--freq">
                  <label>freqZ</label>
                  <input
                    type="number"
                    min="0"
                    :max="maxFreq"
                    :value="coeff.freqZ"
                    @input="
                      updateCoefficient(idx, {
                        ...coeff,
                        freqZ: parseInt(($event.target as HTMLInputElement).value, 10) || 0,
                      })
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No coefficients state -->
        <div v-else class="fft-channel-editor__no-coefficients">
          <p>No frequency coefficients</p>
          <p>Add coefficients to create wave patterns</p>
        </div>
      </div>
    </div>
  </div>
</template>

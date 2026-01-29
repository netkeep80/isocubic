/**
 * Tests for FFTParamEditor component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FFTParamEditor } from './FFTParamEditor'
import type { FFTCubeConfig } from '../types/cube'
import { createDefaultFFTCube, FFT_CUBE_DEFAULTS } from '../types/cube'

describe('FFTParamEditor', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>
  let mockOnModeChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
    mockOnModeChange = vi.fn()
  })

  describe('Empty state', () => {
    it('renders empty state when no cube is provided', () => {
      render(<FFTParamEditor currentCube={null} />)
      expect(screen.getByText('No FFT cube selected')).toBeInTheDocument()
      expect(
        screen.getByText('Select a magical cube from the gallery or create a new one')
      ).toBeInTheDocument()
    })
  })

  describe('With cube', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.meta = {
        name: 'Test FFT Cube',
        created: new Date().toISOString(),
      }
    })

    it('renders the editor title', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByText('FFT Cube Editor')).toBeInTheDocument()
    })

    it('renders the cube name input', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      expect(nameInput).toBeInTheDocument()
      expect(nameInput.value).toBe('Test FFT Cube')
    })

    it('renders reset button', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('renders section headers', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByText('Energy Settings')).toBeInTheDocument()
      expect(screen.getByText('FFT Physics')).toBeInTheDocument()
      expect(screen.getByText('Boundary Settings')).toBeInTheDocument()
    })
  })

  describe('Mode switcher', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('does not render mode switcher by default', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.queryByText('Cube Type')).not.toBeInTheDocument()
    })

    it('renders mode switcher when showModeSwitcher is true', () => {
      render(<FFTParamEditor currentCube={testCube} showModeSwitcher={true} />)
      expect(screen.getByText('Cube Type')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'SpectralCube' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'FFTCubeConfig' })).toBeInTheDocument()
    })

    it('calls onModeChange when mode button is clicked', () => {
      render(
        <FFTParamEditor
          currentCube={testCube}
          showModeSwitcher={true}
          editorMode="fft"
          onModeChange={mockOnModeChange}
        />
      )
      const spectralButton = screen.getByRole('button', { name: 'SpectralCube' })
      fireEvent.click(spectralButton)
      expect(mockOnModeChange).toHaveBeenCalledWith('spectral')
    })

    it('shows active state for current mode', () => {
      render(<FFTParamEditor currentCube={testCube} showModeSwitcher={true} editorMode="fft" />)
      const fftButton = screen.getByRole('button', { name: 'FFTCubeConfig' })
      expect(fftButton).toHaveClass('fft-editor__mode-btn--active')
    })
  })

  describe('Energy Settings section', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders is_magical checkbox', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByText('Is Magical')).toBeInTheDocument()
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    it('renders fft_size dropdown', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      const select = screen.getByLabelText('FFT Size') as HTMLSelectElement
      expect(select).toBeInTheDocument()
      expect(select.value).toBe(String(FFT_CUBE_DEFAULTS.fft_size))
    })

    it('renders energy capacity input', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Energy Capacity/)).toBeInTheDocument()
    })

    it('renders current energy indicator', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByText(/Current Energy/)).toBeInTheDocument()
    })

    it('calls onCubeUpdate when is_magical is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.is_magical).toBe(!testCube.is_magical)
    })

    it('calls onCubeUpdate when fft_size is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const select = screen.getByLabelText('FFT Size') as HTMLSelectElement
      fireEvent.change(select, { target: { value: '32' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.fft_size).toBe(32)
    })

    it('calls onCubeUpdate when energy_capacity is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const input = screen.getByRole('spinbutton') as HTMLInputElement
      fireEvent.change(input, { target: { value: '200' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.energy_capacity).toBe(200)
    })
  })

  describe('FFT Physics section', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders material type selector', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      const materialSelect = screen.getByLabelText('Material') as HTMLSelectElement
      expect(materialSelect).toBeInTheDocument()
    })

    it('renders density slider', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Density/)).toBeInTheDocument()
    })

    it('renders break pattern selector', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText('Break Pattern')).toBeInTheDocument()
    })

    it('renders coherence loss slider', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Coherence Loss/)).toBeInTheDocument()
    })

    it('renders fracture threshold slider', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Fracture Threshold/)).toBeInTheDocument()
    })

    it('calls onCubeUpdate when coherence_loss is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const slider = screen.getByLabelText(/Coherence Loss/)
      fireEvent.change(slider, { target: { value: '0.05' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.coherence_loss).toBe(0.05)
    })

    it('calls onCubeUpdate when fracture_threshold is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const slider = screen.getByLabelText(/Fracture Threshold/)
      fireEvent.change(slider, { target: { value: '150' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.fracture_threshold).toBe(150)
    })

    it('calls onCubeUpdate when material is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const materialSelect = screen.getByLabelText('Material') as HTMLSelectElement
      fireEvent.change(materialSelect, { target: { value: 'wood' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.material).toBe('wood')
    })

    it('calls onCubeUpdate when density is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const densitySlider = screen.getByLabelText(/Density/)
      fireEvent.change(densitySlider, { target: { value: '5.0' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.density).toBe(5.0)
    })
  })

  describe('Stress indicator', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      // Set up a cube with energy near fracture
      testCube.physics = {
        ...testCube.physics,
        fracture_threshold: 100,
      }
      testCube.current_energy = 85 // 85% stress level
    })

    it('renders stress indicator when fracture threshold is set', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByText('Stress Level')).toBeInTheDocument()
    })

    it('shows warning when energy is near fracture threshold', () => {
      testCube.current_energy = 85
      render(<FFTParamEditor currentCube={testCube} />)
      // Warning appears in both stress label and alert box
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0]).toHaveTextContent(/Warning/)
    })

    it('shows critical alert when energy exceeds fracture threshold', () => {
      testCube.current_energy = 110
      render(<FFTParamEditor currentCube={testCube} />)
      // The component shows both "CRITICAL" in stress label and alert box
      expect(screen.getByRole('alert')).toHaveTextContent(/CRITICAL/)
    })

    it('does not render stress indicator when fracture threshold is 0', () => {
      testCube.physics = {
        ...testCube.physics,
        fracture_threshold: 0,
      }
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.queryByText('Stress Level')).not.toBeInTheDocument()
    })
  })

  describe('Boundary Settings section', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders boundary mode selector', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      const modeSelect = screen.getByLabelText('Mode') as HTMLSelectElement
      expect(modeSelect).toBeInTheDocument()
    })

    it('renders neighbor influence slider', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Neighbor Influence/)).toBeInTheDocument()
    })

    it('calls onCubeUpdate when boundary mode is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const modeSelect = screen.getByLabelText('Mode') as HTMLSelectElement
      fireEvent.change(modeSelect, { target: { value: 'hard' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.boundary.mode).toBe('hard')
    })

    it('calls onCubeUpdate when neighbor influence is changed', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const influenceSlider = screen.getByLabelText(/Neighbor Influence/)
      fireEvent.change(influenceSlider, { target: { value: '0.8' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.boundary.neighbor_influence).toBe(0.8)
    })
  })

  describe('Section toggling', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('collapses section when header is clicked', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      const energyHeader = screen.getByText('Energy Settings')

      // Initially expanded
      expect(screen.getByText('Is Magical')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(energyHeader)

      // Should now be collapsed
      expect(screen.queryByText('Is Magical')).not.toBeInTheDocument()
    })

    it('expands section when collapsed header is clicked', () => {
      render(<FFTParamEditor currentCube={testCube} />)
      const energyHeader = screen.getByText('Energy Settings')

      // Collapse
      fireEvent.click(energyHeader)
      expect(screen.queryByText('Is Magical')).not.toBeInTheDocument()

      // Expand again
      fireEvent.click(energyHeader)
      expect(screen.getByText('Is Magical')).toBeInTheDocument()
    })
  })

  describe('Reset functionality', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.energy_capacity = 500
      testCube.fft_size = 32
      testCube.is_magical = false
    })

    it('resets cube to default values when reset button is clicked', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const resetButton = screen.getByRole('button', { name: /reset/i })
      fireEvent.click(resetButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const resetCube = mockOnCubeUpdate.mock.calls[0][0]

      // Check default values
      expect(resetCube.energy_capacity).toBe(FFT_CUBE_DEFAULTS.energy_capacity)
      expect(resetCube.fft_size).toBe(FFT_CUBE_DEFAULTS.fft_size)
      expect(resetCube.is_magical).toBe(true) // Default from createDefaultFFTCube
    })
  })

  describe('Name editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.meta = { name: 'Original Name' }
    })

    it('updates cube name when input changes', () => {
      render(<FFTParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      fireEvent.change(nameInput, { target: { value: 'New FFT Cube Name' } })

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.meta.name).toBe('New FFT Cube Name')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      const { container } = render(
        <FFTParamEditor currentCube={testCube} className="custom-class" />
      )
      const editor = container.querySelector('.fft-editor')
      expect(editor).toHaveClass('custom-class')
    })
  })
})

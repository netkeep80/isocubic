import { useState, useCallback } from 'react'
import './App.css'
import { Gallery } from './components/Gallery'
import { ExportPanel } from './components/ExportPanel'
import type { SpectralCube } from './types/cube'
import { createDefaultCube } from './types/cube'

function App() {
  // Current cube state
  const [currentCube, setCurrentCube] = useState<SpectralCube | null>(() =>
    createDefaultCube('default_cube')
  )

  // Handle cube selection from gallery
  const handleCubeSelect = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  // Handle cube load from export panel
  const handleCubeLoad = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  // Handle cube change from undo/redo
  const handleCubeChange = useCallback((cube: SpectralCube) => {
    setCurrentCube(cube)
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <h1>isocubic</h1>
        <p>Web editor for parametric cubes</p>
      </header>

      <main className="app__main">
        <section className="app__section">
          <Gallery onCubeSelect={handleCubeSelect} currentCube={currentCube} />
        </section>

        <section className="app__section app__section--sidebar">
          <div className="app__current-cube">
            <h3 className="app__section-title">Current Cube</h3>
            {currentCube && (
              <div className="app__cube-info">
                <p>
                  <strong>Name:</strong> {currentCube.meta?.name || currentCube.id}
                </p>
                <p>
                  <strong>Material:</strong> {currentCube.physics?.material || 'Unknown'}
                </p>
                <p>
                  <strong>Tags:</strong> {currentCube.meta?.tags?.join(', ') || 'None'}
                </p>
              </div>
            )}
          </div>

          <ExportPanel
            currentCube={currentCube}
            onCubeLoad={handleCubeLoad}
            onCubeChange={handleCubeChange}
          />
        </section>
      </main>
    </div>
  )
}

export default App

import { Soroban } from './soroban/board.ts'
import { SorobanRenderer } from './soroban/renderer.ts'
import { SorobanExerciseRunner } from './exercises/exercise-runner.ts'
import { createPanel } from './ui/panel.ts'

const soroban = new Soroban({ sorobanYOffset: 0 })

const canvasContainer = document.getElementById('sorobanCanvas')!
const renderer = new SorobanRenderer(soroban, canvasContainer)

const exerciseRunner = new SorobanExerciseRunner(soroban)

createPanel(soroban, renderer, exerciseRunner)

import { Soroban } from '../soroban/board.ts'
import { SorobanRenderer } from '../soroban/renderer.ts'
import { SorobanExerciseRunner } from '../exercises/exercise-runner.ts'
import { ISorobanChord, processChordInput } from '../input/chord-handler.ts'
import { KetaOperationEffect } from '../soroban/config.ts'
import { SorobanExercise, generatedAddSubtractProblems, generateAddSubtractProblemsWithoutNegativeTotal } from '../exercises/exercises.ts'
import exerciseSetsData from '../exercises/exercise-sets.json'
import { generateNumber } from '../util.ts'

const exerciseSets = exerciseSetsData as Record<string, Record<string, Array<Array<number | string>>>>

export function createPanel(
    soroban: Soroban,
    renderer: SorobanRenderer,
    exerciseRunner: SorobanExerciseRunner,
) {
    const goalEl = document.getElementById('sorobanGoal')!
    const problemRollEl = document.getElementById('problemRoll')!
    const historyTextArea = document.getElementById('commandHistory') as HTMLTextAreaElement
    const commandInput = document.getElementById('commandInput') as HTMLInputElement
    const sumInput = document.getElementById('sumInput') as HTMLInputElement
    const configDisplay = document.getElementById('configurationDisplay') as HTMLInputElement
    const exerciseSelect = document.getElementById('exerciseSelect') as HTMLSelectElement
    const startBtn = document.getElementById('startExercise') as HTMLButtonElement
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement

    // Keep the configuration display in sync with whole-board updates
    // (reset, go-hasan, Start, between-exercise resets, replay)
    const renderBoard = soroban.onRender
    soroban.onRender = () => {
        renderBoard?.()
        configDisplay.value = soroban.getConfiguration()
    }

    // Wire exercise runner display
    exerciseRunner.onGoalUpdate = (html: string) => {
        goalEl.innerHTML = html
    }

    exerciseRunner.onProblemRollUpdate = (html: string) => {
        problemRollEl.innerHTML = html
    }

    exerciseRunner.onRequestSorobanReading = () => {
        goalEl.innerHTML = '<h3>enter the soroban value?</h3>'
        sumInput.focus()
    }

    exerciseRunner.onExerciseComplete = () => {
        const data = exerciseRunner.getSessionData()
        const stored = JSON.parse(localStorage.getItem('soroban-sessions') || '[]')
        stored.push({ timestamp: Date.now(), ...data })
        localStorage.setItem('soroban-sessions', JSON.stringify(stored))
    }

    // History recorder
    function logHistory(line: string, time?: number) {
        const timestamp = time ?? Date.now()
        const message = `${timestamp}\t${line}`
        historyTextArea.value += message + '\n'
        historyTextArea.scrollTop = historyTextArea.scrollHeight
    }

    // Command input: type 2-digit codes directly
    commandInput.addEventListener('keyup', (event) => {
        const currentInput = commandInput.value.trim()
        if (currentInput.length === 2) {
            const chord = currentInput.split('')
            const chordString = chord.join('')

            if (chordString === '00') {
                doReset()
            } else {
                const chordData = processChordInput(chord, soroban)
                if (chordData) {
                    applyChordOperation(chordData)
                }
            }
            commandInput.value = ''
        }
    })
    commandInput.focus()

    // Sum input for final reading
    sumInput.addEventListener('keyup', () => {
        const receivedValue = parseInt(sumInput.value.trim())
        if (!Number.isNaN(receivedValue)) {
            if (exerciseRunner.submitSorobanReading(receivedValue)) {
                sumInput.value = ''
                sumInput.blur()
                commandInput.focus()
            }
        }
    })

    function applyChordOperation(chordData: ISorobanChord) {
        // Push response data before setValue (which may trigger runNext via onChange)
        if (exerciseRunner.activeTrialResponse != null) {
            exerciseRunner.activeTrialResponse.responseTimes.push(
                chordData.commandTime - exerciseRunner.activeTrialResponse.onset,
            )
            exerciseRunner.activeTrialResponse.receivedOperations.push({
                index: chordData.ketaIndex,
                motion: chordData.tamaMotion,
                tamaCount: chordData.tamaCount,
                tamaType: chordData.tamaType,
            })
        }

        const currentConfig = soroban.getConfiguration()
        chordData.keta.setValue(chordData.newValue)
        renderer.render()
        const newConfig = soroban.getConfiguration()
        logHistory(`[UPDATE] ${currentConfig} --{${chordData.chordString}}--> ${newConfig}`, chordData.commandTime)
        configDisplay.value = newConfig
    }

    function doReset() {
        exerciseRunner.stopActiveReplay()
        const currentConfig = soroban.getConfiguration()
        exerciseRunner.goHasan()
        logHistory(`[GOHASAN] ${currentConfig} --> ${soroban.getConfiguration()}`)
        commandInput.value = ''
        exerciseRunner.runNext()
    }

    // Configuration display manual entry
    configDisplay.addEventListener('keyup', () => {
        const val = configDisplay.value.trim()
        val.split('').reverse().forEach((ch, index) => {
            if (index < soroban.columns.length) {
                soroban.columns[index].setValue(parseInt(ch))
            }
        })
        renderer.render()
    })

    // Reset button
    resetBtn.addEventListener('click', () => {
        exerciseRunner.stopActiveReplay()
        const currentConfig = soroban.getConfiguration()
        if (parseInt(currentConfig) !== 0) {
            doReset()
        }
        commandInput.focus()
    })

    // Populate exercise selector
    const generatedOptions = [
        'generatedAddSubtractProblemsWithNegative',
        'generatedAddSubtractProblems',
        'none',
    ]
    generatedOptions.forEach(opt => {
        const option = document.createElement('option')
        option.value = opt
        option.text = opt
        exerciseSelect.appendChild(option)
    })

    // Add exercise sets from JSON
    for (const [setName, setData] of Object.entries(exerciseSets)) {
        const optgroup = document.createElement('optgroup')
        optgroup.label = setName
        for (const problemSetName of Object.keys(setData)) {
            const option = document.createElement('option')
            option.value = `${setName}::${problemSetName}`
            option.text = problemSetName
            optgroup.appendChild(option)
        }
        exerciseSelect.appendChild(optgroup)
    }

    // Start exercise button
    startBtn.addEventListener('click', () => {
        const selected = exerciseSelect.value
        soroban.reset()
        renderer.render()
        historyTextArea.value = ''

        if (selected === 'none') {
            goalEl.innerHTML = '<h3>free practice mode</h3>'
            return
        }

        let exercises: SorobanExercise[]

        if (selected === 'generatedAddSubtractProblemsWithNegative') {
            const problems = generatedAddSubtractProblems(15, 15, 3)
            exercises = problems.map(seq => new SorobanExercise(seq))
        } else if (selected === 'generatedAddSubtractProblems') {
            const problems = generateAddSubtractProblemsWithoutNegativeTotal(15, 15, 3)
            exercises = problems.map(seq => new SorobanExercise(seq))
        } else if (selected.includes('::')) {
            const [setName, problemSetName] = selected.split('::')
            const problemData = exerciseSets[setName]?.[problemSetName]
            if (!problemData) {
                goalEl.innerHTML = '<h3>problem set not found</h3>'
                return
            }
            exercises = problemData.map(seq => new SorobanExercise(seq))
        } else {
            return
        }

        exerciseRunner.runExercises(exercises, selected)
        commandInput.focus()
    })

    // Export button — exports command history log + any exercise session data
    exportBtn.addEventListener('click', () => {
        const storedSessions = JSON.parse(localStorage.getItem('soroban-sessions') || '[]')
        const sessionData = exerciseRunner.getSessionData()
        // Include in-progress trial if there is one
        const currentHistory = [...sessionData.history]
        if (exerciseRunner.activeTrialResponse) {
            currentHistory.push(exerciseRunner.activeTrialResponse)
        }
        const exportData = {
            exportedAt: Date.now(),
            commandLog: historyTextArea.value,
            currentConfiguration: soroban.getConfiguration(),
            exerciseSession: {
                problemSetIdentifier: sessionData.problemSetIdentifier,
                history: currentHistory,
            },
            previousSessions: storedSessions,
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `soroban-export-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
    })
}

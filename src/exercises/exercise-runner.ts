import { ISorobanOperation, KetaOperationEffect, SorobanResponse, TamaType } from '../soroban/config.ts'
import { Soroban, SorobanKeta } from '../soroban/board.ts'
import { ArithmeticOperation, IExerciseOperation, SorobanExercise, stringifyOperation } from './exercises.ts'

export class SorobanExerciseRunner {
    exerciseQueue: IExerciseOperation[] | null = null
    exerciseQueueIndex = 0
    allExercisesQueue: SorobanExercise[] = []
    currentValue = 0
    targetValue = 0
    currentProblemNumber: number | null = null

    problemStatement: string | null = null

    history: SorobanResponse[] = []
    problemSetIdentifier: string | null = null
    trialT0 = 0
    activeTrialResponse: SorobanResponse | null = null

    shouldMeasureFinalTotalTypeDuration = true
    finalSubtractionBuffer = 0

    onGoalUpdate: ((html: string) => void) | null = null
    onProblemRollUpdate: ((html: string) => void) | null = null
    onExerciseComplete: (() => void) | null = null
    onRequestSorobanReading: (() => void) | null = null

    getCurrentSorobanValue(): number {
        return this.soroban.columns.slice(this.focusKetaIndex).reduce((total: number, keta: SorobanKeta, index: number) => {
            return total + keta.value * Math.pow(10, index)
        }, 0)
    }

    constructor(public soroban: Soroban, public focusKetaIndex: number = 2) {
        this.soroban.columns.slice(this.focusKetaIndex).forEach((keta: SorobanKeta, index: number) => {
            keta.onChange = (_newValue: number) => {
                this.currentValue = this.getCurrentSorobanValue()
                this.showGoal()
                if (this.currentValue === this.targetValue) {
                    this.runNext()
                }
            }
        })
    }

    getExpectedOperations(targetValue: number, currentValue: number | null = null, indexOffset: number = 2): ISorobanOperation[] {
        if (currentValue == null) {
            currentValue = this.currentValue
        }

        const operations: ISorobanOperation[] = []
        const currentKetaDigitStrings = currentValue.toFixed(0).split('').reverse()
        const targetKetaDigitStrings = targetValue.toFixed(0).split('').reverse()

        targetKetaDigitStrings.forEach((targetDigitString, index) => {
            const targetKetaValue = parseInt(targetDigitString)

            if (index >= currentKetaDigitStrings.length) {
                const subOps = this.getExpectedOperations(targetKetaValue, 0, index)
                operations.push(...subOps)
            } else {
                const currentKetaValue = parseInt(currentKetaDigitStrings[index])
                const numIchiInUpPosition = currentKetaValue % 5
                const targetIchiInUpPosition = targetKetaValue % 5

                if (targetIchiInUpPosition > numIchiInUpPosition) {
                    operations.push({
                        motion: KetaOperationEffect.ADD,
                        index: indexOffset + index,
                        tamaType: TamaType.ICHI,
                        tamaCount: targetIchiInUpPosition - numIchiInUpPosition,
                    })
                } else if (targetIchiInUpPosition < numIchiInUpPosition) {
                    operations.push({
                        motion: KetaOperationEffect.SUBTRACT,
                        index: indexOffset + index,
                        tamaType: TamaType.ICHI,
                        tamaCount: numIchiInUpPosition - targetIchiInUpPosition,
                    })
                }

                const numGoInUpPosition = currentKetaValue > 5 ? 1 : 0
                if (targetKetaValue > 5 && numGoInUpPosition === 0) {
                    operations.push({
                        motion: KetaOperationEffect.ADD,
                        index: indexOffset + index,
                        tamaType: TamaType.GO,
                        tamaCount: 1,
                    })
                } else if (targetKetaValue < 5 && numGoInUpPosition === 1) {
                    operations.push({
                        motion: KetaOperationEffect.SUBTRACT,
                        index: indexOffset + index,
                        tamaType: TamaType.GO,
                        tamaCount: 1,
                    })
                }
            }
        })

        return operations
    }

    requestSorobanReading() {
        this.trialT0 = Date.now()
        this.onRequestSorobanReading?.()
    }

    submitSorobanReading(value: number): boolean {
        const displayedValue = this.soroban.getValue()
        const actualValue = displayedValue - this.soroban.finalSubtractionBuffer
        if (value === actualValue) {
            if (this.activeTrialResponse) {
                this.activeTrialResponse.finalTotalTypeDuration = Date.now() - this.trialT0
            }
            this.completeExercise()
            return true
        }
        return false
    }

    fireNextExercise() {
        const nextExercise = this.allExercisesQueue.shift()!
        this.soroban.reset()
        this.exerciseQueueIndex = 0
        this.soroban.finalSubtractionBuffer = 0
        this.runExercise(nextExercise)
    }

    completeExercise() {
        if (this.activeTrialResponse != null) {
            this.history.push(this.activeTrialResponse)
            this.activeTrialResponse = null
            this.currentProblemNumber = null
            this.soroban.finalSubtractionBuffer = 0
        }

        if (this.allExercisesQueue.length > 0) {
            this.setGoalDisplay('<h3>finished this problem!</h3>')
            setTimeout(() => this.fireNextExercise(), 1000)
        } else {
            this.setGoalDisplay('<h3>done with all exercises!</h3>')
            this.onExerciseComplete?.()
        }
    }

    private setGoalDisplay(html: string) {
        this.onGoalUpdate?.(html)
    }

    showGoal(comment: string | null = null, expectedOperations: ISorobanOperation[] = []) {
        if (this.problemStatement == null) return

        let groupedOps: Record<number, string[]> = {}
        if (expectedOperations.length > 0) {
            expectedOperations.forEach((op) => {
                if (groupedOps[op.index] == null) groupedOps[op.index] = []
                if (op.tamaType === TamaType.ICHI) {
                    groupedOps[op.index].push(`${op.tamaType}${op.motion === KetaOperationEffect.ADD ? '\u2191' : '\u2193'}${op.tamaCount}`)
                } else {
                    groupedOps[op.index].push(`${op.tamaType}${op.motion === KetaOperationEffect.SUBTRACT ? '\u2191' : '\u2193'}`)
                }
            })
        }

        const opsString = Object.keys(groupedOps).sort().reverse().map((ketaIndex) => {
            const opStrings = groupedOps[parseInt(ketaIndex)].sort().reverse()
            return `[${ketaIndex}]${opStrings.join(' ')}`
        }).join(', ')

        // Status bar
        this.setGoalDisplay(`
        ${this.currentProblemNumber != null ? `<code style="font-size:x-large;font-weight:bold">${this.currentProblemNumber}</code>` : ''}
        <span>now [${this.exerciseQueueIndex}]: ${this.currentValue}; goal: ${this.targetValue} ${comment ?? ''}  ${opsString}</span>
        `)

        // Floating problem roll (rendered over soroban area)
        // Anchor so the current (bold) item floats ~30px above the canvas top.
        // Items scroll upward as exerciseQueueIndex advances.
        const problemRoll = this.problemStatement.split(/\b /).map((token, index) => {
            const offset = -80 + (index - this.exerciseQueueIndex + 1) * 22
            return `<li style="top:${offset}px;${index + 1 === this.exerciseQueueIndex ? 'font-weight:bold;' : ''}">${token}</li>`
        }).join('\n')

        this.onProblemRollUpdate?.(`<ul>${problemRoll}</ul>`)
    }

    runNext() {
        if (this.exerciseQueue == null) return

        if (this.exerciseQueueIndex >= this.exerciseQueue.length) {
            if (this.shouldMeasureFinalTotalTypeDuration) {
                this.requestSorobanReading()
            } else {
                this.completeExercise()
            }
            return
        }

        this.currentValue = this.getCurrentSorobanValue()
        let nextOperation: IExerciseOperation

        if (this.exerciseQueue.length > this.exerciseQueueIndex + 1
            && this.exerciseQueue[this.exerciseQueueIndex + 1].operation === ArithmeticOperation.MULTIPLY) {
            const multiplicand1 = this.exerciseQueue[this.exerciseQueueIndex++]
            const multiplicand2 = this.exerciseQueue[this.exerciseQueueIndex]
            nextOperation = {
                operation: ArithmeticOperation.MULTIPLY,
                value: multiplicand1.value * multiplicand2.value,
            }
        } else if (this.exerciseQueue.length > this.exerciseQueueIndex + 1
            && this.exerciseQueue[this.exerciseQueueIndex + 1].operation === ArithmeticOperation.DIVIDE) {
            const dividend = this.exerciseQueue[this.exerciseQueueIndex++]
            const divisor = this.exerciseQueue[this.exerciseQueueIndex]
            nextOperation = {
                operation: ArithmeticOperation.DIVIDE,
                value: dividend.value / divisor.value,
            }
        } else {
            nextOperation = this.exerciseQueue[this.exerciseQueueIndex]
        }

        this.targetValue = this.currentValue + nextOperation.value
        if (this.targetValue < 0) {
            const offsetMagnitude = this.exerciseQueue.reduce((prev, cur) => {
                return Math.max(prev, Math.abs(cur.value).toString().length)
            }, 0)
            const offsetValue = Math.pow(10, offsetMagnitude)
            this.soroban.finalSubtractionBuffer += offsetValue
            this.targetValue += offsetValue
        }

        this.currentProblemNumber = nextOperation.value

        this.exerciseQueueIndex++
        this.showGoal(`via ${stringifyOperation(nextOperation)}`, [])

        if (this.activeTrialResponse) {
            // expected operations omitted for performance
        }
    }

    runExercise(exercise: SorobanExercise) {
        this.exerciseQueue = exercise.problemSequence
        this.exerciseQueueIndex = 0

        const deltaSequence: number[] = []
        for (let i = 0; i < this.exerciseQueue.length; i++) {
            const currentOp = this.exerciseQueue[i]
            if (i + 1 < this.exerciseQueue.length && this.exerciseQueue[i + 1].operation === ArithmeticOperation.MULTIPLY) {
                const nextOp = this.exerciseQueue[i + 1]
                deltaSequence.push(currentOp.value * nextOp.value)
                i++
            } else {
                deltaSequence.push(currentOp.value)
            }
        }

        const problemStatementTokens: string[] = []
        for (let i = 0; i < exercise.problemSequence.length; i++) {
            const op = exercise.problemSequence[i]
            if (i === 0) {
                problemStatementTokens.push(op.value.toString())
            } else {
                if (op.operation === ArithmeticOperation.MULTIPLY) {
                    problemStatementTokens.push('\u00d7')
                } else if (op.operation === ArithmeticOperation.DIVIDE) {
                    problemStatementTokens.push('\u00f7')
                } else if (op.value < 0) {
                    problemStatementTokens.push('-')
                } else {
                    problemStatementTokens.push('+')
                }
                problemStatementTokens.push(Math.abs(op.value).toString())
            }
        }

        this.trialT0 = Date.now()
        this.activeTrialResponse = {
            numberDeltaSequence: deltaSequence,
            onset: this.trialT0,
            expectedOperations: [],
            receivedOperations: [],
            responseTimes: [],
            problemStatement: problemStatementTokens.join(' '),
        }

        this.problemStatement = this.activeTrialResponse.problemStatement ?? null
        this.runNext()
    }

    runExercises(exercises: SorobanExercise[], problemSetIdentifier: string | null = null) {
        this.problemSetIdentifier = problemSetIdentifier
        this.history = []
        this.allExercisesQueue = [...exercises]
        const exercise = this.allExercisesQueue.shift()!
        this.runExercise(exercise)
    }

    private _activePlayingSequenceStopper: (() => void) | null = null

    stopActiveReplay() {
        if (this._activePlayingSequenceStopper != null) {
            this._activePlayingSequenceStopper()
            this._activePlayingSequenceStopper = null
        }
    }

    replaySequence(sequence: string[], tickTimes?: number[]) {
        this.stopActiveReplay()
        const defaultTickTime = 1000

        if (tickTimes == null) {
            const remain = [...sequence]
            const timer = setInterval(() => {
                if (remain.length === 0) {
                    clearInterval(timer)
                    return
                }
                const nextConfiguration = remain.shift()!
                this.soroban.setConfiguration(nextConfiguration)
            }, defaultTickTime)
            this._activePlayingSequenceStopper = () => clearInterval(timer)
        } else {
            const timeouts: (ReturnType<typeof setTimeout> | null)[] = []
            for (let index = 0; index < tickTimes.length; index++) {
                const responseTime = tickTimes[index]
                const timeoutCount = timeouts.length
                const timeout = setTimeout(() => {
                    timeouts[timeoutCount] = null
                    this.soroban.setConfiguration(sequence[index])
                }, responseTime / 10)
                timeouts.push(timeout)
            }
            this._activePlayingSequenceStopper = () => {
                for (const timeout of timeouts) {
                    if (timeout != null) clearTimeout(timeout)
                }
            }
        }
    }

    goHasan() {
        const commandTime = Date.now()
        this.soroban.setValue(0)
        if (this.activeTrialResponse != null) {
            this.activeTrialResponse.receivedOperations.push({
                index: 0,
                motion: KetaOperationEffect.GOHASAN,
                tamaCount: 0,
                tamaType: TamaType.ICHI,
            })
            this.activeTrialResponse.responseTimes.push(
                commandTime - this.activeTrialResponse.onset,
            )
            this.exerciseQueueIndex = 0
            this.soroban.finalSubtractionBuffer = 0
        }
    }

    getSessionData() {
        return {
            problemSetIdentifier: this.problemSetIdentifier,
            history: this.history,
        }
    }
}

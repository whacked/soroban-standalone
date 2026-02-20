export enum ArithmeticOperation {
    ADD, MULTIPLY, DIVIDE,
}

export interface IExerciseOperation {
    operation: ArithmeticOperation
    value: number
}

const ArithmeticOperationLookup: Record<string, ArithmeticOperation> = {
    '*': ArithmeticOperation.MULTIPLY,
    '/': ArithmeticOperation.DIVIDE,
}

export function stringifyOperation(op: IExerciseOperation): string {
    if (op.value < 0) {
        return `-${Math.abs(op.value)}`
    } else if (op.operation === ArithmeticOperation.MULTIPLY) {
        return `\u00d7${op.value}`
    } else if (op.operation === ArithmeticOperation.DIVIDE) {
        return `\u00f7${op.value}`
    } else {
        return `+${op.value}`
    }
}

export class SorobanExercise {
    public readonly problemSequence: IExerciseOperation[]

    constructor(problemSequence: Array<number | string>) {
        const operations: IExerciseOperation[] = []
        for (let i = 0; i < problemSequence.length; i++) {
            const maybeOperator = problemSequence[i]
            if (typeof maybeOperator === 'string') {
                const arithmeticOperation = ArithmeticOperationLookup[maybeOperator]
                if (arithmeticOperation == null) {
                    throw new Error(`unknown arithmetic operator: ${maybeOperator}`)
                }
                operations.push({
                    operation: arithmeticOperation,
                    value: problemSequence[i + 1] as number,
                })
                i++
            } else {
                operations.push({
                    operation: ArithmeticOperation.ADD,
                    value: problemSequence[i] as number,
                })
            }
        }
        this.problemSequence = operations
    }
}

export function generateAddSubtractProblemsWithoutNegativeTotal(
    numProblems: number, numbersPerProblem: number, numDigits: number,
): number[][] {
    const minNumber = Math.pow(10, numDigits - 1) + 1
    const maxPadding = Math.pow(10, numDigits) - minNumber - 1

    const out: number[][] = []
    for (let i = 0; i < numProblems; i++) {
        const problemSet: number[] = []
        let runningTotal = 0
        for (let j = 0; j < numbersPerProblem; j++) {
            let delta = Math.floor(minNumber + Math.random() * maxPadding)
            if (j > 0 && delta < runningTotal && Math.random() > 0.5) {
                delta = -delta
            }
            runningTotal += delta
            problemSet.push(delta)
        }
        out.push(problemSet)
    }
    return out
}

export function generatedAddSubtractProblems(
    numProblems: number, numbersPerProblem: number, numDigits: number,
): number[][] {
    const minNumber = Math.pow(10, numDigits - 1) + 1
    const maxPadding = Math.pow(10, numDigits) - minNumber - 1

    const out: number[][] = []
    for (let i = 0; i < numProblems; i++) {
        let problemSet: number[]
        do {
            problemSet = []
            for (let j = 0; j < numbersPerProblem; j++) {
                let delta = Math.floor(minNumber + Math.random() * maxPadding)
                if (Math.random() > 0.7) {
                    delta = -delta
                }
                problemSet.push(delta)
            }
        } while (problemSet.reduce((a, b) => a + b) < 0)
        out.push(problemSet)
    }
    return out
}

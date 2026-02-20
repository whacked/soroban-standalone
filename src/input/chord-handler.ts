import { KetaOperationEffect, TamaType } from '../soroban/config.ts'
import { Soroban, SorobanKeta } from '../soroban/board.ts'

export interface ISorobanChord {
    keta: SorobanKeta
    chordString: string
    commandTime: number
    ketaIndex: number
    tamaMotion: KetaOperationEffect
    tamaCount: number
    tamaType: TamaType
    newValue: number
}

export class DoubleKeyChordHandler {
    triggerCodeMap: Record<string, boolean>
    chordBuffer: string[] = []
    previousEventTimeBuffer: number[] = []

    keyChordDelayMinimumThreshold = 9
    keyChordDelayMaximumThreshold = 32

    constructor(
        validTriggerCodes: Record<string, boolean> | null = null,
        public chordHandler: (chord: string[]) => void,
    ) {
        this.triggerCodeMap = validTriggerCodes ?? {}
    }

    clearBuffer() {
        this.chordBuffer = []
        this.previousEventTimeBuffer = []
    }

    isValidKeyChordTrigger(keyCode: string): boolean {
        return Boolean(this.triggerCodeMap[keyCode])
    }

    pushCode(code: string) {
        this.chordBuffer.push(code)
        this.previousEventTimeBuffer.push(Date.now())
    }

    handleKeyEvent(event: KeyboardEvent) {
        const code = event.key

        if (this.chordBuffer.length === 0) {
            if (this.isValidKeyChordTrigger(code)) {
                this.pushCode(code)
            }
        } else {
            const previousEventTime = this.previousEventTimeBuffer[0]
            const eventDt = Date.now() - previousEventTime
            if (this.keyChordDelayMinimumThreshold < eventDt && eventDt < this.keyChordDelayMaximumThreshold) {
                const previousCode = this.chordBuffer[0]
                this.chordHandler([previousCode, code])
                this.clearBuffer()
            } else {
                this.clearBuffer()
                this.pushCode(code)
            }
        }
    }
}

export function processChordInput(chord: string[], soroban: Soroban): ISorobanChord | null {
    const chordString = chord.join('')
    if (chordString === '00') {
        return null // signals reset
    }

    const digits = chord.map(x => parseInt(x))
    const keyNumber = parseInt(chordString)
    const ketaIndex = Math.floor((keyNumber - 1) / 5)

    const keta = soroban.columns[ketaIndex]
    if (!keta) return null

    let newValue: number
    let tamaCount: number
    let tamaMotion: KetaOperationEffect
    let tamaType: TamaType

    if (digits[1] % 5 === 0) {
        tamaCount = 1
        tamaType = TamaType.GO
        if (keta.value > 4) {
            newValue = keta.value - 5
            tamaMotion = KetaOperationEffect.SUBTRACT
        } else {
            newValue = keta.value + 5
            tamaMotion = KetaOperationEffect.ADD
        }
    } else {
        const goDamaValue = keta.value > 4 ? 5 : 0
        const currentIchiDamaValue = keta.value % 5
        const ichiDamaSwitchedNumber = digits[1] % 5
        const currentBlankPosition = 5 - currentIchiDamaValue
        let newIchiDamaValue: number

        tamaType = TamaType.ICHI

        if (currentBlankPosition < ichiDamaSwitchedNumber) {
            newIchiDamaValue = currentIchiDamaValue - (ichiDamaSwitchedNumber - currentBlankPosition) - 1
        } else if (currentBlankPosition === ichiDamaSwitchedNumber) {
            newIchiDamaValue = currentIchiDamaValue - 1
        } else {
            newIchiDamaValue = (currentBlankPosition - ichiDamaSwitchedNumber) + currentIchiDamaValue
        }

        if (newIchiDamaValue < currentIchiDamaValue) {
            tamaCount = currentIchiDamaValue - newIchiDamaValue
            tamaMotion = KetaOperationEffect.SUBTRACT
        } else {
            tamaCount = newIchiDamaValue - currentIchiDamaValue
            tamaMotion = KetaOperationEffect.ADD
        }

        newValue = goDamaValue + newIchiDamaValue
    }

    return {
        keta,
        chordString,
        commandTime: Date.now(),
        ketaIndex,
        tamaMotion,
        tamaCount,
        tamaType,
        newValue,
    }
}

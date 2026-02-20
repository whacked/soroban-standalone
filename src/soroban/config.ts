export interface ISorobanOptions {
    scale: number
    numberColumns: number
    highlightedKetaIndex: number
    teiitenOffsetFromMidpoint: number
    sorobanXOffset: number
    sorobanYOffset: number
    showTeiitenEveryNKeta: number

    wakuFramePieceHeight: number
    wakuFramePieceWidth: number

    tamaHeight: number
    tamaWidth: number
    tamaOffset: number
    hariSize: number
    hashiraSize: number
    tamaSpacing: number

    hariColor: number
    teiitenColor: number
    wakuColor: number
}

const _defaultTamaWidth = 44
const _defaultTamaSpacing = 2

export const defaultSorobanOptions: ISorobanOptions = {
    scale: 1,
    numberColumns: 13,
    highlightedKetaIndex: 2,
    teiitenOffsetFromMidpoint: 0,
    sorobanXOffset: 0,
    sorobanYOffset: 0,
    showTeiitenEveryNKeta: 3,

    wakuFramePieceHeight: 10,
    wakuFramePieceWidth: 20,

    tamaHeight: 24,
    tamaWidth: _defaultTamaWidth,
    tamaOffset: 0,
    hariSize: 10,
    hashiraSize: 8,
    tamaSpacing: _defaultTamaSpacing,

    hariColor: 0x332200,
    teiitenColor: 0xEEEEEE,
    wakuColor: 0x000000,
}

export enum KetaOperationEffect {
    SUBTRACT = "SUBTRACT",
    ADD = "ADD",
    GOHASAN = "GOHASAN",
}

export enum TamaType {
    ICHI = 1,
    GO = 5,
}

export interface ISorobanOperation {
    motion: KetaOperationEffect
    index: number
    tamaType: TamaType
    tamaCount: number
    operationOnset?: number
}

export interface SorobanResponse {
    onset: number
    numberDeltaSequence: Array<number>
    expectedOperations?: Array<ISorobanOperation>
    receivedOperations: Array<ISorobanOperation>
    finalTotalTypeDuration?: number
    responseTimes: Array<number>
    problemStatement?: string
}

export interface SorobanSessionData {
    problemSetIdentifier: string
    history: Array<SorobanResponse>
}

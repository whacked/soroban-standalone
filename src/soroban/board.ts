import { ISorobanOptions, defaultSorobanOptions } from './config.ts'

export class SorobanKeta {
    value: number
    onChange: ((value: number) => void) | null = null

    constructor(
        public readonly index: number,
        public readonly options: ISorobanOptions,
        value: number = 0,
    ) {
        this.value = value
    }

    setValue(value: number) {
        this.value = value
        if (this.onChange != null) {
            this.onChange(value)
        }
    }

    getIchiPositions(): number[] {
        const numRaised = this.value % 5
        const positions: number[] = []
        for (let i = 0; i < 4; i++) {
            const raised = i < numRaised
            positions.push(raised ? 0 : 1)
        }
        return positions
    }

    getGoPosition(): number {
        return this.value >= 5 ? 1 : 0
    }
}

export class Soroban {
    columns: SorobanKeta[]
    options: ISorobanOptions
    finalSubtractionBuffer = 0
    onRender: (() => void) | null = null

    constructor(options: Partial<ISorobanOptions> = {}) {
        this.options = { ...defaultSorobanOptions, ...options }
        this.columns = []
        for (let i = 0; i < this.options.numberColumns; i++) {
            this.columns.push(new SorobanKeta(i, this.options))
        }
    }

    setValue(value: number | string) {
        let inputKetaValues: string[]
        if (typeof value === 'number') {
            inputKetaValues = value.toFixed(0).split('').reverse()
        } else {
            inputKetaValues = value.split('').reverse()
        }
        this.columns.forEach((keta, index) => {
            const digit = index < inputKetaValues.length ? parseInt(inputKetaValues[index]) : 0
            keta.setValue(digit)
        })
        this.onRender?.()
    }

    getValue(startFromKetaRTLIndex: number = 2): number {
        const filteredString = this.getConfiguration()
            .split('').reverse().slice(startFromKetaRTLIndex).reverse().join('')
        return parseInt(filteredString)
    }

    getConfiguration(): string {
        return this.columns.map(keta => keta.value.toString()).reverse().join('')
    }

    setConfiguration(configurationString: string) {
        configurationString.split('').reverse().forEach((ketaString, index) => {
            if (index < this.columns.length) {
                this.columns[index].setValue(parseInt(ketaString))
            }
        })
        this.onRender?.()
    }

    reset() {
        const savedCallbacks = this.columns.map(keta => {
            const cb = keta.onChange
            keta.onChange = null
            return cb
        })
        this.setValue(0)
        savedCallbacks.forEach((cb, index) => {
            this.columns[index].onChange = cb
        })
    }
}

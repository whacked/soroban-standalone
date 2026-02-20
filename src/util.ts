export function range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i)
}

export function generateNumber(minNumber: number): number {
    const maxPower = Math.floor(Math.log10(minNumber)) + 1
    let out: number
    do {
        out = 0
        for (let curPower = 0; curPower < maxPower; curPower++) {
            const digit = 1 + Math.floor(Math.random() * 9)
            out += Math.pow(10, curPower) * digit
        }
    } while (out <= minNumber)
    return out
}

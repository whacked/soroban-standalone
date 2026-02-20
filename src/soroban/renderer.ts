import { ISorobanOptions } from './config.ts'
import { Soroban } from './board.ts'
import { drawBead } from './bead-renderer.ts'

export class SorobanRenderer {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D

    private ichiBeadCanvas: HTMLCanvasElement
    private goBeadCanvas: HTMLCanvasElement
    private ichiBeadSpecialCanvas: HTMLCanvasElement
    private goBeadSpecialCanvas: HTMLCanvasElement
    private labelRow: HTMLDivElement

    constructor(
        public readonly soroban: Soroban,
        container: HTMLElement,
    ) {
        const opts = soroban.options
        const canvasWidth = (
            opts.wakuFramePieceWidth * 2
            + opts.numberColumns * (opts.tamaWidth + opts.tamaSpacing)
            + opts.tamaSpacing
        ) * opts.scale
        const canvasHeight = (
            opts.wakuFramePieceHeight * 2
            + opts.tamaHeight * 2
            + opts.hariSize
            + opts.tamaHeight * 5
        ) * opts.scale

        this.canvas = document.createElement('canvas')
        this.canvas.width = canvasWidth
        this.canvas.height = canvasHeight
        this.canvas.style.cursor = 'pointer'
        container.appendChild(this.canvas)
        this.ctx = this.canvas.getContext('2d')!

        // Column labels below the canvas (outside the frame)
        this.labelRow = document.createElement('div')
        this.labelRow.style.cssText = 'display:flex;flex-direction:row-reverse;padding:0 ' + (opts.wakuFramePieceWidth * opts.scale) + 'px;'
        for (let i = 0; i < opts.numberColumns; i++) {
            const label = document.createElement('span')
            label.textContent = i.toString()
            label.style.cssText = `
                width:${(opts.tamaWidth + opts.tamaSpacing) * opts.scale}px;
                text-align:center;
                font-family:monospace;
                font-size:14px;
                color:#EEAA66;
            `
            this.labelRow.appendChild(label)
        }
        container.appendChild(this.labelRow)

        this.ichiBeadCanvas = this.prerenderBead(3)
        this.goBeadCanvas = this.prerenderBead(5)
        this.ichiBeadSpecialCanvas = this.prerenderBead(4)
        this.goBeadSpecialCanvas = this.prerenderBead(6)

        this.soroban.onRender = () => this.render()
        this.render()
    }

    private prerenderBead(style: number): HTMLCanvasElement {
        const opts = this.soroban.options
        const w = opts.tamaWidth
        const h = opts.tamaHeight
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        drawBead(ctx, w / 2, h / 2, style, w, h)
        return canvas
    }

    private hexColor(n: number): string {
        return '#' + n.toString(16).padStart(6, '0')
    }

    render() {
        const opts = this.soroban.options
        const s = opts.scale
        const ctx = this.ctx
        const w = this.canvas.width
        const h = this.canvas.height

        ctx.clearRect(0, 0, w, h)

        // Waku (frame)
        ctx.fillStyle = this.hexColor(opts.wakuColor)
        // top
        ctx.fillRect(0, 0, w, opts.wakuFramePieceHeight * s)
        // bottom
        ctx.fillRect(0, h - opts.wakuFramePieceHeight * s, w, opts.wakuFramePieceHeight * s)
        // left
        ctx.fillRect(0, 0, opts.wakuFramePieceWidth * s, h)
        // right
        ctx.fillRect(w - opts.wakuFramePieceWidth * s, 0, opts.wakuFramePieceWidth * s, h)

        const numCols = this.soroban.columns.length
        const colWidth = (opts.tamaWidth + opts.tamaSpacing) * s

        // Hashira (rods)
        ctx.fillStyle = '#704F32'
        for (let i = 0; i < numCols; i++) {
            const colIndex = numCols - i - 1
            const rodX = opts.wakuFramePieceWidth * s
                + colIndex * colWidth
                + opts.tamaSpacing * s
                + (opts.tamaWidth / 2 - opts.hashiraSize / 2) * s
            ctx.fillRect(
                rodX,
                opts.wakuFramePieceHeight * s,
                opts.hashiraSize * s,
                (opts.tamaHeight * 2 + opts.hariSize + opts.tamaHeight * 5) * s,
            )
        }

        // Hari (horizontal beam)
        const hariY = (opts.wakuFramePieceHeight + opts.tamaHeight * 2) * s
        const hariX = opts.wakuFramePieceWidth * s
        const hariLen = w - opts.wakuFramePieceWidth * 2 * s
        ctx.fillStyle = this.hexColor(opts.hariColor)
        ctx.fillRect(hariX, hariY, hariLen, opts.hariSize * s)

        // Teiiten (position dots)
        const midpointKetaIndex = Math.ceil(numCols / 2)
        const teiitenRadius = opts.hariSize / 4 * s
        ctx.fillStyle = this.hexColor(opts.teiitenColor)
        for (let i = 0; i < numCols; i++) {
            if ((i + 1 - midpointKetaIndex - opts.teiitenOffsetFromMidpoint) % opts.showTeiitenEveryNKeta === 0) {
                const colIndex = numCols - i - 1
                const dotX = opts.wakuFramePieceWidth * s
                    + colIndex * colWidth
                    + opts.tamaSpacing * s
                    + opts.tamaWidth / 2 * s
                const dotY = hariY + opts.hariSize / 2 * s
                ctx.beginPath()
                ctx.arc(dotX, dotY, teiitenRadius, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        // Beads
        const goDamaY0 = (opts.wakuFramePieceHeight + opts.tamaHeight * 0.5) * s
        const ichiDamaY0 = (opts.wakuFramePieceHeight + opts.tamaHeight * 2.5 + opts.hariSize) * s

        for (let i = 0; i < numCols; i++) {
            const keta = this.soroban.columns[i]
            const colIndex = numCols - i - 1
            const beadCenterX = opts.wakuFramePieceWidth * s
                + colIndex * colWidth
                + opts.tamaSpacing * s
                + opts.tamaWidth / 2 * s

            const isSpecial = i === opts.highlightedKetaIndex

            // Go-dama
            const goCanvas = isSpecial ? this.goBeadSpecialCanvas : this.goBeadCanvas
            const goOffset = keta.value >= 5 ? opts.tamaHeight * s : 0
            const goY = goDamaY0 + goOffset
            ctx.drawImage(
                goCanvas,
                beadCenterX - opts.tamaWidth / 2 * s,
                goY - opts.tamaHeight / 2 * s,
                opts.tamaWidth * s,
                opts.tamaHeight * s,
            )

            // Ichi-dama
            const ichiCanvas = isSpecial ? this.ichiBeadSpecialCanvas : this.ichiBeadCanvas
            const numRaised = keta.value % 5
            for (let j = 0; j < 4; j++) {
                const raised = j < numRaised
                const ichiOffset = raised ? 0 : opts.tamaHeight * s
                const ichiY = ichiDamaY0 + ichiOffset + j * opts.tamaHeight * s
                ctx.drawImage(
                    ichiCanvas,
                    beadCenterX - opts.tamaWidth / 2 * s,
                    ichiY - opts.tamaHeight / 2 * s,
                    opts.tamaWidth * s,
                    opts.tamaHeight * s,
                )
            }

        }
    }

    getColumnAtPosition(x: number, _y: number): number | null {
        const opts = this.soroban.options
        const s = opts.scale
        const numCols = this.soroban.columns.length
        const colWidth = (opts.tamaWidth + opts.tamaSpacing) * s
        const frameLeft = opts.wakuFramePieceWidth * s

        const relX = x - frameLeft
        if (relX < 0) return null

        const visualCol = Math.floor(relX / colWidth)
        if (visualCol < 0 || visualCol >= numCols) return null

        // visual columns are right-to-left (highest keta on left)
        return numCols - visualCol - 1
    }
}

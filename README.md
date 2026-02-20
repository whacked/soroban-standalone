# Soroban Practice

Interactive soroban (Japanese abacus) practice app with exercise sets.

## Setup

```
npm install
npm run dev
```

## Usage

- Type 2-digit codes in the command input to move beads (e.g. `05` toggles go-dama on keta 0, `01` moves ichi-dama on keta 0)
- `00` resets the board (go-hasan)
- Select an exercise set and click Start to begin guided practice
- Export saves your command history and session data as JSON

## Attribution

Bead rendering (`src/soroban/bead-renderer.ts`) adapted from [fjolliton/soroban](https://fjolliton.github.io/soroban/), licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain).

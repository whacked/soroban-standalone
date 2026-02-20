export type KeyMap = Record<string, string>

// Identity mapping for the special soroban keyboard
export const SPECIAL_KEYBOARD_MAP: KeyMap = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
}

// QWERTY mapping: two-hand layout
// Left hand (keta 0): A=1 S=2 D=3 F=4 G=5
// Right hand (keta 1): H=6 J=7 K=8 L=9 ;=0
export const QWERTY_MAP: KeyMap = {
    'a': '1', 's': '2', 'd': '3', 'f': '4', 'g': '5',
    'h': '6', 'j': '7', 'k': '8', 'l': '9', ';': '0',
}

export function applyKeyMap(key: string, keyMap: KeyMap): string | null {
    return keyMap[key] ?? null
}

export type Vec2 = {
    x: number,
    y: number
}

export type LowercaseChar = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
export type Space = ' ';

export type KeyBindings = [LowercaseChar | ArrowKey, LowercaseChar | ArrowKey];
export type KeyMap = Record<LowercaseChar | ArrowKey | Space, boolean>;
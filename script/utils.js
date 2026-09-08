// @ts-check
export const MathUtils = {
    /**
     * @param {number} min 
     * @param {number} max 
     * @param {number} val 
     */
    clamp: (min, max, val) => {
        return Math.max(min, Math.min(max, val));
    },

    /**
     * @param {number} min 
     * @param {number} max 
     * @param {number} val 
     */
    isInsideRange: (min, max, val) => {
        return val >= min && val <= max;
    },

    /**
     * 
     * @param {number} s 
     * @param {number} ratio 
     */
    toAspectRatio: (s, ratio) => {
        return {x: s, y: s * ratio};
    },

    /**
     * @param {import("./types.js").Vec2} p 
     */
    toAbsoluteCoords: (p) => {
        return {x: p.x * window.innerWidth, y: (1 - p.y) * window.innerHeight};
    },

    /**
     * @param {number} w 
     */
    toAbsoluteWidth: (w) => {
        return w * window.innerWidth;
    },

    /**
     * @param {number} h 
     */
    toAbsoluteHeight: (h) => {
        return h * window.innerHeight;
    },

    /**
     * @param {number} n 
     */
    toAbsoluteSmallerSide: (n) => {
        return n * Math.min(window.innerHeight, window.innerWidth);
    },

    /**
     * @param {number} centerX 
     * @param {number} width 
     */
    getStartFromCenter: (centerX, width) => {
        return centerX - (width / 2)
    },

    /**
     * @param {import("./types.js").Vec2} lhs 
     * @param {import("./types.js").Vec2} rhs 
     * @returns 
     */
    isBiggerVec2: (lhs, rhs) => {
        return lhs.x > rhs.x && lhs.y > rhs.y
    },

    /**
     * @param {import("./types.js").Vec2} lhs 
     * @param {import("./types.js").Vec2} rhs 
     */
    subtractVec2: (lhs, rhs) => {
        return {x: lhs.x - rhs.x, y: lhs.y - rhs.y};
    },

    /**
     * @param {import("./types.js").Vec2} lhs 
     * @param {import("./types.js").Vec2} rhs 
     */
    addVec2: (lhs, rhs) => {
        return {x: lhs.x + rhs.x, y: lhs.y + rhs.y};
    },

    /**
     * @param {import("./types.js").Vec2} lhs 
     * @param {number} n 
     * @returns 
     */
    multiplyVec2: (lhs, n) => {
        return {x: lhs.x * n, y: lhs.y * n};
    },

    /**
     * @param {number} value 
     * @param {number} oldMin 
     * @param {number} oldMax 
     * @param {number} newMin 
     * @param {number} newMax 
     * @returns 
     */
    mapRange: (value, oldMin, oldMax, newMin, newMax) => {
        return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
    },

    /**
     * 
     * @param {[import("./types.js").Vec2, import("./types.js").Vec2]} box 
     * @param {import("./types.js").Vec2} pos 
     */
    isPosInVec2: (box, pos) => {
        return box[0].x <= pos.x &&
            box[1].x >= pos.x &&
            box[0].y <= pos.y &&
            box[1].y >= pos.y;
    },

    calculateVelocityModifier: () => {
        const BASE_RESOLUTION = {x: 1280, y: 720};
        return {x: window.innerWidth / BASE_RESOLUTION.x, y: window.innerHeight / BASE_RESOLUTION.y};
    }
}
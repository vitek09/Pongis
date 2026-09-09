// @ts-check
import { MathUtils } from "./utils.js";

class InputHandler {
    /** @type {import("./types.js").KeyMap} */
    #pressedKeys

    constructor() {
        this.#pressedKeys = /** @type {any} */ ({});

        window.addEventListener("keydown", (event) => this.#handleKeyPress(event))
        window.addEventListener("keyup", (event) => this.#handleKeyUnpress(event))
    }

    /**
     * @param {KeyboardEvent} event 
     */
    #handleKeyPress(event) {
        this.#pressedKeys[/** @type {import("./types.js").LowercaseChar | import("./types.js").ArrowKey } */(event.key.toLowerCase())] = true;
    }

    /**
     * @param {KeyboardEvent} event 
     */
    #handleKeyUnpress(event) {
        this.#pressedKeys[/** @type {import("./types.js").LowercaseChar | import("./types.js").ArrowKey } */(event.key.toLowerCase())] = false;
    }

    /**
     * @param {import("./types.js").LowercaseChar | import("./types.js").ArrowKey | import("./types.js").Space} key 
     */
    isKeyPressed(key) {
        return this.#pressedKeys[/** @type {import("./types.js").LowercaseChar | import("./types.js").ArrowKey | import("./types.js").Space } */ (key.toLowerCase())];
    }
}

class PongPlayer {
    static COLOR = "#fff";
    static WIDTH = 15;
    static HEIGHT = 100;

    /** @type {Readonly<import("./types.js").Vec2>} */
    #initPos

    /** @type {import("./types.js").Vec2} */
    #pos
    /** @type {Readonly<import("./types.js").KeyBindings>} */
    #controlKeys
    /** @type {Readonly<InputHandler>} */
    #inputHandler

    /** @type {number} */
    #score
    /** @type {HTMLParagraphElement} */
    #scoreDisplay

    /**
     * @param {import("./types.js").Vec2} initPos 
     * @param {Readonly<import("./types.js").KeyBindings>} controlKeys
     * @param {Readonly<InputHandler>} inputHandler 
     * @param {HTMLParagraphElement} scoreDisplay
     */
    constructor(initPos, controlKeys, inputHandler, scoreDisplay) {
        this.#initPos = initPos;
        this.#pos = MathUtils.toAbsoluteCoords(initPos);
        this.#controlKeys = controlKeys;
        this.#inputHandler = inputHandler;
        this.#score = 0;
        this.#scoreDisplay = scoreDisplay;

        this.#scoreDisplay.textContent = `${this.#score}`;
    }

    /**
     * @param {import("./types.js").Vec2} center 
     */
    #getHitboxWithOrigin(center) {
        const topLeft = {x: center.x - (PongPlayer.WIDTH / 2), y: center.y - (PongPlayer.HEIGHT / 2)};
        const bottomRight = MathUtils.addVec2(topLeft, {x: PongPlayer.WIDTH, y: PongPlayer.HEIGHT});

        return [topLeft, bottomRight];
    }

    getHitbox() {
        return this.#getHitboxWithOrigin(this.#pos);
    }

    /**
     * @param {number} delta 
     */
    #tickMovement(delta) {
        if(this.#inputHandler.isKeyPressed(this.#controlKeys[0])) {  // up movement
            const predictedY = this.#pos.y - (0.5 * delta * MathUtils.calculateVelocityModifier().y);
            if (predictedY - (PongPlayer.HEIGHT / 2) >= 0) this.#pos.y = predictedY;
        }
        if(this.#inputHandler.isKeyPressed(this.#controlKeys[1])) {  // down movement
            const predictedY = this.#pos.y + (0.5 * delta * MathUtils.calculateVelocityModifier().y);
            if (predictedY <= window.innerHeight - (PongPlayer.HEIGHT / 2)) this.#pos.y = predictedY;
        }
    }

    /**
     * @param {number} delta 
     */
    tick(delta) {
        this.#tickMovement(delta);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.fillStyle = PongPlayer.COLOR;
        ctx.fillRect(this.#pos.x - (PongPlayer.WIDTH / 2), this.#pos.y - (PongPlayer.HEIGHT / 2), PongPlayer.WIDTH, PongPlayer.HEIGHT);
    }

    /**
     * @param {import("./types.js").Vec2} newPos 
     */
    moveTo(newPos) {
        this.#pos = newPos;
    }

    score() {
        this.#score++;
        this.#scoreDisplay.textContent = `${this.#score}`;
    }

    resetPos() {
        this.#pos = MathUtils.toAbsoluteCoords(this.#initPos);
    }
}

class Ball {
    static RADIUS = 10;
    static COLOR = "#fff";

    /** @type {HTMLCanvasElement} */
    #canvas
    /** @type {import("./types.js").Vec2} */
    #pos
    /** @type {import("./types.js").Vec2} */
    #velocity
    /** @type {PongPlayer} */
    #player1
    /** @type {PongPlayer} */
    #player2

    /**
     * @param {PongPlayer} player1
     * @param {PongPlayer} player2
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(player1, player2, canvas) {
        this.#pos = MathUtils.toAbsoluteCoords({x: 0.5, y: 0.5});
        this.#velocity = {x: 0.5, y: 0};

        this.#canvas = canvas;
        this.#player1 = player1;
        this.#player2 = player2;
    }

    #resetBall() {
        this.#pos = MathUtils.toAbsoluteCoords({x: 0.5, y: 0.5});
        this.#velocity = {x: 0.5, y: 0};
    }

    /**
     * @param {number} delta 
     */
    tick(delta) {
        let correctedVelocity = MathUtils.multiplyVec2(this.#velocity, delta);
        correctedVelocity.x *= MathUtils.calculateVelocityModifier().x;
        correctedVelocity.y *= MathUtils.calculateVelocityModifier().y;

        let predictedPos = MathUtils.addVec2(this.#pos, correctedVelocity);
        
        const p1Hitbox = this.#player1.getHitbox();
        const p2Hitbox = this.#player2.getHitbox();

        const ballLeftEdge = { x: predictedPos.x - Ball.RADIUS, y: predictedPos.y };
        if (MathUtils.isPosInVec2([p1Hitbox[0], p1Hitbox[1]], ballLeftEdge)) {
            this.#velocity.x = Math.abs(this.#velocity.x); 

            const centerY = (p1Hitbox[0].y + p1Hitbox[1].y) / 2;
            const halfPaddleHeight = Math.abs(p1Hitbox[0].y - p1Hitbox[1].y) / 2;


            const normalizedIntersect = (this.#pos.y - centerY) / halfPaddleHeight;
            this.#velocity.y = MathUtils.mapRange(normalizedIntersect, -1, 1, -0.5, 0.5);

            predictedPos.x = p1Hitbox[1].x + Ball.RADIUS;
        }

        const ballRightEdge = { x: predictedPos.x + Ball.RADIUS, y: predictedPos.y };
        if (MathUtils.isPosInVec2([p2Hitbox[0], p2Hitbox[1]], ballRightEdge)) {
            this.#velocity.x = -Math.abs(this.#velocity.x); 

            const centerY = (p2Hitbox[0].y + p2Hitbox[1].y) / 2;
            const halfPaddleHeight = Math.abs(p2Hitbox[0].y - p2Hitbox[1].y) / 2;

            const normalizedIntersect = (this.#pos.y - centerY) / halfPaddleHeight;
            this.#velocity.y = MathUtils.mapRange(normalizedIntersect, -1, 1, -0.5, 0.5);

            predictedPos.x = p2Hitbox[0].x - Ball.RADIUS;
        }

        const ballBottom = predictedPos.y + Ball.RADIUS;
        if(ballBottom >= this.#canvas.height) {
            predictedPos.y = this.#canvas.height - Ball.RADIUS;
            this.#velocity.y = -Math.abs(this.#velocity.y); 
        }

        const ballTop = predictedPos.y - Ball.RADIUS;
        if(ballTop <= 0) {
            predictedPos.y = Ball.RADIUS;
            this.#velocity.y = Math.abs(this.#velocity.y); 
        }

        this.#pos = predictedPos;

        if(this.#pos.x <= 0 + Ball.RADIUS) {
            this.#player2.score();
            this.#player1.resetPos();
            this.#player2.resetPos();
            this.#resetBall();
        }

        if(this.#pos.x >= this.#canvas.width - Ball.RADIUS) {
            this.#player1.score();
            this.#player1.resetPos();
            this.#player2.resetPos();
            this.#resetBall();
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.beginPath();
        ctx.fillStyle = Ball.COLOR;
        ctx.arc(this.#pos.x, this.#pos.y, Ball.RADIUS, 0, 2 * Math.PI);
        ctx.fill();
    }

    getPos() {
        return this.#pos;
    }

    /**
     * @param {import("./types.js").Vec2} newPos 
     */
    moveTo(newPos) {
        this.#pos = newPos;
    }
}

export class Game {
    static GAME_BACKGROUND_COLOR = "#000000";

    /** @type {boolean} */
    #started;
    /** @type {HTMLHeadingElement} */
    #startInfo;

    /** @type {HTMLCanvasElement} */
    #canvas;
    /** @type {CanvasRenderingContext2D} */
    #ctx;
    /** @type {number} */
    #lastTime;

    /** @type {InputHandler} */
    #inputHandler;
    
    /** @type {PongPlayer} */
    #wsadPlayer
    /** @type {PongPlayer} */
    #arrowPlayer
    /** @type {Ball} */
    #pongBall

    /**
     * @param {HTMLElement | HTMLCanvasElement | null} canvas 
     * @param {HTMLElement | HTMLParagraphElement | null} wsadScore
     * @param {HTMLElement | HTMLParagraphElement | null} arrowScore
     * @param {HTMLElement | HTMLHeadingElement | null} startInfo 
     */
    constructor(canvas, wsadScore, arrowScore, startInfo) {
        if(!(canvas instanceof HTMLCanvasElement)) throw new Error("Command and Game Input elements must be valid!");
        if(!(wsadScore instanceof HTMLParagraphElement)) throw new Error("Command and Game Input elements must be valid!");
        if(!(arrowScore instanceof HTMLParagraphElement)) throw new Error("Command and Game Input elements must be valid!");
        if(!(startInfo instanceof HTMLHeadingElement)) throw new Error("Command and Game Input elements must be valid!");

        this.#canvas = canvas;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        let context = canvas.getContext("2d");

        if(!context) throw new Error("Canvas isn't supported!");
        this.#ctx = context;
        this.#lastTime = 0;
        this.#inputHandler = new InputHandler();
        this.#started = false;
        this.#startInfo = startInfo;

        this.#wsadPlayer = new PongPlayer({x: 0.1, y: 0.5}, ['w', 's'], this.#inputHandler, wsadScore);
        this.#arrowPlayer = new PongPlayer({x: 0.9, y: 0.5}, ['ArrowUp', 'ArrowDown'], this.#inputHandler, arrowScore);
        this.#pongBall = new Ball(this.#wsadPlayer, this.#arrowPlayer, this.#canvas);

        window.addEventListener("resize", (event) => this.#onSizeChange(event));
    }

    /**
     * @param {Event} event 
     */
    #onSizeChange(event) {
        const newBallX = MathUtils.mapRange(this.#pongBall.getPos().x, 0, this.#canvas.width, 0, this.#canvas.clientWidth);
        const newBallY = MathUtils.mapRange(this.#pongBall.getPos().y, 0, this.#canvas.height, 0, this.#canvas.clientHeight);

        this.#canvas.width = this.#canvas.clientWidth;
        this.#canvas.height = this.#canvas.clientHeight;

        this.#wsadPlayer.moveTo(MathUtils.toAbsoluteCoords({x: 0.1, y: 0.5}));
        this.#arrowPlayer.moveTo(MathUtils.toAbsoluteCoords({x: 0.9, y: 0.5}));
        this.#pongBall.moveTo({x: newBallX, y: newBallY});
    }

    #clearCanvas() {
        this.#ctx.fillStyle = Game.GAME_BACKGROUND_COLOR;
        this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    }

    #draw() {
        this.#clearCanvas();
        this.#wsadPlayer.draw(this.#ctx);
        this.#arrowPlayer.draw(this.#ctx);
        this.#pongBall.draw(this.#ctx);
    }

    /**
     * @param {number} delta 
     */
    #eventLoop(delta) {
        this.#clearCanvas();
        if(this.#started) {
            this.#wsadPlayer.tick(delta);
            this.#arrowPlayer.tick(delta);
            this.#pongBall.tick(delta);
        } else {
            if(this.#inputHandler.isKeyPressed(" ")) {
                this.#started = true;
                this.#startInfo.hidden = true;
            }
        }

        this.#draw();
    }

    /**
     * @param {number} currentTime 
     */
    #runEventLoopWithDelta(currentTime) {
        const delta = currentTime - this.#lastTime;
        this.#lastTime = currentTime;

        this.#eventLoop(delta);
        requestAnimationFrame((t) => this.#runEventLoopWithDelta(t));
    }

    start() {
        requestAnimationFrame((t) => this.#runEventLoopWithDelta(t));
    }
}
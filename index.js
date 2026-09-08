// @ts-check
import { Game } from "./script/game.js";

const canvas = document.getElementById("drawingScreen");
const wsadScore = document.getElementById("wsadScore");
const arrowScore = document.getElementById("arrowScore");
const startInfo = document.getElementById("startInfo")

let game = new Game(canvas, wsadScore, arrowScore, startInfo);
game.start();
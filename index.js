
import './index.css'

import { Maze } from "./src/maze";
import { AStarSolver } from "./src/astar";
import { MazeGame } from "./src/mazegame";
import { generateDepthFirstMaze, generateHuntAndKillMaze } from "./src/generators";

document.body.insertAdjacentHTML('beforeend', `
Click on a maze then use arrow keys to control.
  <div id="game1">
    <div>Depth First Maze</div>
    <hr/>
    <button id='depthfirstsolve'>Show Path</button>
    <button id='depthfirstrace'>Race AI</button>
    AI Move Step (seconds): <input id='depthfirstintv' value='0.3' type='number'/>
    <div>
        <hr/>
        Maze Dimensions:<br/>
        x: <input id='depthfirstX' type='number' value='20'/>
        Y: <input id='depthfirstY' type='number' value='20'/>
        <button id="gendepthfirst">Generate Maze</button>
    </div>
    <canvas id="canvas1" style="width: 50%;" width="500" height="500"></canvas>
  </div>

  <hr/>
  <div id="game2">
    <div>Hunt and Kill Maze</div>
    <hr/>
    <button id='huntkillsolve'>Show Path</button>
    <button id='huntkillrace'>Race AI</button>
    AI Move Step (seconds): <input id='huntkillintv' value='0.3' type='number'/>
    <div>
        <hr/>
        Maze Dimensions:<br/>
        x: <input id='huntkillX' type='number' value='20'/>
        Y: <input id='huntkillY' type='number' value='20'/>
        <button id="genhuntkill">Generate Maze</button>
    </div>
    <canvas id="canvas2" style="width: 50%;" width="500" height="500"></canvas>
  </div>
`);

let nCellsPerRow = 20;
let nRows = 20;

const maze1 = new Maze(nCellsPerRow, nRows, generateDepthFirstMaze);
const maze2 = new Maze(nCellsPerRow, nRows, generateHuntAndKillMaze);

const aStarSolver1 = new AStarSolver(maze1);
const aStarSolver2 = new AStarSolver(maze2);

const mazeGame1 = new MazeGame(maze1, 'canvas1', aStarSolver1, 'darkred');
const mazeGame2 = new MazeGame(maze2, 'canvas2', aStarSolver2);

//setup UI
document.addEventListener('keydown', MazeGame.keyDownHandler);

mazeGame1.setAIInputEvents('depthfirstintv', 'depthfirstsolve', 'depthfirstrace');
mazeGame2.setAIInputEvents('huntkillintv', 'huntkillsolve', 'huntkillrace');

mazeGame1.setGeneratorInputEvents('gendepthfirst','depthfirstX','depthfirstY');
mazeGame2.setGeneratorInputEvents('genhuntkill','huntkillX','huntkillY');



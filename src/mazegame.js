import {Maze} from './maze'
import { AStarSolver } from './astar';

export class MazeGame {

    static activeGame;

    maze; canvas; context; strokeStyle; solver; cellSize; 

    intervalInputId; solveButtonId; raceButtonId;

    
    racing = false;

    constructor(maze, canvas, solver, strokeStyle='blue', playerColor={r:255,b:255,g:0}) {
        this.maze = maze;
        if(typeof canvas === 'string') {
            canvas = document.getElementById(canvas);
        } 
        if(!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 500; canvas.height = 500;
            document.body.appendChild(this.canvas);
        }
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.strokeStyle = strokeStyle;
        this.solver = solver || new AStarSolver(this.maze);
        this.cellSize = this.canvas.width / this.maze.width; //assumed square
        
        this.canvas.addEventListener('click', () => this.setActive());
        this.maze.setPlayer(this.maze.start.x, this.maze.start.y, 0, playerColor);
        this.maze.onWin = () => {
          if(this.racing) this.stopRace();
          this.maze.handleWin();
        }

        this.maze.draw(this.context,this.cellSize,this.strokeStyle);
    }
  

    setAIInputEvents = (intervalInputId, solveButtonId, raceButtonId) => {
        this.intervalInputId = intervalInputId;
        this.solveButtonId = solveButtonId;
        this.raceButtonId = raceButtonId;
        document.getElementById(this.solveButtonId).onclick = () => this.showPath();
        document.getElementById(this.raceButtonId).onclick = () => this.raceAI();
    }

    setGeneratorInputEvents = (genButton,genXInput,genYInput) => {
        document.getElementById(genButton).onclick = () => {
            let w = document.getElementById(genXInput).value;
            let h = document.getElementById(genYInput).value;
            let nCellsPerRow = parseInt(w) ? parseInt(w) : 20;
            let nRows = parseInt(h) ? parseInt(h) : 20;
            this.cellSize = this.canvas.width/(nCellsPerRow > nRows ? nCellsPerRow : nRows); //assume square

            this.maze.reset();
            this.maze.generateMaze(nCellsPerRow,nRows);
            this.maze.draw(this.context, this.cellSize, this.strokeStyle);
        }
    }
    
    setActive = () => {

        if(MazeGame.activeGame) {
            MazeGame.activeGame.canvas.style.border = '';
        }
        // Set the current active game to this instance
        MazeGame.activeGame = this;

        // Add a visual indication that this canvas is active
        MazeGame.activeGame.canvas.style.border = '1px solid orange';
    }

    static keyDownHandler(event) {
        // Ensure there is an active game
        if (!MazeGame.activeGame) return;

        // Apply controls to the active game
        const { maze, context, cellSize, strokeStyle } = MazeGame.activeGame;
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
                event.preventDefault();
                maze.movePlayer('up', 0);
                break;
            case 'ArrowDown':
            case 's':
                event.preventDefault();
                maze.movePlayer('down', 0);
                break;
            case 'ArrowLeft':
            case 'a':
                event.preventDefault();
                maze.movePlayer('left', 0);
                break;
            case 'ArrowRight':
            case 'd':
                event.preventDefault();
                maze.movePlayer('right', 0);
                break;
        }
        // Redraw the maze after moving the player
        maze.draw(context, cellSize, strokeStyle);
    }

    showPath = () => {
        // Show the path for the active game
        this.solver.solve(this.maze.start.x, this.maze.start.y, this.maze.end.x, this.maze.end.y);
        this.solver.drawPath(this.context, this.cellSize);
    }

    raceAI = (onGoalReached = (player, timestamp) => {}, drawPath=false, drawPlayerPath=true) => {
        if (this.racing) {
            this.stopRace();
        } else {
            if(!this.intervalInputId) throw new Error('call setAIInputEvents with valid HTML Elements first!');
            const intervalInput = document.getElementById(this.intervalInputId);
            const interval = intervalInput ? parseFloat(intervalInput.value) * 1000 : 1000;
            const ai = this.maze.addPlayer(this.maze.start.x, this.maze.start.y, undefined, 1);
            this.solver.solve(ai.cell.x, ai.cell.y, this.maze.end.x, this.maze.end.y);
            this.solver.playMoves(interval, 1, this.context, this.cellSize, this.strokeStyle, onGoalReached, drawPath, drawPlayerPath);
            this.racing = true;
        
            // Update the race button text
            document.getElementById(this.raceButtonId).innerText = "Stop Race";
        }
    }
    
    stopRace() {
        this.solver.stopMoves();
        this.racing = false;
    
        // Update the race button text
        document.getElementById(this.raceButtonId).innerText = "Race AI";
    }
}
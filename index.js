
import './index.css'

import { Maze } from "./src/maze";
import { AStarSolver, IDAStarSolver } from "./src/astar";
import { MazeGame } from "./src/mazegame";
import { FlowField } from './src/flowfield'
import { FlowField2 } from "./src/flowfield2"
import { 
  generateDepthFirstMaze, 
  generateHuntAndKillMaze, 
  generateMultiPathDepthFirstMaze,
  generateSidewinderMaze,
  generateEllersMaze,
  generateHuntAndKillWithBraidsMaze,
  noDeadEnds, noDeadEndsSpiral
} from "./src/generators";

import * as BABYLON from 'babylonjs'

console.log("Note: Single threaded test");

function generateMazeUI(
  mazeName, 
  generatorFunction, 
  cellsPerRow, 
  rows,
  use3D=false,
  drawFiddleHeads=false, 
  strokeStyle,
  allowDiagonal=false,
  useTraffic=false,
  doors=undefined,
  randomKeyPlacement=false //if random it will not be along the path to the end (can be like a hint)
) {
  // Generate unique identifiers for DOM elements
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const mazeType = mazeName.toLowerCase().replace(/\s+/g, '');

  // Create the UI elements for this maze game
  document.body.insertAdjacentHTML('beforeend', `
    <div id="game-${uniqueId}">
      <hr/>
      <div style='font-weight:bold;'>${mazeName} Maze</div>
      <hr/>
      <button id='${mazeType}solve-${uniqueId}'>Show Path</button>
      <button id='${mazeType}race-${uniqueId}'>Race AI</button>
      AI Move Step (seconds): <input id='${mazeType}intv-${uniqueId}' value='0.3' type='number'/>
      <button id='${mazeType}animate-${uniqueId}'>Animate Path</button>
      <div id="controls-${uniqueId}">
          <hr/>
          Maze Dimensions:<br/>
          Width (x): <input id='${mazeType}X-${uniqueId}' type='number' value='${cellsPerRow}'/>
          Height (Y): <input id='${mazeType}Y-${uniqueId}' type='number' value='${rows}'/>
          <button id="gen${mazeType}-${uniqueId}">Generate Maze</button>
      </div>
      <div class="maze-container-center">
      <div id="maze-container-${uniqueId}" class="maze-container">
        ${allowDiagonal ? `<button id="upLeft-${uniqueId}" class="arrow-btn up-left-btn">↖</button>` : ''}
        <button id="up-${uniqueId}" class="arrow-btn up-btn">↑</button>
        ${allowDiagonal ? `<button id="upRight-${uniqueId}" class="arrow-btn up-right-btn">↗</button>` : ''}
        <div class="horizontal-buttons">
          <button id="left-${uniqueId}" class="arrow-btn left-btn">←</button>
          <canvas id="canvas-${uniqueId}" style="width: 50%;" width="500" height="500"></canvas>
          <button id="right-${uniqueId}" class="arrow-btn right-btn">→</button>
        </div>
        ${allowDiagonal ? `<button id="downLeft-${uniqueId}" class="arrow-btn down-left-btn">↙</button>` : ''}
        <button id="down-${uniqueId}" class="arrow-btn down-btn">↓</button>
        ${allowDiagonal ? `<button id="downRight-${uniqueId}" class="arrow-btn down-right-btn">↘</button>` : ''}
    </div>
      </div>
    </div>
  `);

  // Set up the maze, the solver, and the game logic for this maze game
  const maze = new Maze(cellsPerRow, rows, generatorFunction, undefined, undefined, allowDiagonal); 
  
  if(doors) {
    maze.addDoorsAndKeys(maze.start,maze.end,doors,Math.floor(Math.min(cellsPerRow,rows)*0.75/doors.length),allowDiagonal,randomKeyPlacement ? 'random' : 'last');
  }

  if(drawFiddleHeads) maze.drawFiddleHeads = drawFiddleHeads;
  const aStarSolver = new AStarSolver(maze);
  const mazeGame = new MazeGame(maze, `canvas-${uniqueId}`, aStarSolver, strokeStyle);


  // Set up the input events for the AI and maze generator
  mazeGame.setAIInputEvents(`${mazeType}intv-${uniqueId}`, `${mazeType}solve-${uniqueId}`, `${mazeType}race-${uniqueId}`);
  mazeGame.setGeneratorInputEvents(
    `gen${mazeType}-${uniqueId}`,`${mazeType}X-${uniqueId}`,`${mazeType}Y-${uniqueId}`, `${mazeType}animate-${uniqueId}`,
    `up-${uniqueId}`, `down-${uniqueId}`, `left-${uniqueId}`, `right-${uniqueId}`,
    `upRight-${uniqueId}`,`upLeft-${uniqueId}`,`downRight-${uniqueId}`,`downLeft-${uniqueId}`,
    0
  );



  if(useTraffic) {
    mazeGame.startTraffic(
      10,
      allowDiagonal,
      300
    );
  }

  //add some animation
  let onPlayerCollision = (player, wallDirection, playerIndex) => {
    console.log("Collision: ", player, wallDirection, playerIndex);
    const canvas = MazeGame.activeGame.canvas; //canvas element

    // Define the intensity and duration of the shake
    let intensity = 2;
    let duration = 200; // in milliseconds
    let frequency = 50; // how many times it shakes back and forth

    // Calculate the initial offset based on the wall direction
    let offsetX = 0, offsetY = 0;
    if (wallDirection === "up") offsetY = 1;
    else if (wallDirection === "down") offsetY = -1;
    else if (wallDirection === "left") offsetX = 1;
    else if (wallDirection === "right") offsetX = -1;

    // Perform the shake
    let startTime = Date.now();
    let shake = () => {
        let elapsed = Date.now() - startTime;
        let progress = elapsed / duration;

        if (progress < 1) {
            let amplitude = intensity * (1 - Math.pow(progress - 1, 2)); // a simple ease out function
            let sineValue = Math.sin(progress * frequency * Math.PI) * amplitude;
            canvas.style.transform = `translate(${offsetX * sineValue}px, ${offsetY * sineValue}px)`;
            requestAnimationFrame(shake);
        } else {
            // Reset the canvas position when the shake is complete
            canvas.style.transform = 'translate(0, 0)';
        }
    };
    shake();
  }

  mazeGame.onPlayerCollision = onPlayerCollision;


  if(use3D) {
    document.body.insertAdjacentHTML('beforeend',`
      <div id="${uniqueId}babylonmaze">
        <span>
          <span id="${uniqueId}fps" style="position:absolute;">FPS</span>
          <canvas id="${uniqueId}renderCanvas" style="width: 50%;" width="800" height="800">
          </canvas>
        </span>
      </div>
    `)
    setupBabylonJS(
      maze, 
      `${uniqueId}renderCanvas`, 
      `${uniqueId}fps`, 
      `gen${mazeType}-${uniqueId}`,
      allowDiagonal
    );
  }

}

// Example usage
generateMazeUI('Hunt & Kill w/ Braids And Doors', generateHuntAndKillWithBraidsMaze, 20, 20, false, false, 'magenta', true, false, ['yellow', 'turquoise', 'red']);
generateMazeUI('Depth First', generateDepthFirstMaze, 20, 20, false,undefined,undefined,undefined,false,['purple'],false);
generateMazeUI('Hunt & Kill', generateHuntAndKillMaze, 20, 20, true, undefined, 'darkred', true);
generateMazeUI('Depth First Multipath', generateMultiPathDepthFirstMaze, 20, 20, false,undefined,undefined,undefined,true);
generateMazeUI('Sidewinder', generateSidewinderMaze, 20, 20);
generateMazeUI('Ellers', generateEllersMaze, 20, 20);
generateMazeUI('No Dead Ends', noDeadEnds, 20, 20, false, true, 'brown'); 
generateMazeUI('Spiraling', noDeadEndsSpiral, 100, 100); 
// Add more calls to `generateMazeUI` for additional mazes as needed.

//setup key events
document.addEventListener('keydown', MazeGame.keyDownHandler);
document.addEventListener('keyup', MazeGame.keyUpHandler);











// Define the terrain types and their costs
const costRules = {
  'grass': 1,        // Passable terrain with low cost
  'water': 5,        // Passable terrain with higher cost
  'mountain': Infinity // Impassable terrain
};

// Create a 20x20 grid with different terrain types
const exampleGrid = [];
for (let y = 0; y < 20; y++) {
  const row = [];
  for (let x = 0; x < 20; x++) {
      if (x > 7 && x < 14 && y > 7 && y < 14) row.push('water');
      else if (y == 19 || (x === 3 && (y > 5 && y < 14))) row.push('mountain');
      else row.push('grass');
  }
  exampleGrid.push(row);
}

// Create FlowField instance with the example grid and cost rules
const flowFieldOptions = {
  allowDiagonal: true,
  avoidance:2,
  avoidanceDampen:0.7,
  maze:new Maze(20, 20, generateMultiPathDepthFirstMaze, undefined, undefined, true)
  // costField: exampleGrid,
  // costRules: costRules
};

const flowField = new FlowField2(flowFieldOptions);

let cv = document.createElement('canvas');

cv.width = 1000; cv.height = 1000;

document.body.insertAdjacentHTML('beforeend',`<hr/><h3>Flow Field Test (Click anywhere) (WIP):</h3>`);
document.body.appendChild(cv);

flowField.visualize(cv);


// import {ActiveInferenceAgent} from './src/actinf'
// let canv = document.createElement('canvas');
// canv.width = 500; canv.height = 500;
// let agent = new ActiveInferenceAgent();

// agent.runSolver(20,20,false,canv,canv.width/20,'red');


// document.body.insertAdjacentElement('beforeend', canv);














async function setupBabylonJS(maze, canvasId, fpsdivId, genbuttonId, allowDiagonal) {
  
  // Get the canvas DOM element
  let canvas = document.getElementById(canvasId);

  const engine = new BABYLON.WebGPUEngine(canvas);
  await engine.initAsync();

  let scene, light;

  let fpsDiv = document.getElementById(fpsdivId);
  let renderFunction = () => {
      light.position.x = 10+10*Math.sin(Date.now()*0.001);
      if(fpsDiv) fpsDiv.innerText = 'FPS: ' + engine.getFps().toFixed(0)
      scene.render();
  }

  function resetBabMaze() {
    setupScene(allowDiagonal);
    // setupShadowGenerator();
    // clearWallsAndFloors();
    // setInstances();
  }


  document.getElementById(genbuttonId)?.addEventListener('click',()=>{
    resetBabMaze();
  });

  function setupScene(allowDiagonal) {
    if(scene) {
      scene.dispose();
      engine.stopRenderLoop(renderFunction);
    }

    scene = new BABYLON.Scene(engine);

    // Create a FreeCamera, and set its position to {x: 0, y: 5, z: -10}
    let camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 50, -10), scene);

    // Target the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // Attach the camera to the canvas
    camera.attachControl(canvas, false);

    // Create a basic light, aiming 0, 1, 0 - meaning, to the sky
    light = new BABYLON.SpotLight('light1', new BABYLON.Vector3(0, 5, -3.5), BABYLON.Vector3.Forward(), 2.2, 0, scene);
    light.shadowEnabled = true;

    const cellSize = 1;
    const cellOffset = cellSize*0.5

    let shadowGenerator;
    let shadowMap;

    function setupShadowGenerator() {
      shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
      shadowGenerator.usePercentageCloserFiltering = true;
      shadowMap = shadowGenerator.getShadowMap();
    }

    setupShadowGenerator();
    
    // Create a built-in "box" shape; its constructor takes 6 params: name, size, scene, updatable, sideOrientation
    let wall;
    
    if(allowDiagonal) wall = BABYLON.MeshBuilder.CreateBox('wall', {height: 1, width: 0.1, depth: 1/Math.sqrt(6)}, scene);
    else wall = BABYLON.MeshBuilder.CreateBox('wall', {height: 1, width: 0.1, depth: 1}, scene);

    wall.receiveShadows = true;
    wall.isVisible = false; // Set the original wall as invisible; it's just a template

    let wallMaterial = new BABYLON.StandardMaterial("wallMaterial", scene);
    //wallMaterial.disableLighting = true;

    wallMaterial.shadowEnabled = true;


    // Function to create and position a wall based on the MazeCell
    function createWall(cell, direction) {
        let instance = wall.createInstance('wall_' + cell.x + '_' + cell.y + '_' + direction);
        instance.isVisible = true;
        shadowMap.renderList.push(instance);
      switch (direction) {
        case 'up':
          instance.position = new BABYLON.Vector3(cell.x * cellSize - cellOffset, cellOffset, cell.y * cellSize - cellSize);
          instance.rotation.y = Math.PI / 2; // Wall is aligned along the x-axis
          break;
        case 'down':
          if(cell.y === maze.height -1) {
            instance.position = new BABYLON.Vector3(cell.x * cellSize - cellOffset, cellOffset, cell.y * cellSize);
            instance.rotation.y = Math.PI / 2; // Wall is aligned along the x-axis
          }
          break;
        case 'right':
          if(cell.x === maze.width -1) {
            instance.position = new BABYLON.Vector3(cell.x * cellSize, cellOffset, cell.y * cellSize - cellOffset);
            instance.rotation.y = 0; // Wall is perpendicular to the x-axis
          }
          break;
        case 'left':
          instance.position = new BABYLON.Vector3(cell.x * cellSize - cellSize, cellOffset, cell.y * cellSize - cellOffset);
          instance.rotation.y = 0; // Wall is perpendicular to the x-axis
          break;
      }
      if(allowDiagonal) {
        let radius = cellSize / 2
         switch(direction) {
          case 'upLeft':
            instance.position = new BABYLON.Vector3(
                cell.x * cellSize + radius * Math.cos(5 * Math.PI / 4) - radius, // x position
                0.5, // y position (assuming walls are centered vertically)
                cell.y * cellSize + radius * Math.sin(5 * Math.PI / 4) - radius // z position
            );
            instance.rotation.y = 3 * Math.PI / 4; // 45 degrees for diagonal alignment
            break;
        case 'upRight':
            instance.position = new BABYLON.Vector3(
                cell.x * cellSize + radius * Math.cos(7 * Math.PI / 4) - radius,
                0.5,
                cell.y * cellSize + radius * Math.sin(7 * Math.PI / 4) - radius
            );
            instance.rotation.y = Math.PI / 4; // -45 degrees for diagonal alignment
            break;
        case 'downLeft':
            instance.position = new BABYLON.Vector3(
                cell.x * cellSize + radius * Math.cos(3 * Math.PI / 4) - radius,
                0.5,
                cell.y * cellSize + radius * Math.sin(3 * Math.PI / 4) - radius
            );
            instance.rotation.y = Math.PI / 4; // -135 degrees for diagonal alignment
            break;
        case 'downRight':
            instance.position = new BABYLON.Vector3(
                cell.x * cellSize + radius * Math.cos(Math.PI / 4) - radius,
                0.5,
                cell.y * cellSize + radius * Math.sin(Math.PI / 4) - radius
            );
            instance.rotation.y = 3 * Math.PI / 4; // 135 degrees for diagonal alignment
            break;
        }
      }

    }


    // Create a template plane for the floor tiles
    var floorTile = BABYLON.MeshBuilder.CreateBox('wall', {height: 1, width: 1, depth: 0.1}, scene);
    floorTile.isVisible = false; // Set the original tile as invisible; it's just a template
    // Prepare material for all tiles
    var tileMaterial = new BABYLON.StandardMaterial("tileMaterial", scene);
    //tileMaterial.disableLighting = true;

    floorTile.receiveShadows = true;
    tileMaterial.shadowEnabled = true;

    //tileMaterial.emissiveColor = BABYLON.Color3.White();

    // Function to create and color a floor tile based on the MazeCell
    function createFloorTile(cell, row, col) {
        let instance = floorTile.createInstance('tile_' + cell.x + '_' + cell.y);
        instance.position = new BABYLON.Vector3((cell.x - cellOffset), 0, (cell.y - cellOffset)); // Adjust position to account for size
        instance.alwaysSelectAsActiveMesh = true;
        instance.rotation.x = Math.PI / 2; // Rotate to lay flat
        shadowMap.renderList.push(instance)
        // Assign a color to the instance based on cell properties
        var color;
        if (cell.isStart) {
            color = new BABYLON.Color4(0, 1, 0, 1); // Start cell is green
        } else if (cell.isEnd) {
            color = new BABYLON.Color4(1, 0, 0, 1); // End cell is red
        } else if (cell.isPath) {
            color = new BABYLON.Color4(0.8, 0.8, 0.8, 1); // Path cell is lighter grey
        } else color = new BABYLON.Color4(1, 1, 1, 1); // default color (white)

        // Apply the color to the instance
        instance.color = color; // Set the color directly to the instance

        return instance;
    }

    //need a pass to create columns


    function setInstances() {
        
      // Setup color buffer
      let instanceCount = maze.width * maze.height;
      let colorData = new Float32Array(4 * instanceCount);
      let index = 0;

      // Loop to create all tiles with their respective colors
      for (var y = 0; y < maze.height; y++) {
        for (var x = 0; x < maze.width; x++) {
            let cell = maze.cells[y][x];
            let tile = createFloorTile(cell, y, x);
            // Compute color data index
            let colorIndex = index * 4;
            colorData[colorIndex] = tile.color.r;
            colorData[colorIndex + 1] = tile.color.g;
            colorData[colorIndex + 2] = tile.color.b;
            colorData[colorIndex + 3] = tile.color.a;
            index++;

            for (let wallDirection in cell.walls) {
              if (cell.walls[wallDirection]) {
                  createWall(cell, wallDirection);
              }
          }
        }
      }

      // Apply the color buffer to the root tile
      var buffer = new BABYLON.VertexBuffer(engine, colorData, BABYLON.VertexBuffer.ColorKind, false, false, 4, true);
      floorTile.setVerticesBuffer(buffer);
      floorTile.material = tileMaterial;

      //var buffer = new BABYLON.VertexBuffer(engine, wallColorData, BABYLON.VertexBuffer.ColorKind, false, false, 4, true);
      //wall.setVerticesBuffer(buffer);
      wall.material = wallMaterial;
    }


    setInstances();

    // Function to clear all wall and floor instances from the scene
    function clearWallsAndFloors() {
      // Filter all meshes that are instances of walls and floors
      scene.meshes.filter(mesh => {
        if(mesh.name.includes('wall_') || mesh.name.includes('tile_')) {
          mesh.dispose(undefined,true);
          return true;
        }
      });
    }


    // Run the engine to render the scene
    engine.runRenderLoop(renderFunction);

  }

  setupScene(allowDiagonal);

  // Resize the engine on window resize
  window.addEventListener('resize', function () {
      engine.resize();
  });

}


// document.body.insertAdjacentHTML('beforeend', `
// Click on a maze then use arrow keys to control.
//   <div id="game1">
//     <div>Depth First Maze</div>
//     <hr/>
//     <button id='depthfirstsolve'>Show Path</button>
//     <button id='depthfirstrace'>Race AI</button>
//     AI Move Step (seconds): <input id='depthfirstintv' value='0.3' type='number'/>
//     <div>
//         <hr/>
//         Maze Dimensions:<br/>
//         x: <input id='depthfirstX' type='number' value='20'/>
//         Y: <input id='depthfirstY' type='number' value='20'/>
//         <button id="gendepthfirst">Generate Maze</button>
//     </div>
//     <canvas id="canvas1" style="width: 50%;" width="500" height="500"></canvas>
//   </div>

//   <hr/>
//   <div id="game2">
//     <div>Hunt and Kill Maze</div>
//     <hr/>
//     <button id='huntkillsolve'>Show Path</button>
//     <button id='huntkillrace'>Race AI</button>
//     AI Move Step (seconds): <input id='huntkillintv' value='0.3' type='number'/>
//     <div>
//         <hr/>
//         Maze Dimensions:<br/>
//         x: <input id='huntkillX' type='number' value='20'/>
//         Y: <input id='huntkillY' type='number' value='20'/>
//         <button id="genhuntkill">Generate Maze</button>
//     </div>
//     <canvas id="canvas2" style="width: 50%;" width="500" height="500"></canvas>
//   </div>
//   <div id="babylonmaze">
//     <span>
//       <span id="fps" style="position:absolute;">FPS</span>
//       <canvas id="renderCanvas" style="width: 50%;" width="800" height="800">
//       </canvas>
//     </span>
//   </div>
// `);

// let nCellsPerRow = 20;
// let nRows = 20;

// const maze1 = new Maze(nCellsPerRow, nRows, generateDepthFirstMaze);
// const maze2 = new Maze(nCellsPerRow, nRows, generateHuntAndKillMaze);

// const aStarSolver1 = new AStarSolver(maze1);
// const aStarSolver2 = new AStarSolver(maze2);

// const mazeGame1 = new MazeGame(maze1, 'canvas1', aStarSolver1, 'darkred');
// const mazeGame2 = new MazeGame(maze2, 'canvas2', aStarSolver2);

// mazeGame1.setAIInputEvents('depthfirstintv', 'depthfirstsolve', 'depthfirstrace');
// mazeGame2.setAIInputEvents('huntkillintv', 'huntkillsolve', 'huntkillrace');

// mazeGame1.setGeneratorInputEvents('gendepthfirst','depthfirstX','depthfirstY');
// mazeGame2.setGeneratorInputEvents('genhuntkill','huntkillX','huntkillY');



// let onPlayerCollision = (player, wallDirection, playerIndex) => {
//     console.log("Collision: ", player, wallDirection, playerIndex);
//     const canvas = MazeGame.activeGame.canvas; //canvas element

//     // Define the intensity and duration of the shake
//     let intensity = 2;
//     let duration = 200; // in milliseconds
//     let frequency = 50; // how many times it shakes back and forth

//     // Calculate the initial offset based on the wall direction
//     let offsetX = 0, offsetY = 0;
//     if (wallDirection === "top") offsetY = 1;
//     else if (wallDirection === "bottom") offsetY = -1;
//     else if (wallDirection === "left") offsetX = 1;
//     else if (wallDirection === "right") offsetX = -1;

//     // Perform the shake
//     let startTime = Date.now();
//     let shake = () => {
//         let elapsed = Date.now() - startTime;
//         let progress = elapsed / duration;

//         if (progress < 1) {
//             let amplitude = intensity * (1 - Math.pow(progress - 1, 2)); // a simple ease out function
//             let sineValue = Math.sin(progress * frequency * Math.PI) * amplitude;
//             canvas.style.transform = `translate(${offsetX * sineValue}px, ${offsetY * sineValue}px)`;
//             requestAnimationFrame(shake);
//         } else {
//             // Reset the canvas position when the shake is complete
//             canvas.style.transform = 'translate(0, 0)';
//         }
//     };
//     shake();
// }

// mazeGame1.onPlayerCollision = onPlayerCollision;
// mazeGame2.onPlayerCollision = onPlayerCollision;




// setupBabylonJS(maze2);


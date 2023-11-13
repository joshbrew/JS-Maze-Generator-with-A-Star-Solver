# Maze Module Documentation

The Maze module is composed of several classes and functions that collectively create and manage a maze with various customization options. It is designed to be integrated into applications requiring maze generation and interactive gameplay. The primary components are the `Maze` class and the `MazeCell` class. Additionally, there is a `SeededRandom` class for randomization, and a few utility functions for drawing special features like spirals.

## SeededRandom Class

```javascript
class SeededRandom {
  constructor(seed);
  set(seed);
  reset();
  random();
}
```

### Methods

- `constructor(seed)`: Initializes a new `SeededRandom` instance with a provided seed. If no seed is given, it defaults to the current time multiplied by a small factor.
- `set(seed)`: Sets the random number generator's seed.
- `reset()`: Resets the random number generation to the initial seed state.
- `random()`: Returns a pseudo-random number between 0 and 1 based on the current seed and internal state.

## Maze Class

```javascript
export class Maze {
  constructor(width, height, generateMazeFunction, onWin, seed, allowDiagonal)
  generateMaze(width, height, generateMazeFunction, onWin, seed, allowDiagonal)
  // Other methods and properties...
}
```

### Properties

- `directions`: Defines the relative movements and wall directions for the four cardinal directions.
- `directionsOct`: Similar to `directions`, but includes diagonal moves suitable for an octagonal grid.
- `cells`: A 2D array representing the cells of the maze.
- `players`: A map tracking player positions and colors within the maze.
- `visitedCells`: A history of visited cells, capped at a configurable number.
- `playerPathLength`: Maximum number of cells to remember in visited path history.
- `drawFiddleHeads`: A flag to enable or disable special spiral drawing features on walls.

### Constructor

- `constructor(width, height, generateMazeFunction, onWin, seed, allowDiagonal)`: Sets up a new Maze with specified dimensions, a generator function for creating the maze, optional win callback, seed for randomization, and flag to allow diagonal movements.

### Methods

- `generateMaze(...)`: Generates a new maze with specified dimensions and characteristics.
- `getDirectionKey(dx, dy)`: Returns the key of a direction based on the delta x and delta y values.
- `getWallDirection(dx, dy)`: Translates directional changes into wall directions.
- `getCell(x, y)`: Retrieves a cell at specific coordinates within the maze.
- `getNeighbors(cell, allowDiagonal)`: Returns neighboring cells around a given cell, with optional diagonal checking.
- `addPlayer(...)`: Adds a new player to the maze.
- `movePlayer(direction, playerIndex, onCollision)`: Moves a player in a given direction.
- `draw(context, size, strokeStyle, drawPlayerPaths)`: Renders the maze onto a given drawing context.

## MazeCell Class

```javascript
export class MazeCell {
  constructor(x, y);
  connect(cell, neighbors);
  disconnect(cell, neighbors);
  setStart();
  setEnd();
  setPath();
  clearPath();
  isDeadEnd(allowDiagonal);
  reset();
  draw(context, size, strokeStyle, allowDiagonal, fiddleheads, seed, bulkDraw);
  // Private methods for drawing...
}
```

### Constructor

- `constructor(x, y)`: Initializes a MazeCell at given x, y coordinates within the maze grid.

### Methods

- `connect(cell, neighbors)`: Establishes a connection to another cell, removing shared walls.
- `disconnect(cell, neighbors)`: Removes a connection to another cell, adding walls as necessary.
- `setStart()`: Marks the cell as the starting point of the maze.
- `setEnd()`: Marks the cell as the ending point of the maze.
- `setPath()`: Marks the cell as part of the player's path.
- `clearPath()`: Clears the cell's status as part of the player's path.
- `isDeadEnd(allowDiagonal)`: Checks if the cell is a dead end.
- `reset()`: Resets the cell's special states.
- `draw(...)`: Draws the cell with its walls and special states.

## Utility Functions

- `drawWallWithSpirals(context, size, fromX, fromY, toX, toY, direction, seed, strokeStyle)`: Draws a wall with decorative spirals.
- `drawSpiral(context, startX, startY, size, turns, wallOrientation, seed, strokeStyle)`: Draws a spiral at a given position.

### Example Usage

The following is a basic example of how to generate and draw a maze using this module:

```javascript
const canvasContext = ...; // Assume we have a canvas context here
const mazeWidth = 10;
const mazeHeight = 10;
const generateMazeFunction = ...; // Assume a maze generation algorithm
const seed = 12345;
const allowDiagonal = false;

const maze = new Maze(mazeWidth, mazeHeight, generateMazeFunction, null, seed, allowDiagonal);
maze.draw(canvasContext, 20); // Drawing cells 20x20 pixels each
```

Please note that some parts of the maze module (like callbacks and drawing) depend on the context within which the module is used and may not function as standalone features without proper integration into an application environment.
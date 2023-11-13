# MazeGame Class Documentation

The MazeGame class in `mazegame.js` integrates the maze generation and A* search capabilities to provide an interactive maze game experience.  

## MazeGame Class

```javascript
export class MazeGame {
  static activeGame;
  static pressedKeys;

  constructor(maze, canvas, solver, strokeStyle, playerColor);
  setAIInputEvents(intervalInputId, solveButtonId, raceButtonId);
  setGeneratorInputEvents(genButton, genXInput, genYInput, animateButton);
  setActive();
  onPlayerCollision(player, wallDirection, playerIndex);
  static keyDownHandler(event);
  static keyUpHandler(event);
  static keyPressCheck(event);
  showPath();
  raceAI(onGoalReached, drawPath, drawPlayerPath);
  stopRace();
}
```

### Constructor

- `constructor(maze, canvas, solver, strokeStyle, playerColor)`: Initializes a new MazeGame instance with a given `Maze`, `canvas`, `AStarSolver`, stroke color, and player color.

### Methods

- `setAIInputEvents(...)`: Binds the algorithm solver functions to HTML input elements (e.g., buttons for showing path and racing AI).
- `setGeneratorInputEvents(...)`: Associates maze generation actions with HTML input elements for setting maze dimensions and triggering new generations.
- `setActive()`: Sets the instance as the active game, indicating visual focus.
- `onPlayerCollision(...)`: Defines behavior for collisions, such as wall hits.
- `showPath()`: Displays the solved path on the maze.
- `raceAI(...)`: Starts an AI race, making an AI-controlled player move through the maze towards the end, following the path solved by AStarSolver.
- `stopRace()`: Stops the ongoing AI race if there is any.

### Static Properties

- `activeGame`: Holds the active MazeGame instance receiving user input.
- `pressedKeys`: A set containing keys currently being pressed down.

### Static Event Handlers

- `keyDownHandler(event)`: Responds to keydown events, tracking pressed keys and calling `keyPressCheck`.
- `keyUpHandler(event)`: Responds to keyup events, removing keys from `pressedKeys` and calling `keyPressCheck`.
- `keyPressCheck(event)`: Computes the combined movement based on key presses and moves the player if the active game is set.

## Example Usage

To instantiate and use the `MazeGame` class, the game initializes all necessary components, and then input/button events for game actions are set up:

```javascript
// Assume instantiated maze, canvas, and solver
const game = new MazeGame(maze, canvas, solver, 'royalblue', {r:30, g:144, b:255});

// Bind interface elements to game actions
game.setAIInputEvents('interval-id', 'solve-button-id', 'race-button-id');
game.setGeneratorInputEvents('generate-button-id', 'width-input-id', 'height-input-id', 'animate-button-id');

// Assign event handlers for player control
document.addEventListener('keydown', MazeGame.keyDownHandler);
document.addEventListener('keyup', MazeGame.keyUpHandler);
```

This class serves as a pivotal layer that manages UI interaction and core functionality of the maze game, linking together maze generation, path solving, and user interaction. It maintains game state, processes player input, and manipulates graphics to deliver a complete maze-solving experience.
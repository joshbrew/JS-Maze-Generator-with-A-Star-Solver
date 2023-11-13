# Maze Generators Module Documentation

The **Maze Generators** module contains a collection of functions for generating mazes using different algorithms. These generators modify the `Maze` class's state by systematically removing walls to create a solvable labyrinth.

## Overview of Generators

The module exports several maze generation algorithms, each with its unique characteristics and complexities. Here's a summary of each exported function and its respective maze generation strategy:

- `generateDepthFirstMaze`: Utilizes depth-first search to create winding paths.
- `generateHuntAndKillMaze`: Blends depth-first search with a "hunt and kill" process, creating more open spaces and dead ends.
- `generateMultiPathDepthFirstMaze`: Adds branching and loops to form multiple solutions in the maze.
- `generateSidewinderMaze`: Produces a maze with long horizontal corridors and fewer vertical connections.
- `generateEllersMaze`: Generates mazes row by row with unique set algorithms.
- `generateHuntAndKillWithBraidsMaze`: An extension of the basic hunt-and-kill algorithm that introduces loops or "braids."
- `noDeadEnds`: Removes dead ends from an existing maze.
- `noDeadEndsSpiral`: Removes dead ends creating a spiral pattern from the maze's center.

Each function accepts the `maze` instance to modify, an optional `seed` for random number generation, and a boolean `allowDiagonal` to permit diagonal wall removals.

## Detailed Functions

### Depth-First Search Generator

```javascript
function generateDepthFirstMaze(maze, seed, allowDiagonal);
```

Generates a maze with a single winding solution path from the top-left cell to the far opposite corner of the maze.

### Hunt-and-Kill Generator

```javascript
function generateHuntAndKillMaze(maze, seed, allowDiagonal);
```

Creates a solvable maze by randomly connecting cells and 'hunting' for unvisited cells to continue generating when no neighbors are available.

### Multipath Depth-First Generator

```javascript
function generateMultiPathDepthFirstMaze(maze, seed, allowDiagonal);
```

Similar to the depth-first method, but creates multiple possible paths and potential loops, offering more than one solution.

### Sidewinder Generator

```javascript
function generateSidewinderMaze(maze, seed, allowDiagonal);
```

Carves paths primarily to the right and occasionally upward, creating mazes with long horizontal ways and relatively less vertical movement.

### Eller's Algorithm Generator

```javascript
function generateEllersMaze(maze, seed);
```

Builds the maze row by row, assigning cells to unique sets, and strategically merging sets to ensure a solvable result.

### Hunt-and-Kill with Braids Generator

```javascript
function generateHuntAndKillWithBraidsMaze(maze, seed, allowDiagonal);
```

Produces more complex mazes by introducing “braids” or loops, ensuring multiple paths between points.

### No Dead Ends Generators

```javascript
function noDeadEnds(maze, seed, allowDiagonal);
function noDeadEndsSpiral(maze, seed, allowDiagonal);
```

Applies post-processing to mazes to remove dead ends, either uniformly or in a spiral pattern, resulting in infinite solution paths.

## Example Usage

Below is a typical way to employ a generator function:

```javascript
const width = 20;
const height = 20;
const maze = new Maze(width, height);
const seedValue = 123456789;
const seed = new SeededRandom(seedValue);
const allowDiagonalMovements = false;

generateHuntAndKillMaze(maze, seed, allowDiagonalMovements);
```

Each generator function takes a `Maze` object that will be modified in-place. The `seed` parameter allows for the generation of reproducible mazes, which is essential for debugging or game design purposes. The `allowDiagonal` parameter can add complexity to the maze by permitting or prohibiting diagonal connections.

The module provides diverse options for maze generation, accommodating various game and application requirements. The supplied algorithms cover a range of maze types, from simple, perfect mazes to intricate designs with multiple solutions or loops.
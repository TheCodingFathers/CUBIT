# Input and Controls

## Overview

CUBIT uses keyboard-based controls to support player movement, puzzle interactions, and gameplay navigation.

## Control Reference

|Input|Action|
|---|---|
|W|Move forward|
|A|Move left|
|S|Move backward|
|D|Move right|
|Space|Jump|
|E|Interact|
|Q|Activate SHIFT|
|R|Activate ROTATE|
|Backspace|Reset|
|Esc|Pause|
|Shift + Rotate|Combined mechanic interaction|

## Input System

The input system is implemented in:

`src/input.js`

It handles keyboard input and communicates player actions to the relevant gameplay systems.

## Control Guidelines

- Controls should remain consistent throughout the game.
    
- Input should respond reliably.
    
- Controls should be clearly communicated to the player.
    
- Input changes should be tested in-game.
    

## Related Notes

- [[Technical Architecture]]
    
- [[Core Gameplay]]
    
- [[SHIFT]]
    
- [[ROTATE]]
    
- [[Testing and Playtesting]]
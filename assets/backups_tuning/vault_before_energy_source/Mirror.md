# Mirror

## Overview

The Mirror is a puzzle mechanism that redirects the energy beam emitted by the Energy Source.

## Visual Design

- Futuristic reflective surface
    
- Navy and blue mechanical frame
    
- Cyan energy interaction
    
- Clean, compact design
    
- Designed to fit on a platform
    

## Core Behavior

- Rotates horizontally around its vertical axis
    
- Each interaction turns it another 90 degrees to the right (clockwise seen from above), so four presses make a full turn
    
- The beam changes direction on every press (a flat mirror reflects the same way every 180 degrees)
    
- Rotation changes the direction of the reflected beam
    
- Must remain upright while rotating
    
- Does not tilt upward or downward
    

## Current Implementation

- Blender model `mirror.glb` (about 376 triangles, source `assets/blender/mirror.blend`); the turning part is named `Mirror_Head`
    
- The lights flare while it turns, and a glow shows where the beam bounces
    
- The beam is cut while the mirror is turning
    
- Turn logic lives in `src/circuit.js` (`Reflector`): each press adds one quarter turn, and the beam logic only uses whether the number of turns is odd or even
    

## Status

- Implemented
    
- Verify the turning in-game (another 90 degrees to the right on every press)
    
- Verify beam redirection
    

## Related Notes

- [[Asset Catalog]]
    
- [[Energy Source]]
    
- [[Receiver]]
    
- [[CUBIT Core of the Cosmos]]
# Receiver

## Overview

The Receiver is a puzzle mechanism that captures energy beams and helps complete the Core Circuit system.

## Visual Design

- Cylindrical cage-inspired structure
    
- Metal mesh surrounding the central energy core
    
- Navy and blue mechanical frame
    
- Cyan energy effects
    
- Orange energy core
    
- Compact futuristic design
    

## Core Behavior

- Receives energy beams
    
- Activates when the required energy reaches it
    
- Uses a powered halo effect to indicate activation
    
- Connects to the Core Circuit system
    

## Current Implementation

- Blender model `receiver.glb` (about 1,376 triangles) built from the concept sheet: low octagonal base with flush corner blocks and an orange front slit, a glass core tube with a disc ring at the top and bottom, a cage of three rings (the middle one open at the front so the beam reaches the core) and slim posts with cyan bars, and a round cap with a cyan top ring
    
- Part names the code needs: `Receiver_Body`, `Receiver_Core`, `Receiver_Lights`, `Receiver_Rays` (and `Receiver_RaysMesh`); materials `Receiver_Navy`, `Receiver_Blue`, `Receiver_Frame`, `Receiver_Core`, `Receiver_Cyan`, `Receiver_Orange`
    
- Turns its front toward the incoming beam; the orange slits turn cyan and three ray ticks appear above the cap when powered
    
- Simplified compared to the sheet: the rings are squared bands, and there is no mesh texture between the bars
    
- Older versions are backed up in `assets/backups_tuning/` (`receiver_v1_hex`, `receiver_v2_crystal`, `receiver_v3_cage`)
    

## Status

- Remodeled in Blender
    
- GLB asset implemented
    
- Flicker fix applied to the cap (parts that shared a plane were separated); not yet confirmed in the browser
    
- Browser verification pending
    

## Related Notes

- [[Asset Catalog]]
    
- [[Energy Source]]
    
- [[Mirror]]
    
- [[Core Circuit]]
    
- [[CUBIT Core of the Cosmos]]
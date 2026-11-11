# Asset Pipeline

## Overview

The CUBIT asset pipeline describes how 3D assets are conceptualized, created, exported, integrated, and tested in the game.

## Asset Workflow

1. Discuss and establish the asset concept.
    
2. Define its visual direction and requirements.
    
3. Create or modify the asset in Blender.
    
4. Review the model before export.
    
5. Export the asset as a GLB file.
    
6. Place the GLB in `public/models/`.
    
7. Load the asset through Three.js.
    
8. Test the asset in the browser.
    
9. Optimize the asset when necessary.
    
10. Update the Asset Catalog and related documentation.
    

## Asset Source Files

Blender source files are stored in:

`assets/blender/`

These files are used for editing and maintaining the original 3D models.

## Export Format

- **Format:** GLB
    
- **Purpose:** Runtime 3D asset loading
    
- **Directory:** `public/models/`
    

## Asset Verification

Check the following after integration:

- Model loads correctly.
    
- Scale and orientation are correct.
    
- Materials and colors appear as intended.
    
- Model fits the game's visual direction.
    
- Asset does not cause unnecessary performance issues.
    
- Asset functions correctly in gameplay.
    

## Asset Documentation

Each major asset should have a corresponding entry in the Asset Catalog.

## Related Notes

- [[Technical Architecture]]
    
- [[Asset Catalog]]
    
- [[Development Workflow]]
    
- [[Testing and Playtesting]]
    
- [[Art Bible]]
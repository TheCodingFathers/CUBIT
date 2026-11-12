# Release Checklist

## Overview

This checklist is used to review CUBIT before preparing a new build or release.

## Build Verification

- Install dependencies if required.
    
- Run the production build.
    
- Confirm that the build completes without errors.
    
- Verify that required assets are included.
    

## Gameplay Verification

- Player movement works correctly.
    
- Core gameplay mechanics function as intended.
    
- Levels can be loaded.
    
- Puzzle interactions work correctly.
    
- Level completion behaves correctly.
    
- Menus and HUD function correctly.
    

## Visual Verification

- 3D assets load correctly.
    
- Materials and lighting appear as intended.
    
- HUD elements are readable.
    
- No major visual issues remain.
    

## Performance Verification

- Gameplay remains responsive.
    
- Asset loading has been checked.
    
- Performance has been reviewed on target hardware.
    

## Documentation and Version Control

- Development Log is updated.
    
- Tasks and Bugs reflects known issues.
    
- Relevant documentation is updated.
    
- Changes are reviewed.
    
- Git commit is created.
    

## CUBIT-Specific Items

- [ ] Remove the FPS counter
    
- [ ] Set `REVIEW_LEVEL_SELECT` to false in `src/main.js` (hides the review level picker and the Test Room)
    
- [ ] Check the title screen, Continue, saved progress and level select in the browser
    
- [ ] Check the World 01 backdrop in the browser (look, FPS, gravity levels)
    
- [ ] Run all three automated test scripts (see [[Testing and Playtesting]])
    

## Release Notes

### Version

### Release Date

### Changes

### Known Issues

## Related Notes

- [[Technical Architecture]]
    
- [[Build and Run Guide]]
    
- [[Testing and Playtesting]]
    
- [[Development Workflow]]
    
- [[Version Control]]
    
- [[Development Log]]
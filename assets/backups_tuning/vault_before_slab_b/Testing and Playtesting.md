# Testing and Playtesting

## Overview

This note documents the testing procedures used to verify CUBIT's gameplay systems, menus, levels, and overall functionality.

## Playtesting Tools

The project includes automated playtesting tools located in:

`tools/playtest/`

|File|Purpose|
|---|---|
|`run.mjs`|Runs automated gameplay tests|
|`scenarios.mjs`|Defines gameplay testing scenarios|
|`menus_test.mjs`|Tests menu behavior, saved progress and unlock rules|
|`backdrop_test.mjs`|Tests the World 01 backdrop: sky, specks, monolith, motion and where it lands on screen|

## Latest Automated Results (2026-11-12)

- Production build: passes
    
- Gameplay playtests (`node tools/playtest/run.mjs`): 36 scenarios pass (Levels 1-11 solved, shortcut attempts blocked)
    
- Menu tests (`node tools/playtest/menus_test.mjs`): 36 checks pass
    
- Backdrop tests (`node tools/playtest/backdrop_test.mjs`): 36 checks pass (sky, specks, monolith, islands, loose cubes, placement on screen)
    
- These are automated only. Visual checks and FPS have not been confirmed in a real browser yet.
    

## Testing Categories

### Gameplay Testing

- Player movement
    
- SHIFT mechanic
    
- ROTATE mechanic
    
- CORE ECHO mechanic
    
- GRAVITY FLIP mechanic
    
- CORE CIRCUIT mechanic
    
- Puzzle interactions
    
- Level completion
    

### Menu Testing

- Main Menu
    
- Level Selection
    
- Pause Menu
    
- Navigation and interactions
    

### Visual Testing

- 3D asset appearance
    
- Lighting and materials
    
- HUD readability
    
- Puzzle feedback
    
- Level presentation
    

### Performance Testing

- Frame rate
    
- Asset loading
    
- Gameplay responsiveness
    
- Performance on low-end hardware
    

## Testing Guidelines

- Test newly implemented features.
    
- Test related systems after modifications.
    
- Confirm that existing functionality remains intact.
    
- Record failed tests and unresolved issues.
    
- Do not treat automated test results as a substitute for browser-based visual verification.
    

## Related Notes

- [[Technical Architecture]]
    
- [[Development Workflow]]
    
- [[Development Log]]
    
- [[Tasks and Bugs]] 
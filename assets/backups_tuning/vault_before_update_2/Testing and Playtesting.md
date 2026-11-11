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
|`menus_test.mjs`|Tests menu behavior|

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
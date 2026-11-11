# CUBIT Tasks and Bugs

This note tracks pending tasks, bugs, and verification work for CUBIT.

## Pending Tasks

- Check the World 01 backdrop (sky and monolith) in the browser: look, brightness, position, readability
    
- Check the backdrop stage 3 islands in the browser: slab, slab B (the gate island on the right) and cluster look and readability (archways must not look like the Core Lock Door), brightness, FPS, and how they look when gravity flips
    
- World 01 light pass
    
- Redesign Energy Source
    
- Verify the Pressure Plate look and press feedback in the browser (art pass already done)
    
- Verify Receiver in the browser
    
- Verify Mirror turning in the browser
    
- Confirm current FPS performance (Level 11 and the Test Room)
    
- Release cleanup: remove the FPS counter, set `REVIEW_LEVEL_SELECT` to false in `src/main.js`
    
- Prepare for release testing
    

## Bugs

### Unconfirmed Issues

- Check whether Receiver flickering still occurs (a fix was applied to the cap; not yet confirmed in the browser)
    
- Check the Mirror: each ROTATE press should turn it another 90 degrees to the right
    
- Check the backdrop in gravity levels 7, 9 and 10 (the sky turns with the view when gravity flips)
    
- Check that the orange monolith crystal is not mistaken for a Core Fragment
    
- Check that Levels 2, 4 and 5 still feel right: the parked SHIFT blocks now hover in new spots, and Q must still reach them (range 3)
    
- Check the title screen, Continue, saved progress and level select in the browser
    
- Verify visual feedback for puzzle mechanisms
    

## Completed

- Implement Levels 1–11
    
- Implement core gameplay mechanisms
    
- Pass headless playtests (36 scenarios) and menu tests (36 checks)
    
- Pressure Plate model and art pass (browser check pending)
    
- Receiver remodel from the concept sheet
    
- Mirror turns another 90 degrees to the right on every press
    
- Playtests for Levels 1-5 and fix of the parked-block shortcuts in Levels 2, 4 and 5
    
- Worlds as data, saved progress, title screen, world and level select
    
- World 01 backdrop stage 1 (sky and specks), stage 2 (monolith) and stage 3 (floating islands and loose cubes), automated tests passing (36 backdrop checks)
    
- `CUBIT_HANDOFF.md` written for the next AI agent
    
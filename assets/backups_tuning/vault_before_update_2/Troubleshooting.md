# Troubleshooting

## Overview

This note records common development issues encountered while working on CUBIT and the general steps used to investigate them.

## Development Server Issues

### Vite Fails to Start

- Confirm the terminal is in the project root.
    
- Check whether dependencies are installed.
    
- Review the terminal error output.
    

### Dependencies or Packages

Run:

```
npm install
```

## Build Issues

### Production Build Fails

Run:

```
npm run build
```

- Review the reported errors.
    
- Identify the affected files.
    
- Resolve the issue.
    
- Run the build again.
    

## 3D Asset Issues

### GLB Model Does Not Load

- Confirm the GLB exists in `public/models/`.
    
- Check the asset path.
    
- Review the browser console.
    
- Verify the model export in Blender.
    

### Model Appears Incorrect

- Check scale and orientation.
    
- Review materials.
    
- Verify the asset in Blender and in the browser.
    

## Gameplay Issues

- Reproduce the issue.
    
- Identify the affected gameplay system.
    
- Review related source files.
    
- Test the fix.
    
- Confirm that existing mechanics still work.
    

## Issue Documentation

Record significant issues in:

[[Tasks and Bugs]]

## Related Notes

- [[Technical Architecture]]
    
- [[Build and Run Guide]]
    
- [[Development Workflow]]
    
- [[Testing and Playtesting]]
    
- [[Development Log]]
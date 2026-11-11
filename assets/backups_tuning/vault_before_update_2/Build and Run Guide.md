# Build and Run Guide

## Overview

This note documents how to install dependencies, launch the CUBIT development server, and build the project.

## Requirements

- Node.js
    
- npm
    
- VS Code or another code editor
    
- Git
    

## Installation

1. Open the CUBIT project folder in VS Code.
    
2. Open the integrated terminal.
    
3. Install project dependencies:
    

```
npm install
```

## Running the Development Server

Start the Vite development server:

```
npm run dev
```

Open the local URL displayed in the terminal.

## Production Build

Create a production build:

```
npm run build
```

## Build Verification

After building:

- Check for build errors.
    
- Verify that the required assets are included.
    
- Test the game in a browser.
    
- Check for console errors.
    

## Troubleshooting

### Dependencies Not Installed

Run:

```
npm install
```

### Development Server Not Starting

- Check whether Node.js and npm are installed.
    
- Check the terminal for error messages.
    
- Verify that the terminal is opened in the project root.
    

### Build Errors

- Review the error output.
    
- Identify the affected file.
    
- Fix the issue and rebuild.
    

## Related Notes

- [[Technical Architecture]]
    
- [[Development Workflow]]
    
- [[Testing and Playtesting]]
    
- [[Development Log]]
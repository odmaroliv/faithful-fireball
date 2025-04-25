# Baja Pacific Relocation Website - Help Guide

## Running the Website

1. Open a terminal or command prompt
2. Navigate to the project directory:
   ```
   cd C:\Users\siste\Documents\bkapp\baja\fresh\faithful-fireball
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open your browser and go to http://localhost:4321

## Issue with Content Disappearing

If you experience issues with content disappearing after refresh:

1. Make sure Tailwind CSS is properly installed:
   ```
   npm install -D tailwindcss@3.4.3 @astrojs/tailwind
   ```

2. Try clearing your browser cache and refreshing

3. If the problem persists, try building a production version:
   ```
   npm run build
   npm run preview
   ```
   
## Project Structure

- `src/components/` - Contains all UI components
- `src/layouts/` - Contains the main layout
- `src/pages/` - Contains the index.astro page
- `src/styles/` - Contains global.css with Tailwind imports
- `public/images/` - Contains the logo and other images
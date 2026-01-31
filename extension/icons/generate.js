// Simple icon generator
// Run: node generate.js
// Creates SVG icons that can be converted to PNG

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 48, 128];

// Create a simple SVG icon
function createSVG(size) {
  const strokeWidth = size / 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#635bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" fill="#18181b"/>
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#635bff" stroke-width="${strokeWidth}"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#635bff" stroke-width="${strokeWidth}"/>
</svg>`;
}

// Save SVGs (can be converted to PNG using any converter)
sizes.forEach(size => {
  fs.writeFileSync(path.join(__dirname, `icon${size}.svg`), createSVG(size));
  console.log(`Created icon${size}.svg`);
});

console.log('\\nConvert SVGs to PNG using:');
console.log('- https://convertio.co/svg-png/');
console.log('- Or: npx sharp-cli --input icon128.svg --output icon128.png --resize 128 128');

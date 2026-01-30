import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const injectPath = join(__dirname, '..', 'bookmarklet', 'inject.js');
const outputPath = join(__dirname, '..', 'bookmarklet', 'bookmarklet.txt');

// Read the inject.js file
const code = readFileSync(injectPath, 'utf-8');

// Minify (basic - remove comments and excess whitespace)
const minified = code
  // Remove single-line comments (but not URLs)
  .replace(/(?<!:)\/\/.*$/gm, '')
  // Remove multi-line comments
  .replace(/\/\*[\s\S]*?\*\//g, '')
  // Collapse whitespace
  .replace(/\s+/g, ' ')
  // Remove space around operators
  .replace(/\s*([{}()[\];,:])\s*/g, '$1')
  // Trim
  .trim();

// Create bookmarklet
const bookmarklet = `javascript:${encodeURIComponent(minified)}`;

// Save to file
writeFileSync(outputPath, bookmarklet);

console.log('Bookmarklet created!');
console.log(`Output: ${outputPath}`);
console.log(`Length: ${bookmarklet.length} characters`);

// Also output a loader bookmarklet (shorter, loads from server)
const loader = `javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3456/inject.js';document.body.appendChild(s);})();`;
const loaderPath = join(__dirname, '..', 'bookmarklet', 'bookmarklet-loader.txt');
writeFileSync(loaderPath, loader);

console.log(`\nLoader bookmarklet (${loader.length} chars): ${loaderPath}`);
console.log('\nThe loader version fetches the script from the server,');
console.log('so you can update inject.js without recreating the bookmarklet.');

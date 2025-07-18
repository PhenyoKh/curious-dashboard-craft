#!/usr/bin/env node

// This is a simple script to generate placeholder PWA icons
// In production, you would use proper graphic design tools or icon generators

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Create a simple SVG icon template
const createSVGIcon = (size) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size * 0.3}" fill="white"/>
    <text x="${size/2}" y="${size/2 + size * 0.08}" text-anchor="middle" fill="#2563eb" font-family="Arial, sans-serif" font-size="${size * 0.2}" font-weight="bold">SF</text>
  </svg>`;
};

// Create placeholder icons
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Created ${filename}`);
});

console.log('Placeholder icons created successfully!');
console.log('Note: For production, replace these with proper PNG icons using a tool like:');
console.log('- PWA Builder (https://www.pwabuilder.com/)');
console.log('- Favicon Generator (https://realfavicongenerator.net/)');
console.log('- Or design custom icons and convert SVG to PNG at various sizes');
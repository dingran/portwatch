#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Create a simple but visible icon programmatically
function createIcon(size) {
  const png = new PNG({ width: size, height: size });

  // Fill with transparent background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0;     // R
      png.data[idx + 1] = 0; // G
      png.data[idx + 2] = 0; // B
      png.data[idx + 3] = 0; // A (transparent)
    }
  }

  // Draw a simple "P" shape in solid black
  const padding = Math.floor(size * 0.15);
  const thickness = Math.max(2, Math.floor(size * 0.12));

  // Vertical line of P
  for (let y = padding; y < size - padding; y++) {
    for (let x = padding; x < padding + thickness; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0;       // R
      png.data[idx + 1] = 0;   // G
      png.data[idx + 2] = 0;   // B
      png.data[idx + 3] = 255; // A (opaque black)
    }
  }

  // Top horizontal line of P
  const midY = Math.floor(size / 2);
  for (let y = padding; y < padding + thickness; y++) {
    for (let x = padding; x < size - padding; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0;
      png.data[idx + 1] = 0;
      png.data[idx + 2] = 0;
      png.data[idx + 3] = 255;
    }
  }

  // Right vertical line of P (top half)
  for (let y = padding; y < midY; y++) {
    for (let x = size - padding - thickness; x < size - padding; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0;
      png.data[idx + 1] = 0;
      png.data[idx + 2] = 0;
      png.data[idx + 3] = 255;
    }
  }

  // Middle horizontal line of P
  for (let y = midY - thickness; y < midY; y++) {
    for (let x = padding; x < size - padding; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0;
      png.data[idx + 1] = 0;
      png.data[idx + 2] = 0;
      png.data[idx + 3] = 255;
    }
  }

  return png;
}

async function generateIcons() {
  const assetsDir = path.join(__dirname, 'assets');

  console.log('🎨 Creating menu bar template icons...');

  // Check if pngjs is available
  try {
    require.resolve('pngjs');
  } catch (e) {
    console.error('❌ pngjs not found. Installing...');
    require('child_process').execSync('npm install pngjs --save-dev', { stdio: 'inherit' });
  }

  const icons = [
    { size: 22, name: 'IconTemplate.png' },
    { size: 44, name: 'IconTemplate@2x.png' }
  ];

  for (const { size, name } of icons) {
    const png = createIcon(size);
    const filepath = path.join(assetsDir, name);

    const buffer = PNG.sync.write(png);
    fs.writeFileSync(filepath, buffer);

    console.log(`  ✓ Created ${name} (${size}×${size}, ${buffer.length} bytes)`);
  }

  console.log('\n✅ Menu bar template icons created successfully!');
  console.log('Note: These icons use solid black (#000000) on transparent background');
  console.log('      They will render correctly in both light and dark menu bar themes');
}

generateIcons().catch(console.error);

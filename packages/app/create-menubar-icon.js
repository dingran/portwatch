#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Create SVG icon for menu bar (simple port symbol)
function createMenubarSVG(size) {
  const padding = size * 0.2;
  const innerSize = size - (padding * 2);
  const strokeWidth = Math.max(1.5, size / 12);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Simple port/plug icon in black -->
  <g fill="black" stroke="none">
    <!-- Left connector plug -->
    <rect x="${padding}" y="${size/2 - innerSize/6}" width="${innerSize * 0.25}" height="${innerSize/3}" rx="${strokeWidth}"/>

    <!-- Right connector receptacle -->
    <rect x="${size - padding - innerSize * 0.25}" y="${size/2 - innerSize/6}" width="${innerSize * 0.25}" height="${innerSize/3}" rx="${strokeWidth}"/>

    <!-- Connection line in middle -->
    <rect x="${size * 0.35}" y="${size/2 - strokeWidth/2}" width="${size * 0.3}" height="${strokeWidth}" rx="${strokeWidth/2}"/>

    <!-- Small dots to indicate activity -->
    <circle cx="${size/2 - innerSize * 0.1}" cy="${size/2 - innerSize * 0.25}" r="${strokeWidth * 0.8}"/>
    <circle cx="${size/2 + innerSize * 0.1}" cy="${size/2 - innerSize * 0.25}" r="${strokeWidth * 0.8}"/>
  </g>
</svg>`;
}

async function generateMenubarIcons() {
  const assetsDir = path.join(__dirname, 'assets');

  console.log('🎨 Creating menu bar icons...');

  // Create standard and retina versions
  const icons = [
    { size: 22, name: 'IconTemplate.png' },
    { size: 44, name: 'IconTemplate@2x.png' }
  ];

  for (const { size, name } of icons) {
    const svgContent = createMenubarSVG(size);
    const svgPath = path.join(assetsDir, `temp_menubar_${size}.svg`);
    const pngPath = path.join(assetsDir, name);

    // Write SVG
    fs.writeFileSync(svgPath, svgContent);

    try {
      // Convert using qlmanage
      execSync(`qlmanage -t -s ${size} -o ${assetsDir} ${svgPath} 2>/dev/null`, { stdio: 'pipe' });

      // Rename output
      const qlOutput = path.join(assetsDir, `temp_menubar_${size}.svg.png`);
      if (fs.existsSync(qlOutput)) {
        fs.renameSync(qlOutput, pngPath);
        const stats = fs.statSync(pngPath);
        console.log(`  ✓ Created ${name} (${size}×${size}, ${stats.size} bytes)`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to create ${name}:`, error.message);
    }

    // Clean up SVG
    if (fs.existsSync(svgPath)) {
      fs.unlinkSync(svgPath);
    }
  }

  console.log('\n✅ Menu bar icons updated!');
}

generateMenubarIcons().catch(console.error);

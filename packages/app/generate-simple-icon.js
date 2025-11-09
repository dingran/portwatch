#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Create a simple "P" icon with background
function createSimpleIcon(size) {
  const fontSize = Math.floor(size * 0.65);
  const cornerRadius = Math.floor(size * 0.18);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5B21B6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background rounded square -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>

  <!-- Letter P -->
  <text
    x="50%"
    y="50%"
    font-family="SF Pro Display, -apple-system, system-ui, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central"
  >P</text>
</svg>`;
}

// Required icon sizes for macOS
const iconSizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' }
];

async function generateIcon() {
  const assetsDir = path.join(__dirname, 'assets');
  const iconsetDir = path.join(assetsDir, 'icon.iconset');

  // Create iconset directory
  if (fs.existsSync(iconsetDir)) {
    execSync(`rm -rf ${iconsetDir}`);
  }
  fs.mkdirSync(iconsetDir, { recursive: true });

  console.log('📝 Generating simple "P" icon...');

  // Generate each required size
  for (const { size, name } of iconSizes) {
    const svgContent = createSimpleIcon(size);
    const svgPath = path.join(iconsetDir, `temp_${size}.svg`);
    const pngPath = path.join(iconsetDir, name);

    // Write SVG
    fs.writeFileSync(svgPath, svgContent);

    try {
      // Convert SVG to PNG using qlmanage
      execSync(`qlmanage -t -s ${size} -o ${iconsetDir} ${svgPath} 2>/dev/null`, { stdio: 'pipe' });

      // qlmanage creates files with .png.png extension, rename them
      const qlOutput = path.join(iconsetDir, `temp_${size}.svg.png`);
      if (fs.existsSync(qlOutput)) {
        fs.renameSync(qlOutput, pngPath);
        console.log(`  ✓ Created ${name} (${size}×${size})`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to create ${name}:`, error.message);
    }

    // Clean up temporary SVG
    if (fs.existsSync(svgPath)) {
      fs.unlinkSync(svgPath);
    }
  }

  console.log('\n🔨 Converting to .icns format...');

  try {
    // Convert iconset to .icns using iconutil
    const icnsPath = path.join(assetsDir, 'icon.icns');
    execSync(`iconutil -c icns ${iconsetDir} -o ${icnsPath}`);

    const stats = fs.statSync(icnsPath);
    console.log(`  ✓ Created icon.icns (${Math.round(stats.size / 1024)}KB)`);

    // Clean up iconset directory
    execSync(`rm -rf ${iconsetDir}`);
    console.log('\n✅ Simple "P" icon generated successfully!');

  } catch (error) {
    console.error('  ✗ Failed to create .icns:', error.message);
  }
}

generateIcon().catch(console.error);

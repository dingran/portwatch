#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Create a simple SVG icon representing a port/network connection
const createSVGIcon = (size) => {
  const padding = size * 0.15;
  const strokeWidth = Math.max(2, size * 0.08);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - padding}" fill="url(#grad)"/>

  <!-- Port icon - simplified connection symbol -->
  <g stroke="white" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round">
    <!-- Left connector -->
    <circle cx="${size * 0.3}" cy="${size * 0.5}" r="${size * 0.08}" stroke-width="${strokeWidth * 0.8}" fill="white"/>

    <!-- Right connector -->
    <circle cx="${size * 0.7}" cy="${size * 0.5}" r="${size * 0.08}" stroke-width="${strokeWidth * 0.8}" fill="white"/>

    <!-- Connection line -->
    <path d="M ${size * 0.38} ${size * 0.5} L ${size * 0.62} ${size * 0.5}"
          stroke-width="${strokeWidth * 1.2}"/>

    <!-- Signal waves -->
    <path d="M ${size * 0.45} ${size * 0.35} Q ${size * 0.5} ${size * 0.4}, ${size * 0.55} ${size * 0.35}"
          stroke-width="${strokeWidth * 0.6}"/>
    <path d="M ${size * 0.45} ${size * 0.65} Q ${size * 0.5} ${size * 0.6}, ${size * 0.55} ${size * 0.65}"
          stroke-width="${strokeWidth * 0.6}"/>
  </g>
</svg>`;
};

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
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  console.log('📝 Generating icon files...');

  // Generate each required size
  for (const { size, name } of iconSizes) {
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(iconsetDir, `temp_${size}.svg`);
    const pngPath = path.join(iconsetDir, name);

    // Write SVG
    fs.writeFileSync(svgPath, svgContent);

    try {
      // Convert SVG to PNG using qlmanage (built into macOS)
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
    // Convert iconset to .icns using iconutil (built into macOS)
    const icnsPath = path.join(assetsDir, 'icon.icns');
    execSync(`iconutil -c icns ${iconsetDir} -o ${icnsPath}`);

    const stats = fs.statSync(icnsPath);
    console.log(`  ✓ Created icon.icns (${Math.round(stats.size / 1024)}KB)`);

    // Clean up iconset directory
    execSync(`rm -rf ${iconsetDir}`);
    console.log('\n✅ App icon generated successfully!');

  } catch (error) {
    console.error('  ✗ Failed to create .icns:', error.message);
    console.error('\nNote: Make sure iconutil is available (built into macOS)');
  }
}

generateIcon().catch(console.error);

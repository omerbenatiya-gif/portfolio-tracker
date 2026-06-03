import sharp from 'sharp';

// Indigo gradient SVG icon
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#4338ca"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <!-- Bar chart icon -->
  <rect x="100" y="280" width="80" height="160" rx="12" fill="white" opacity="0.9"/>
  <rect x="216" y="180" width="80" height="260" rx="12" fill="white"/>
  <rect x="332" y="120" width="80" height="320" rx="12" fill="white" opacity="0.9"/>
</svg>`;

await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/apple-touch-icon.png');

console.log('Icons generated.');

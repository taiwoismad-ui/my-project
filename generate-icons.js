const sharp = require('sharp');
const fs = require('fs');

const sizes = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 32,  name: 'favicon-32.png' },
];

async function generate() {
  const svg = fs.readFileSync('./icon.svg');
  fs.mkdirSync('./planner/assets', { recursive: true });
  for (const { size, name } of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(`./planner/assets/${name}`);
    console.log(`Создан ${name} (${size}x${size})`);
  }
}

generate().catch(console.error);

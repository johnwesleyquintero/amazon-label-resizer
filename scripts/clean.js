const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'output_labels');

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  console.log('🧹 Cleaned output_labels folder.');
} else {
  console.log('ℹ️ output_labels folder is already clean.');
}
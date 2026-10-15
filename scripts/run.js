const { execFileSync } = require('child_process');
const path = require('path');
const { projectRoot, findPython } = require('./python');

const scriptPath = path.join(projectRoot, 'resize_labels.py');

console.log('🚀 Starting Amazon Label Normalizer...\n');

const python = findPython();
if (!python) {
  console.error('❌ Python not found. Install Python 3.9+ (or uv) or run: npm run setup');
  process.exit(1);
}

try {
  execFileSync(python.cmd, [...python.args, scriptPath], {
    stdio: 'inherit',
    cwd: projectRoot,
  });
} catch (error) {
  console.error('\n❌ Execution failed.');
  console.error('   If dependencies are missing, run: npm run setup');
  process.exit(1);
}

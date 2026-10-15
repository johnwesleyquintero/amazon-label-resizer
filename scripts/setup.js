const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { projectRoot, venvPython, findBasePython } = require('./python');

const venvDir = path.join(projectRoot, 'venv');

console.log('📦 Setting up Python virtual environment...');

const base = findBasePython();
if (!base) {
  console.error('❌ Python not found. Install Python 3.9+ (or uv) and re-run: npm run setup');
  process.exit(1);
}

try {
  if (!fs.existsSync(venvPython(venvDir))) {
    console.log(`🐍 Using interpreter: ${base.cmd} ${base.args.join(' ')}`.trim());
    execFileSync(base.cmd, [...base.args, '-m', 'venv', venvDir], {
      stdio: 'inherit',
      cwd: projectRoot,
    });
  } else {
    console.log('ℹ️ Existing virtual environment found.');
  }

  console.log('📥 Installing pypdf...');
  execFileSync(venvPython(venvDir), ['-m', 'pip', 'install', '--upgrade', 'pypdf'], {
    stdio: 'inherit',
    cwd: projectRoot,
  });

  console.log('✅ Setup complete! You can now run: npm run resize');
} catch (error) {
  console.error('❌ Setup failed. Ensure Python 3.9+ is installed.');
  process.exit(1);
}

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Shared Python discovery so every npm script behaves the same way.
const isWindows = os.platform() === 'win32';
const projectRoot = path.join(__dirname, '..');

// Version tags tried in order via the Windows `py` launcher.
// The bare `py` / `-3` default may point at a broken install, so we verify each.
const WINDOWS_PY_TAGS = ['-3.14', '-3.13', '-3.12', '-3.11', '-3.10', '-3.9'];

function isWorking(cmd, args) {
  try {
    execFileSync(cmd, [...args, '--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function venvPython(venvDir) {
  return path.join(venvDir, isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python');
}

// Asks the uv package manager for its managed interpreter (if uv is installed).
function uvPython() {
  try {
    const out = execFileSync('uv', ['python', 'find'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const found = out.trim().split(/\r?\n/).filter(Boolean).pop();
    const interpreter = found && found.trim();
    if (interpreter && fs.existsSync(interpreter) && isWorking(interpreter, [])) {
      return { cmd: interpreter, args: [] };
    }
  } catch {
    // uv not installed
  }
  return null;
}

function basePythonCandidates() {
  if (isWindows) {
    return [
      ...WINDOWS_PY_TAGS.map((tag) => ({ cmd: 'py', args: [tag] })),
      { cmd: 'py', args: [] },
      { cmd: 'python', args: [] },
    ];
  }
  return [
    { cmd: 'python3', args: [] },
    { cmd: 'python', args: [] },
  ];
}

// Finds a usable system interpreter, or null if none respond.
function findBasePython() {
  const fromUv = uvPython();
  if (fromUv) return fromUv;

  for (const candidate of basePythonCandidates()) {
    if (isWorking(candidate.cmd, candidate.args)) return candidate;
  }
  return null;
}

// Prefers the project venv, falling back to a system interpreter.
function findPython(venvDir = path.join(projectRoot, 'venv')) {
  const venv = venvPython(venvDir);
  if (fs.existsSync(venv) && isWorking(venv, [])) {
    return { cmd: venv, args: [] };
  }
  return findBasePython();
}

module.exports = { projectRoot, venvPython, findBasePython, findPython };

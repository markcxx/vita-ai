import { spawn, spawnSync } from 'node:child_process';

const rendererBuild = spawnSync('pnpm', ['--dir', 'frontend', 'build:renderer'], { stdio: 'inherit' });
if (rendererBuild.status !== 0) process.exit(rendererBuild.status || 1);

const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function start(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env });
  children.add(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { children.delete(child); stop(code ?? 0); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
start('uv', ['run', '--directory', 'backend', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000']);
start('pnpm', ['--filter', '@lt-employ-assistant/web', 'dev']);

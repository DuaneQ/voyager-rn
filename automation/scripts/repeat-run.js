#!/usr/bin/env node
const { spawn } = require('child_process');

async function runOnce(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env });
    p.on('exit', (code) => (code === 0 ? resolve(0) : reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`))));
    p.on('error', reject);
  });
}

async function main() {
  const [, , timesStr = '3', platform = 'android'] = process.argv;
  const times = Number(timesStr) || 3;
  const script = platform.toLowerCase().includes('ios') ? './scripts/run-ios-e2e.js' : './scripts/run-android-e2e.js';
  const cwd = require('path').resolve(__dirname, '..');
  for (let i = 1; i <= times; i++) {
    console.log(`\n=== Run ${i}/${times} for ${platform} ===`);
    await runOnce('node', [script], Object.assign({}, process.env));
  }
  console.log(`\nAll ${times} ${platform} runs completed successfully.`);
}

main().catch((err) => {
  console.error('Repeat run failed:', err && err.message ? err.message : err);
  process.exit(1);
});

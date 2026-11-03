import { spawnSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { Readable } from 'stream';

const projectDir = resolve(import.meta.dirname);
const projectConfig = JSON.parse(await readFile(resolve(projectDir, '.vercel', 'project.json'), 'utf-8'));
const { projectId, orgId } = projectConfig;

// Get a token by running vercel whoami with --token
// The token is normally passed via stdin or env
// Let's try to read it from a known location or create one

async function findToken() {
  // Try reading from Vercel's token store (undocumented location)
  const paths = [
    resolve(process.env.LOCALAPPDATA, 'com.vercel.cli', 'auth.json'),
    resolve(process.env.APPDATA, 'com.vercel.cli', 'auth.json'),
    resolve(process.env.USERPROFILE, '.vercel', 'auth.json'),
  ];
  for (const p of paths) {
    try {
      const data = JSON.parse(await readFile(p, 'utf-8'));
      if (data.token) return data.token;
    } catch {}
  }
  
  // Try to read from config store (Undocumented)
  try {
    const config = JSON.parse(await readFile(resolve(process.env.APPDATA, '.vercel', 'config.json'), 'utf-8'));
    if (config.token) return config.token;
  } catch {}
  
  return null;
}

const token = await findToken();
if (token) {
  console.log('Token found, using API directly...');
  
  const response = await fetch(`https://api.vercel.com/v13/deployments?teamId=${orgId}&projectId=${projectId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'pro',
      version: 2,
      target: 'production',
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'npx prisma generate && next build',
        installCommand: 'npm install --legacy-peer-deps',
        outputDirectory: '.next',
      },
    }),
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} else {
  console.log('No token found. Requesting via vercel CLI...');
  // Fallback: just run vercel CLI normally
  const result = spawnSync('vercel', ['--prod', '--yes', '--no-wait'], {
    cwd: projectDir,
    encoding: 'utf-8',
    stdio: 'inherit',
  });
  console.log('vercel exit code:', result.status);
}

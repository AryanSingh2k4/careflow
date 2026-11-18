import { loadEnvFile } from 'node:process';

export function loadOperatorEnv() {
  try {
    loadEnvFile('.env.local');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

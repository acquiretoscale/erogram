#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ts = path.join(path.dirname(fileURLToPath(import.meta.url)), 'batch-deepseek-hottest-slugs.ts');
execSync(`npx tsx "${ts}" ${process.argv.slice(2).join(' ')}`, { stdio: 'inherit', cwd: path.resolve('..') });

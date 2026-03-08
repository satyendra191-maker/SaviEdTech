import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function loadEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return {};
    }

    return readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
        .reduce((acc, line) => {
            const index = line.indexOf('=');
            const key = line.slice(0, index).trim();
            const rawValue = line.slice(index + 1).trim();
            const value = rawValue.replace(/^['"]|['"]$/g, '');

            acc[key] = value;
            return acc;
        }, {});
}

function getProjectRef(env) {
    if (env.SUPABASE_PROJECT_ID) {
        return env.SUPABASE_PROJECT_ID;
    }

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        return null;
    }

    try {
        return new URL(url).hostname.split('.')[0] || null;
    } catch {
        return null;
    }
}

const cwd = process.cwd();
const env = {
    ...loadEnvFile(resolve(cwd, '.env')),
    ...loadEnvFile(resolve(cwd, '.env.local')),
    ...process.env,
};

const projectRef = getProjectRef(env);
if (!projectRef) {
    console.error('Unable to determine Supabase project ref. Set SUPABASE_PROJECT_ID or NEXT_PUBLIC_SUPABASE_URL.');
    process.exit(1);
}

const command = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
const args = ['gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public'];
const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
});

if (result.status !== 0) {
    process.stderr.write(result.stderr || 'Failed to generate Supabase types.\n');
    process.exit(result.status ?? 1);
}

const targetPath = resolve(cwd, 'src', 'types', 'supabase.ts');
writeFileSync(targetPath, result.stdout, 'utf8');
process.stdout.write(`Supabase types written to ${targetPath}\n`);

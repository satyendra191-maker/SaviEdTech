import { existsSync, readFileSync } from 'node:fs';
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

function runSupabase(args, env, cwd) {
    const command = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
    const result = spawnSync(command, args, {
        cwd,
        env,
        stdio: 'inherit',
    });

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

const cwd = process.cwd();
const env = {
    ...loadEnvFile(resolve(cwd, '.env')),
    ...loadEnvFile(resolve(cwd, '.env.local')),
    ...process.env,
};

const args = process.argv.slice(2);
const isLocal = args.includes('--local');

if (isLocal) {
    runSupabase(['db', 'reset', '--local', '--no-seed'], env, cwd);
    process.exit(0);
}

if (env.SUPABASE_DB_URL) {
    runSupabase(['db', 'push', '--db-url', env.SUPABASE_DB_URL], env, cwd);
    process.exit(0);
}

if (env.SUPABASE_DB_PASSWORD) {
    const projectRef = getProjectRef(env);
    if (!projectRef) {
        console.error('SUPABASE_DB_PASSWORD is set, but the project ref is missing. Set SUPABASE_PROJECT_ID or NEXT_PUBLIC_SUPABASE_URL.');
        process.exit(1);
    }

    runSupabase(['link', '--project-ref', projectRef, '--password', env.SUPABASE_DB_PASSWORD], env, cwd);
    runSupabase(['db', 'push'], env, cwd);
    process.exit(0);
}

console.error(
    'No database target configured. Set SUPABASE_DB_URL for direct remote push, ' +
    'or set SUPABASE_DB_PASSWORD with SUPABASE_PROJECT_ID/NEXT_PUBLIC_SUPABASE_URL, ' +
    'or run with --local after starting the local Supabase stack.'
);
process.exit(1);

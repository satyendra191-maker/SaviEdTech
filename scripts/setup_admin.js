import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim().replace(/"/g, '');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars in .env.local');
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
    console.log('Setting up admin user...');

    const adminEmail = 'savita20111991@gmail.com';

    // Check if admin user exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', adminEmail)
        .single();

    if (existingUser) {
        // Update role to super_admin
        const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'super_admin' })
            .eq('id', existingUser.id);

        if (updateError) {
            console.error('Error updating user role:', updateError);
            process.exit(1);
        }

        console.log('Admin user updated successfully!');
    } else {
        console.log('Admin user not found. Please create a user first via registration.');
    }
}

setupAdmin().catch(console.error);

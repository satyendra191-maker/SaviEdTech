import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
    const email = 'satyendra191@gmail.com';
    const password = 'Satyendra@191'; // Set login password
    const fullName = 'Satyendra Yadav';

    console.log(`Creating user: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
    });

    if (authError) {
        console.error('Error creating user:', authError.message);
        
        // Check if user already exists
        if (authError.message.includes('already been registered')) {
            console.log('User already exists. Getting user info...');
            const { data: users } = await supabase.auth.admin.listUsers();
            const existingUser = users?.users.find(u => u.email === email);
            if (existingUser) {
                console.log(`User ID: ${existingUser.id}`);
                console.log(`Email: ${existingUser.email}`);
                
                // Update the profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: existingUser.id,
                        full_name: fullName,
                        email,
                        role: 'admin',
                        is_active: true,
                    });
                
                if (profileError) {
                    console.error('Error updating profile:', profileError.message);
                } else {
                    console.log('Profile updated successfully!');
                }
            }
        }
        process.exit(1);
    }

    if (authData?.user) {
        console.log(`User created successfully! User ID: ${authData.user.id}`);
        
        // Create/update profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id,
                full_name: fullName,
                email,
                role: 'admin',
                is_active: true,
            });

        if (profileError) {
            console.error('Error creating profile:', profileError.message);
        } else {
            console.log('Profile created successfully!');
        }
    }
}

createUser().catch(console.error);

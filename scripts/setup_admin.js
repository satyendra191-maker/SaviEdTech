const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function createAdmin() {
    const email = 'admin@saviedutech.com';
    const password = 'SaviAdmin2026!';

    console.log(`Checking if admin user exists: ${email}`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    let adminUser = users.find(u => u.email === email);

    if (!adminUser) {
        console.log('Creating new admin user in auth.users...');
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (createError) {
            console.error('Error creating admin user:', createError);
            return;
        }
        adminUser = createData.user;
        console.log('Admin user created successfully.');
    } else {
        console.log('Admin user already exists in auth.users.');
    }

    // Now create the profile
    console.log('Upserting admin profile...');
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: adminUser.id,
            email: adminUser.email,
            full_name: 'Super Admin',
            role: 'admin',
            is_active: true,
        });

    if (profileError) {
        console.error('Error creating admin profile:', profileError);
    } else {
        console.log('Admin profile created/updated successfully.');
    }
}

createAdmin();

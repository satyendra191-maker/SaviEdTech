
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function makeAdmin(email: string) {
    console.log(`Setting ${email} as admin...`);
    
    // First, find the user in auth.users to get their ID
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }

    if (!authUsers?.users) {
        console.log('No users found');
        return;
    }
    
    const targetUser = authUsers.users.find(u => u.email === email);
    
    if (!targetUser) {
        console.log(`User ${email} not found in auth.users. They might need to sign up first.`);
        return;
    }

    console.log(`Found user: ${targetUser.id}`);

    // Update the profile role
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', targetUser.id)
        .select();

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Profile updated successfully:', data);
    }
}

makeAdmin('satyendra191@gmail.com');

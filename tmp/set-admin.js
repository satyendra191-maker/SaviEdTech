
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = 'c:/Users/Dell/Downloads/SaviEdTech/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvParam = (param) => {
  const match = envContent.match(new RegExp(`${param}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvParam('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvParam('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setAdmin(email) {
  console.log(`Setting admin role for ${email}...`);

  // 1. Get the user from auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found. They probably haven't signed up yet.`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // 2. Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError);
    return;
  }

  if (!profile) {
    console.log('Profile not found, creating one...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'Admin',
        role: 'admin',
        is_active: true
      });

    if (insertError) {
      console.error('Error inserting profile:', insertError);
    } else {
      console.log('Successfully created admin profile.');
    }
  } else {
    console.log(`Current role: ${profile.role}. Updating to admin...`);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin', is_active: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    } else {
      console.log('Successfully updated profile to admin.');
    }
  }
}

setAdmin('satyendra191@gmail.com');

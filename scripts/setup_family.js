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
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupFamily() {
    console.log('Setting up family...');
    
    // 1. Find or create parent
    const parentEmail = 'savita20111991@gmail.com';
    let { data: parentProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', parentEmail)
        .single();

    if (!parentProfile) {
        console.log('Parent not found. Please register parent first via app.');
        return;
    }

    // Update parent role
    await supabase
        .from('profiles')
        .update({ role: 'parent' })
        .eq('id', parentProfile.id);
    
    console.log('Parent role updated to parent');

    // 2. Find students
    const studentEmails = ['sonakshi332004@gmail.com', 'sona829977@gmail.com'];
    
    for (const email of studentEmails) {
        let { data: studentProfile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .single();

        if (studentProfile) {
            // Update role to student if not already
            await supabase
                .from('profiles')
                .update({ role: 'student' })
                .eq('id', studentProfile.id);
            
            // Create parent link
            await supabase.from('parent_links').upsert({
                parent_id: parentProfile.id,
                student_id: studentProfile.id,
                verification_status: 'approved'
            }, { onConflict: 'parent_id,student_id' });
            
            console.log(`Linked ${email} to parent`);
        } else {
            console.log(`Student ${email} not found. They need to register first.`);
        }
    }

    console.log('Family setup complete!');
}

setupFamily().catch(console.error);

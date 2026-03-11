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

// Mock Data
const mockStudents = [
    { email: 'student_1@test.com', name: 'Amit Kumar', phone: '9999000001', exam_target: 'JEE', class_level: '11' },
    { email: 'student_2@test.com', name: 'Priya Sharma', phone: '9999000002', exam_target: 'NEET', class_level: '12' },
    { email: 'student_3@test.com', name: 'Rahul Verma', phone: '9999000003', exam_target: 'JEE', class_level: '11' },
    { email: 'student_4@test.com', name: 'Sneha Gupta', phone: '9999000004', exam_target: 'NEET', class_level: '12' },
    { email: 'student_5@test.com', name: 'Vikram Singh', phone: '9999000005', exam_target: 'JEE', class_level: '12' },
];

const mockParents = [
    { email: 'parent_1@test.com', name: 'Ramesh Kumar', phone: '9999100001' },
    { email: 'parent_2@test.com', name: 'Sunita Sharma', phone: '9999100002' },
    { email: 'parent_3@test.com', name: 'Anil Gupta', phone: '9999100003' },
];

const adminEmail = 'admin_1@test.com';

// Helper to generate random date in range
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to generate random score
function randomScore(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createMockUsers() {
    console.log('Creating mock users...\n');
    
    // Create Admin
    const { data: adminUser } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'Test@123456',
        email_confirm: true,
        user_metadata: { full_name: 'Admin User', role: 'admin' }
    });
    
    if (adminUser?.user) {
        await supabase.from('profiles').upsert({
            id: adminUser.user.id,
            email: adminEmail,
            full_name: 'Admin User',
            role: 'admin',
            is_active: true
        });
        console.log('✅ Admin created: admin_1@test.com');
    }

    // Create Students
    const studentIds = [];
    for (const s of mockStudents) {
        const { data: authUser } = await supabase.auth.admin.createUser({
            email: s.email,
            password: 'Test@123456',
            email_confirm: true,
            user_metadata: { full_name: s.name, role: 'student', exam_target: s.exam_target, class_level: s.class_level }
        });

        if (authUser?.user) {
            await supabase.from('profiles').upsert({
                id: authUser.user.id,
                email: s.email,
                full_name: s.name,
                phone: s.phone,
                role: 'student',
                exam_target: s.exam_target,
                class_level: s.class_level,
                is_active: true
            });

            // Create student profile with random stats
            await supabase.from('student_profiles').upsert({
                id: authUser.user.id,
                subscription_status: randomScore(0, 1) ? 'premium' : 'free',
                total_points: randomScore(100, 5000),
                study_streak: randomScore(1, 30),
                longest_streak: randomScore(5, 60),
                total_study_minutes: randomScore(100, 5000),
                rank_prediction: randomScore(1000, 50000),
                percentile_prediction: randomScore(60, 99)
            });

            studentIds.push({ id: authUser.user.id, ...s });
            console.log(`✅ Student created: ${s.email} (${s.exam_target})`);
        }
    }

    // Create Parents
    const parentIds = [];
    for (const p of mockParents) {
        const { data: authUser } = await supabase.auth.admin.createUser({
            email: p.email,
            password: 'Test@123456',
            email_confirm: true,
            user_metadata: { full_name: p.name, role: 'parent' }
        });

        if (authUser?.user) {
            await supabase.from('profiles').upsert({
                id: authUser.user.id,
                email: p.email,
                full_name: p.name,
                phone: p.phone,
                role: 'parent',
                is_active: true
            });

            parentIds.push({ id: authUser.user.id, ...p });
            console.log(`✅ Parent created: ${p.email}`);
        }
    }

    // Link students to parents
    console.log('\nLinking students to parents...');
    for (let i = 0; i < studentIds.length; i++) {
        const parentIndex = i % parentIds.length;
        await supabase.from('parent_links').upsert({
            parent_id: parentIds[parentIndex].id,
            student_id: studentIds[i].id,
            verification_status: 'approved'
        });
        console.log(`   Linked ${studentIds[i].email} → ${parentIds[parentIndex].email}`);
    }

    return { studentIds, parentIds };
}

async function populateMockTestData(studentIds) {
    console.log('\nPopulating mock test data...');
    
    for (const student of studentIds) {
        // Create mock test attempts
        for (let i = 0; i < 10; i++) {
            const totalQuestions = randomScore(25, 90);
            const correct = randomScore(5, totalQuestions);
            const negative = randomScore(0, Math.floor(totalQuestions / 4));
            const score = (correct * 4) - (negative * 1);
            const maxScore = totalQuestions * 4;
            const percentile = randomScore(40, 99);

            await supabase.from('test_attempts').insert({
                student_id: student.id,
                test_id: `mock_test_${i}`,
                score,
                max_score: maxScore,
                correct_answers: correct,
                negative_answers: negative,
                percentile,
                time_taken_minutes: randomScore(30, 180),
                attempted_at: randomDate(new Date(2024, 0, 1), new Date())
            });
        }
        console.log(`   ✅ Test data for ${student.email}`);
    }
}

async function populateLectureProgress(studentIds) {
    console.log('\nPopulating lecture progress...');
    
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const chapters = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];
    
    for (const student of studentIds) {
        for (const subject of subjects) {
            for (let i = 0; i < chapters.length; i++) {
                await supabase.from('lecture_progress').insert({
                    student_id: student.id,
                    lecture_id: `lec_${subject}_${i}`,
                    progress_percent: randomScore(0, 100),
                    last_watched_at: randomDate(new Date(2024, 0, 1), new Date()),
                    completed: randomScore(0, 1) === 1
                });
            }
        }
    }
    console.log('   ✅ Lecture progress populated');
}

async function populateDPPData(studentIds) {
    console.log('\nPopulating DPP data...');
    
    for (const student of studentIds) {
        for (let i = 0; i < 15; i++) {
            await supabase.from('dpp_completions').insert({
                student_id: student.id,
                dpp_id: `dpp_${i}`,
                completed: randomScore(0, 1) === 1,
                score: randomScore(40, 100),
                completed_at: randomDate(new Date(2024, 0, 1), new Date())
            });
        }
    }
    console.log('   ✅ DPP data populated');
}

async function main() {
    console.log('========================================');
    console.log('SAVIEDUTECH MOCK DATA POPULATION');
    console.log('========================================\n');

    const { studentIds, parentIds } = await createMockUsers();
    await populateMockTestData(studentIds);
    await populateLectureProgress(studentIds);
    await populateDPPData(studentIds);

    console.log('\n========================================');
    console.log('MOCK DATA CREATION COMPLETE');
    console.log('========================================');
    console.log('\nTest Credentials:');
    console.log('Admin: admin_1@test.com / Test@123456');
    console.log('Students: student_1@test.com - student_5@test.com / Test@123456');
    console.log('Parents: parent_1@test.com - parent_3@test.com / Test@123456');
}

main().catch(console.error);

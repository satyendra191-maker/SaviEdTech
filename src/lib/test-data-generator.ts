/**
 * Test Data Generator
 * 
 * Generates realistic mock data for testing:
 * - 10 students
 * - 10 parents
 * - 5 faculty
 * - 3 admin users
 * - Financial transactions
 * - Donation records
 */

import { createAdminSupabaseClient } from '@/lib/supabase';

const STUDENT_DATA = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', phone: '9876543210' },
    { name: 'Priya Patel', email: 'priya.patel@example.com', phone: '9876543211' },
    { name: 'Rahul Kumar', email: 'rahul.kumar@example.com', phone: '9876543212' },
    { name: 'Sneha Gupta', email: 'sneha.gupta@example.com', phone: '9876543213' },
    { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '9876543214' },
    { name: 'Ananya Reddy', email: 'ananya.reddy@example.com', phone: '9876543215' },
    { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '9876543216' },
    { name: 'Kavya Joshi', email: 'kavya.joshi@example.com', phone: '9876543217' },
    { name: 'Arjun Nair', email: 'arjun.nair@example.com', phone: '9876543218' },
    { name: 'Diya Shah', email: 'diya.shah@example.com', phone: '9876543219' },
];

const PARENT_DATA = [
    { name: 'Mr. Sharma', email: 'sharma.family@example.com', phone: '9876543220' },
    { name: 'Mr. Patel', email: 'patel.family@example.com', phone: '9876543221' },
    { name: 'Mrs. Kumar', email: 'kumar.family@example.com', phone: '9876543222' },
    { name: 'Mr. Gupta', email: 'gupta.family@example.com', phone: '9876543223' },
    { name: 'Mrs. Singh', email: 'singh.family@example.com', phone: '9876543224' },
    { name: 'Mr. Reddy', email: 'reddy.family@example.com', phone: '9876543225' },
    { name: 'Mrs. Mehta', email: 'mehta.family@example.com', phone: '9876543226' },
    { name: 'Mr. Joshi', email: 'joshi.family@example.com', phone: '9876543227' },
    { name: 'Mrs. Nair', email: 'nair.family@example.com', phone: '9876543228' },
    { name: 'Mr. Shah', email: 'shah.family@example.com', phone: '9876543229' },
];

const FACULTY_DATA = [
    { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@saviedutech.com', subject: 'Physics' },
    { name: 'Prof. Sunita Devi', email: 'sunita.devi@saviedutech.com', subject: 'Chemistry' },
    { name: 'Dr. Amit Singh', email: 'amit.singh@saviedutech.com', subject: 'Mathematics' },
    { name: 'Prof. Kavita Rao', email: 'kavita.rao@saviedutech.com', subject: 'Biology' },
    { name: 'Dr. Prakash Sharma', email: 'prakash.sharma@saviedutech.com', subject: 'Physics' },
];

const ADMIN_DATA = [
    { name: 'Satyendra Yadav', email: 'admin@saviedutech.com', role: 'admin' },
    { name: 'Finance Manager', email: 'finance@saviedutech.com', role: 'finance_manager' },
    { name: 'Content Manager', email: 'content@saviedutech.com', role: 'content_manager' },
];

const EXAM_TARGETS = ['JEE', 'NEET', 'JEE+NEET'] as const;
const CLASS_LEVELS = ['6', '7', '8', '9', '10', '11', '12', 'Dropper'] as const;

async function generateTestData() {
    const supabase = createAdminSupabaseClient();
    
    console.log('[Test Data] Starting generation...');
    
    const createdUsers = {
        students: [] as string[],
        parents: [] as string[],
        faculty: [] as string[],
        admins: [] as string[],
    };

    // Create Students
    console.log('[Test Data] Creating students...');
    for (const student of STUDENT_DATA) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: student.email,
            phone: student.phone,
            password: 'Test@123',
            email_confirm: true,
            phone_confirm: true,
            user_metadata: {
                full_name: student.name,
            },
        });

        if (authError) {
            console.log(`[Test Data] Student ${student.name}: ${authError.message}`);
            continue;
        }

        if (authData.user) {
            await supabase.from('profiles').insert({
                id: authData.user.id,
                full_name: student.name,
                phone: student.phone,
                email: student.email,
                role: 'student',
                exam_target: EXAM_TARGETS[Math.floor(Math.random() * EXAM_TARGETS.length)],
                class_level: CLASS_LEVELS[Math.floor(Math.random() * CLASS_LEVELS.length)],
                is_active: true,
            });

            createdUsers.students.push(authData.user.id);

            // Create mock payments
            await supabase.from('payments').insert({
                user_id: authData.user.id,
                amount: Math.floor(Math.random() * 50000) + 5000,
                status: 'completed',
                payment_type: 'course_purchase',
                razorpay_payment_id: `pay_${Date.now()}`,
            });

            console.log(`[Test Data] Created student: ${student.name}`);
        }
    }

    // Create Parents
    console.log('[Test Data] Creating parents...');
    for (const parent of PARENT_DATA) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: parent.email,
            phone: parent.phone,
            password: 'Test@123',
            email_confirm: true,
            phone_confirm: true,
            user_metadata: {
                full_name: parent.name,
            },
        });

        if (authError) {
            console.log(`[Test Data] Parent ${parent.name}: ${authError.message}`);
            continue;
        }

        if (authData.user) {
            await supabase.from('profiles').insert({
                id: authData.user.id,
                full_name: parent.name,
                phone: parent.phone,
                email: parent.email,
                role: 'parent',
                is_active: true,
            });

            createdUsers.parents.push(authData.user.id);
            console.log(`[Test Data] Created parent: ${parent.name}`);
        }
    }

    // Create Faculty
    console.log('[Test Data] Creating faculty...');
    for (const faculty of FACULTY_DATA) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: faculty.email,
            password: 'Test@123',
            email_confirm: true,
            user_metadata: {
                full_name: faculty.name,
                subject: faculty.subject,
            },
        });

        if (authError) {
            console.log(`[Test Data] Faculty ${faculty.name}: ${authError.message}`);
            continue;
        }

        if (authData.user) {
            await supabase.from('profiles').insert({
                id: authData.user.id,
                full_name: faculty.name,
                email: faculty.email,
                role: 'faculty',
                is_active: true,
            });

            createdUsers.faculty.push(authData.user.id);
            console.log(`[Test Data] Created faculty: ${faculty.name}`);
        }
    }

    // Create Admins
    console.log('[Test Data] Creating admins...');
    for (const admin of ADMIN_DATA) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: admin.email,
            password: 'Admin@123',
            email_confirm: true,
            user_metadata: {
                full_name: admin.name,
            },
        });

        if (authError) {
            console.log(`[Test Data] Admin ${admin.name}: ${authError.message}`);
            continue;
        }

        if (authData.user) {
            await supabase.from('profiles').insert({
                id: authData.user.id,
                full_name: admin.name,
                email: admin.email,
                role: admin.role,
                is_active: true,
            });

            createdUsers.admins.push(authData.user.id);
            console.log(`[Test Data] Created admin: ${admin.name}`);
        }
    }

    // Create Donations
    console.log('[Test Data] Creating donations...');
    for (let i = 0; i < 10; i++) {
        const userId = createdUsers.students[Math.floor(Math.random() * createdUsers.students.length)];
        if (userId) {
            await supabase.from('payments').insert({
                user_id: userId,
                amount: [500, 1000, 2000, 5000][Math.floor(Math.random() * 4)],
                status: 'completed',
                payment_type: 'donation',
                razorpay_payment_id: `don_${Date.now()}_${i}`,
            });
        }
    }

    console.log('[Test Data] Generation complete!');
    console.log({
        students: createdUsers.students.length,
        parents: createdUsers.parents.length,
        faculty: createdUsers.faculty.length,
        admins: createdUsers.admins.length,
    });

    return createdUsers;
}

export { generateTestData };

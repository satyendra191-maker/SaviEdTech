'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { FacultySubjectDashboard } from '@/components/faculty/faculty-subject-dashboard';

export default function BiologyFacultyPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [profileRes, facultyRes, coursesRes, experimentsRes, assignmentsRes, liveClassesRes, studentsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('faculty').select('*').eq('user_id', user.id).single(),
                supabase.from('courses').select('*, lessons(count), enrollments(count)').ilike('subject', 'biology').order('created_at', { ascending: false }),
                supabase.from('experiments').select('*').ilike('subject', 'biology').order('created_at', { ascending: false }).limit(6),
                supabase.from('assignments').select('*, submissions(count)').ilike('title', '%Biology%').order('due_date', { ascending: true }).limit(5),
                supabase.from('live_classes').select('*').ilike('title', '%Biology%').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(3),
                supabase.from('profiles').select('id, full_name, email, class_level').eq('role', 'student').order('created_at', { ascending: false }).limit(10)
            ]);

            setData({
                profile: profileRes.data,
                faculty: facultyRes.data,
                courses: coursesRes.data || [],
                experiments: experimentsRes.data || [],
                assignments: assignmentsRes.data || [],
                liveClasses: liveClassesRes.data || [],
                students: studentsRes.data || []
            });
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>;
    }

    if (!data?.profile) {
        return <div className="min-h-screen flex items-center justify-center"><p>Please login as faculty to access this page.</p></div>;
    }

    return (
        <FacultySubjectDashboard
            subject="biology" subjectName="Biology" icon="🧬" gradient="from-amber-500 to-orange-400"
            faculty={data.faculty} courses={data.courses} experiments={data.experiments} assignments={data.assignments}
            liveClasses={data.liveClasses} students={data.students} profile={data.profile}
        />
    );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { FacultySubjectDashboard } from '@/components/faculty/faculty-subject-dashboard';

export default function PhysicsFacultyPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const fetchData = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, facultyRes, coursesRes, experimentsRes, simulationsRes, journalsRes, assignmentsRes, dppRes, notesRes, modulesRes, liveClassesRes, attendanceRes, studentsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('faculty').select('*').eq('user_id', user.id).single(),
            supabase.from('courses').select('*, lessons(count), enrollments(count)').ilike('subject', 'physics').order('created_at', { ascending: false }),
            supabase.from('experiments').select('*').ilike('subject', 'physics').order('created_at', { ascending: false }).limit(6),
            supabase.from('simulations').select('*').ilike('subject', 'physics').order('created_at', { ascending: false }).limit(6),
            supabase.from('journals').select('*, student:profiles(full_name), experiment:experiments(title)').order('created_at', { ascending: false }).limit(10),
            supabase.from('assignments').select('*, submissions(count)').ilike('title', '%Physics%').order('due_date', { ascending: true }).limit(5),
            supabase.from('dpp').select('*').ilike('subject', 'physics').order('created_at', { ascending: false }).limit(10),
            supabase.from('generated_notes').select('*').ilike('topic_name', '%Physics%').order('created_at', { ascending: false }).limit(10),
            supabase.from('courses').select('*, lessons(count)').ilike('subject', 'physics').order('created_at', { ascending: false }).limit(10),
            supabase.from('live_classes').select('*').ilike('title', '%Physics%').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(3),
            supabase.from('live_class_attendees').select('*, student:profiles(full_name)').order('created_at', { ascending: false }).limit(50),
            supabase.from('profiles').select('id, full_name, email, class_level').eq('role', 'student').order('created_at', { ascending: false }).limit(10)
        ]);

        setData({
            profile: profileRes.data,
            faculty: facultyRes.data,
            courses: coursesRes.data || [],
            experiments: experimentsRes.data || [],
            simulations: simulationsRes.data || [],
            journals: journalsRes.data || [],
            assignments: assignmentsRes.data || [],
            dpp: dppRes.data || [],
            notes: notesRes.data || [],
            modules: modulesRes.data || [],
            liveClasses: liveClassesRes.data || [],
            attendance: attendanceRes.data || [],
            students: studentsRes.data || []
        });
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();

        // Realtime subscriptions
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = supabase.auth.getUser();
        
        if (!user) return;

        const channels = [
            supabase.channel('faculty-assignments')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'assignments',
                    filter: `title=ilike.*Physics*`
                }, () => {
                    fetchData(); // Refresh on new assignment
                })
                .subscribe(),

            supabase.channel('faculty-journals')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'journals'
                }, () => {
                    fetchData(); // Refresh on new journal
                })
                .subscribe(),

            supabase.channel('faculty-liveclasses')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'live_classes',
                    filter: `title=ilike.*Physics*`
                }, () => {
                    fetchData(); // Refresh on live class changes
                })
                .subscribe(),
        ];

        setRealtimeConnected(true);

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [fetchData]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    if (!data?.profile) {
        return <div className="min-h-screen flex items-center justify-center"><p>Please login as faculty to access this page.</p></div>;
    }

    return (
        <FacultySubjectDashboard
            subject="physics" subjectName="Physics" icon="⚛️" gradient="from-blue-600 to-cyan-500"
            faculty={data.faculty} courses={data.courses} experiments={data.experiments} simulations={data.simulations} journals={data.journals}
            assignments={data.assignments} dpp={data.dpp} notes={data.notes} modules={data.modules}
            liveClasses={data.liveClasses} attendance={data.attendance} students={data.students} profile={data.profile}
        />
    );
}

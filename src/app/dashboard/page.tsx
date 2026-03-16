'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import StudentDashboardContent from '@/components/student/student-dashboard';

export default function StudentDashboardPage() {
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channels = [
                supabase.channel('student-notifications')
                    .on('postgres_changes', { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    }, (payload) => {
                        console.log('New notification:', payload);
                    })
                    .subscribe(),

                supabase.channel('student-progress')
                    .on('postgres_changes', { 
                        event: '*', 
                        schema: 'public', 
                        table: 'student_progress',
                        filter: `student_id=eq.${user.id}`
                    }, (payload) => {
                        console.log('Progress update:', payload);
                    })
                    .subscribe(),

                supabase.channel('student-assignments')
                    .on('postgres_changes', { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'assignments'
                    }, (payload) => {
                        console.log('New assignment:', payload);
                    })
                    .subscribe(),
            ];

            setRealtimeConnected(true);

            return () => {
                channels.forEach(channel => supabase.removeChannel(channel));
            };
        };

        fetchUser();
    }, []);

    return (
        <div>
            {realtimeConnected && (
                <div className="fixed top-16 right-4 z-40 lg:hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live
                    </div>
                </div>
            )}
            
            <StudentDashboardContent />
        </div>
    );
}

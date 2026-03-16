'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface FacultyContextType {
    subject: string | undefined;
    facultyData: FacultyData | null;
    loading: boolean;
    courses: Course[];
    students: Student[];
    assignments: Assignment[];
    refreshData: () => Promise<void>;
}

interface FacultyData {
    id: string;
    user_id: string;
    subject: string;
    qualification: string;
    experience_years: number;
}

interface Course {
    id: string;
    title: string;
    description: string;
    class_level: string;
    enrollments_count: number;
}

interface Student {
    id: string;
    name: string;
    email: string;
    class_level: string;
    progress: number;
}

interface Assignment {
    id: string;
    title: string;
    due_date: string;
    submissions_count: number;
    total_students: number;
}

const FacultyContext = createContext<FacultyContextType | undefined>(undefined);

export function FacultyProvider({ children, subject }: { children: ReactNode; subject?: string }) {
    const [facultyData, setFacultyData] = useState<FacultyData | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabaseBrowserClient();

    const fetchFacultyData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: faculty } = await supabase
                .from('faculty')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (faculty) {
                setFacultyData(faculty);
                
                const currentSubject = subject || faculty.subject;

                const { data: coursesData } = await supabase
                    .from('courses')
                    .select('*')
                    .ilike('subject', currentSubject || '')
                    .order('created_at', { ascending: false });

                if (coursesData) setCourses(coursesData);

                const { data: assignmentsData } = await supabase
                    .from('assignments')
                    .select('*, submissions(count)')
                    .ilike('title', `%${currentSubject || ''}%`)
                    .order('due_date', { ascending: true })
                    .limit(10);

                if (assignmentsData) {
                    setAssignments(assignmentsData.map(a => ({
                        id: a.id,
                        title: a.title,
                        due_date: a.due_date,
                        submissions_count: a.submissions?.[0]?.count || 0,
                        total_students: coursesData?.reduce((acc, c) => acc + (c.enrollments_count || 0), 0) || 0
                    })));
                }
            }
        } catch (error) {
            console.error('Error fetching faculty data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFacultyData();
    }, [subject]);

    return (
        <FacultyContext.Provider value={{ 
            subject, 
            facultyData, 
            loading, 
            courses, 
            students, 
            assignments,
            refreshData: fetchFacultyData 
        }}>
            {children}
        </FacultyContext.Provider>
    );
}

export function useFaculty() {
    const context = useContext(FacultyContext);
    if (context === undefined) {
        throw new Error('useFaculty must be used within a FacultyProvider');
    }
    return context;
}

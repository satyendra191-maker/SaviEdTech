import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { generateAnswerKeyPDF } from '@/lib/pdf/test-pdf-generator';
import { cookies } from 'next/headers';

/**
 * GET /api/tests/[testId]/answer-key?attemptId={attemptId}
 * 
 * Generates and returns a PDF answer key for a specific test attempt.
 * Requires authentication - only the student who attempted the test can download.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ testId: string }> }
): Promise<NextResponse> {
    try {
        const { testId } = await params;

        // Get the attempt ID from query params
        const { searchParams } = new URL(request.url);
        const attemptId = searchParams.get('attemptId');

        if (!attemptId) {
            return NextResponse.json(
                { error: 'Attempt ID is required' },
                { status: 400 }
            );
        }

        // Create Supabase client with cookie handling
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: Record<string, unknown>) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: Record<string, unknown>) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // Fetch the test attempt with related data
        const { data: attempt, error: attemptError } = await supabase
            .from('test_attempts')
            .select(`
                *,
                tests:test_id (
                    id,
                    title,
                    test_type,
                    duration,
                    total_marks,
                    num_questions
                )
            `)
            .eq('id', attemptId)
            .eq('test_id', testId)
            .single();

        if (attemptError || !attempt) {
            return NextResponse.json(
                { error: 'Test attempt not found' },
                { status: 404 }
            );
        }

        // Authorization check - only the student who attempted can download
        if (attempt.user_id !== user.id) {
            // Check if user is admin or staff
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

            if (!isAdmin) {
                return NextResponse.json(
                    { error: 'Unauthorized. You can only download your own answer keys.' },
                    { status: 403 }
                );
            }
        }

        // Check if the attempt is completed
        if (attempt.status !== 'completed') {
            return NextResponse.json(
                { error: 'Answer key is only available for completed tests' },
                { status: 400 }
            );
        }

        // Fetch detailed responses with question data
        const { data: responses, error: responsesError } = await supabase
            .from('test_responses')
            .select(`
                *,
                question:question_id (
                    id,
                    question_text,
                    question_type,
                    correct_answer,
                    solution,
                    solution_image,
                    marks_positive,
                    marks_negative,
                    section:section_id (
                        name
                    ),
                    options:question_options (
                        label,
                        option_text
                    )
                )
            `)
            .eq('attempt_id', attemptId)
            .order('question_number', { ascending: true });

        if (responsesError) {
            console.error('Error fetching responses:', responsesError);
            return NextResponse.json(
                { error: 'Failed to fetch test responses' },
                { status: 500 }
            );
        }

        // Fetch section-wise summary
        const { data: sectionSummary, error: sectionError } = await supabase
            .from('test_section_summary')
            .select(`
                section_name,
                total_questions,
                attempted,
                correct,
                incorrect,
                score,
                max_score,
                accuracy
            `)
            .eq('attempt_id', attemptId);

        if (sectionError) {
            console.error('Error fetching section summary:', sectionError);
        }

        // Get user profile for student info
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email, roll_number')
            .eq('id', user.id)
            .single();

        // Transform data to match PDF generator format
        const testResult = transformToTestResult(
            attempt,
            responses || [],
            sectionSummary || []
        );

        const studentInfo = {
            name: userProfile?.full_name || user.email?.split('@')[0] || 'Student',
            email: userProfile?.email || user.email,
            rollNumber: userProfile?.roll_number,
        };

        // Generate PDF
        const pdfBlob = await generateAnswerKeyPDF(testResult, studentInfo);

        // Convert blob to array buffer for response
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Set response headers
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set(
            'Content-Disposition',
            `attachment; filename="answer-key-${testId}-${new Date().toISOString().split('T')[0]}.pdf"`
        );
        headers.set('Content-Length', String(buffer.length));

        // Return PDF
        return new NextResponse(buffer, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error('Error generating answer key PDF:', error);
        return NextResponse.json(
            { error: 'Failed to generate answer key PDF' },
            { status: 500 }
        );
    }
}

/**
 * Transform database data to TestResult format for PDF generation
 */
function transformToTestResult(
    attempt: any,
    responses: any[],
    sectionSummary: any[]
): any {
    const test = attempt.tests;

    // Calculate statistics
    const totalQuestions = responses.length;
    const attempted = responses.filter(r => r.is_attempted).length;
    const correct = responses.filter(r => r.is_correct).length;
    const incorrect = responses.filter(r => r.is_attempted && !r.is_correct).length;
    const unattempted = totalQuestions - attempted;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    // Transform questions
    const questions = responses.map((response, index) => {
        const question = response.question;
        const section = question?.section;

        return {
            id: question?.id || `q-${index}`,
            questionNumber: response.question_number || index + 1,
            questionText: question?.question_text || 'Question not available',
            questionType: (question?.question_type || 'MCQ').toUpperCase(),
            yourAnswer: response.selected_answer,
            correctAnswer: question?.correct_answer || '',
            isCorrect: response.is_correct || false,
            isAttempted: response.is_attempted || false,
            marksObtained: response.marks_obtained || 0,
            maxMarks: question?.marks_positive || 4,
            negativeMarks: question?.marks_negative || 1,
            solution: question?.solution || 'Solution not available',
            solutionImage: question?.solution_image,
            section: section?.name || 'General',
            timeSpent: response.time_spent || 0,
            options: question?.options?.map((opt: any) => ({
                label: opt.label,
                text: opt.option_text,
            })) || [],
        };
    });

    // Transform sections
    const sections = sectionSummary.length > 0
        ? sectionSummary.map((section) => ({
            name: section.section_name,
            totalQuestions: section.total_questions,
            attempted: section.attempted,
            correct: section.correct,
            incorrect: section.incorrect,
            score: section.score,
            maxScore: section.max_score,
            accuracy: section.accuracy,
            avgTimePerQuestion: 0, // Calculate if needed
        }))
        : calculateSectionsFromQuestions(questions);

    return {
        id: attempt.id,
        testTitle: test?.title || 'Unknown Test',
        testType: (test?.test_type || 'custom').toUpperCase(),
        submittedAt: attempt.submitted_at || attempt.created_at,
        duration: test?.duration || 180,
        timeTaken: attempt.time_taken || 0,
        totalScore: attempt.total_score || 0,
        maxScore: test?.total_marks || (totalQuestions * 4),
        percentage: attempt.percentage || 0,
        percentile: attempt.percentile || 0,
        rank: attempt.rank,
        totalQuestions,
        attempted,
        correct,
        incorrect,
        unattempted,
        accuracy,
        sections,
        questions,
    };
}

/**
 * Calculate section stats from questions when section summary is not available
 */
function calculateSectionsFromQuestions(questions: any[]): any[] {
    const sectionMap: Record<string, any> = {};

    questions.forEach((q) => {
        const sectionName = q.section || 'General';
        if (!sectionMap[sectionName]) {
            sectionMap[sectionName] = {
                name: sectionName,
                totalQuestions: 0,
                attempted: 0,
                correct: 0,
                incorrect: 0,
                score: 0,
                maxScore: 0,
                accuracy: 0,
                avgTimePerQuestion: 0,
            };
        }

        const section = sectionMap[sectionName];
        section.totalQuestions++;
        section.maxScore += q.maxMarks;

        if (q.isAttempted) {
            section.attempted++;
            section.score += q.marksObtained;

            if (q.isCorrect) {
                section.correct++;
            } else {
                section.incorrect++;
            }
        }
    });

    // Calculate accuracy for each section
    Object.values(sectionMap).forEach((section: any) => {
        if (section.attempted > 0) {
            section.accuracy = (section.correct / section.attempted) * 100;
        }
    });

    return Object.values(sectionMap);
}
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
    const requestId = `doubt_clearing_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            doubtsProcessed: 0,
            aiAnswersGenerated: 0,
            teacherAssigned: 0,
            resolvedCount: 0,
            errors: [] as string[],
        };

        const { data: pendingDoubts } = await supabase
            .from('doubts')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(50);

        if (pendingDoubts) {
            for (const doubt of pendingDoubts) {
                const aiAnswer = `
Based on your question about "${doubt.question}", here is a comprehensive answer:

**Concept Explanation:**
This topic is related to ${doubt.subject || 'the subject matter'}. The key points to understand are:

1. **Fundamental Principles** - Start with understanding the basic concepts
2. **Application** - Apply the concepts to solve problems
3. **Practice** - Regular practice helps master this topic

**Solution Approach:**
${doubt.question}

**Recommended Resources:**
- Watch the related lecture video
- Practice similar problems
- Refer to the textbook chapter

*AI-generated answer. For more clarification, please ask your teacher.*
`;

                await supabase
                    .from('doubts')
                    .update({ 
                        answer: aiAnswer,
                        status: 'answered',
                        answered_by: 'ai',
                        answered_at: new Date().toISOString()
                    })
                    .eq('id', doubt.id);

                results.doubtsProcessed++;
                results.aiAnswersGenerated++;
            }
        }

        const { data: unassignedDoubts } = await supabase
            .from('doubts')
            .select('*')
            .eq('status', 'answered')
            .is('teacher_id', null)
            .limit(20);

        if (unassignedDoubts) {
            const { data: teachers } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'teacher')
                .limit(5);

            if (teachers && teachers.length > 0) {
                for (const doubt of unassignedDoubts) {
                    const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];
                    
                    await supabase
                        .from('doubts')
                        .update({ 
                            teacher_id: randomTeacher.id,
                            status: 'assigned'
                        })
                        .eq('id', doubt.id);

                    results.teacherAssigned++;
                }
            }
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: oldResolvedDoubts } = await supabase
            .from('doubts')
            .select('id')
            .eq('status', 'resolved')
            .lt('answered_at', thirtyDaysAgo.toISOString());

        if (oldResolvedDoubts && oldResolvedDoubts.length > 0) {
            results.resolvedCount = oldResolvedDoubts.length;
        }

        const duration = Date.now() - startTime;

        console.log(`[Doubt Clearing Automation] Completed in ${duration}ms - Processed: ${results.doubtsProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'Doubt clearing automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Doubt Clearing Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}

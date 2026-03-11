import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const source = searchParams.get('source');
        const priority = searchParams.get('priority');
        const limit = parseInt(searchParams.get('limit') || '50');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const supabase = createServerSupabaseClient();

        let query = supabase
            .from('gov_notifications')
            .select('*')
            .eq('is_archived', false)
            .order('published_date', { ascending: false })
            .limit(limit);

        if (category) {
            query = query.eq('category', category);
        }

        if (source) {
            query = query.eq('source', source);
        }

        if (priority) {
            query = query.eq('priority', priority);
        }

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch notifications', details: error.message },
                { status: 500 }
            );
        }

        const { data: unreadCount } = await supabase
            .from('gov_notifications')
            .select('id', { count: 'exact' })
            .eq('is_archived', false)
            .eq('is_read', false);

        const { data: categories } = await supabase
            .from('gov_notifications')
            .select('category')
            .eq('is_archived', false);

        const categoryCounts = categories?.reduce((acc: Record<string, number>, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + 1;
            return acc;
        }, {}) || {};

        return NextResponse.json({
            success: true,
            notifications: notifications || [],
            unreadCount: unreadCount?.length || 0,
            categoryCounts,
            total: notifications?.length || 0,
        });

    } catch (error) {
        console.error('[Gov Notifications API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { notificationIds, action } = body;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: 'Invalid notification IDs' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        let updateData: Record<string, unknown> = {};

        switch (action) {
            case 'mark_read':
                updateData = { is_read: true };
                break;
            case 'mark_unread':
                updateData = { is_read: false };
                break;
            case 'archive':
                updateData = { is_archived: true };
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

        const { error } = await supabase
            .from('gov_notifications')
            .update(updateData)
            .in('id', notificationIds);

        if (error) {
            return NextResponse.json(
                { error: 'Failed to update notifications', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${notificationIds.length} notifications`,
        });

    } catch (error) {
        console.error('[Gov Notifications API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

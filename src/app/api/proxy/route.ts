/**
 * API Proxy Layer
 * 
 * Purpose: Hide Supabase credentials and project details from frontend
 * All sensitive database operations go through these proxy endpoints
 * 
 * Usage:
 * GET  /api/proxy?table=profiles&select=*&eq=id:user123&order=created_at:desc&limit=10
 * POST /api/proxy { table: 'profiles', data: { name: 'John' } }
 * PUT  /api/proxy { table: 'profiles', data: { name: 'Jane' }, eq: { column: 'id', value: 'user123' } }
 * DELETE /api/proxy?table=profiles&eq=id:user123
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const getSupabaseClient = async (request: NextRequest) => {
    const cookieStore = await import('next/headers').then(m => m.cookies());
    
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') as string | null;
    const select = searchParams.get('select') || '*';
    const eq = searchParams.get('eq');
    const order = searchParams.get('order');
    const limit = searchParams.get('limit');

    if (!table) {
        return NextResponse.json({ error: 'Table name required' }, { status: 400 });
    }

    try {
        const supabase = await getSupabaseClient(request);
        
        let query = supabase.from(table).select(select);

        if (eq) {
            const [column, value] = eq.split(':');
            if (column && value) {
                query = query.eq(column, value);
            }
        }

        if (order) {
            const [column, direction] = order.split(':');
            query = query.order(column, { ascending: direction !== 'desc' });
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ data, error: null });
    } catch (error) {
        console.error('[API Proxy] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { table, data, returning } = body;

        if (!table || !data) {
            return NextResponse.json({ error: 'Table and data required' }, { status: 400 });
        }

        const supabase = await getSupabaseClient(request);
        
        const result = await supabase.from(table as string).insert(data).select(returning || '*').single();

        if (result.error) throw result.error;

        return NextResponse.json({ data: result.data, error: null });
    } catch (error) {
        console.error('[API Proxy] POST error:', error);
        return NextResponse.json({ error: 'Failed to insert data' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { table, data, eq } = body;

        if (!table || !data || !eq) {
            return NextResponse.json({ error: 'Table, data and eq required' }, { status: 400 });
        }

        const supabase = await getSupabaseClient(request);
        
        // @ts-ignore - complex supabase types
        const result = await supabase.from(table as string).update(data).eq(eq.column, eq.value).select().single();

        if (result.error) throw result.error;

        return NextResponse.json({ data: result.data, error: null });
    } catch (error) {
        console.error('[API Proxy] PUT error:', error);
        return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table') as string | null;
        const eq = searchParams.get('eq');

        if (!table || !eq) {
            return NextResponse.json({ error: 'Table and eq required' }, { status: 400 });
        }

        const supabase = await getSupabaseClient(request);
        
        const [column, value] = eq.split(':');
        
        const { error } = await supabase.from(table).delete().eq(column, value);

        if (error) throw error;

        return NextResponse.json({ success: true, error: null });
    } catch (error) {
        console.error('[API Proxy] DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
    }
}

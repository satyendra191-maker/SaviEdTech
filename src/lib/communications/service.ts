import { createAdminSupabaseClient } from '@/lib/supabase';

export interface CommunicationThread {
    id: string;
    title: string;
    thread_type: 'direct' | 'role' | 'group' | 'announcement';
    target_role: string | null;
    latest_message_at: string;
    is_active: boolean;
    created_at: string;
    participant_count?: number;
}

export interface CommunicationMessage {
    id: string;
    thread_id: string;
    sender_id: string | null;
    content: string;
    attachment_name: string | null;
    attachment_path: string | null;
    attachment_url: string | null;
    attachment_mime: string | null;
    attachment_size: number | null;
    created_at: string;
    sender_name?: string | null;
    sender_role?: string | null;
}

function getAdminClient() {
    return createAdminSupabaseClient() as any;
}

export async function listThreadsForUser(userId: string, role: string): Promise<CommunicationThread[]> {
    const supabase = getAdminClient();

    let query = supabase
        .from('internal_chat_threads')
        .select(`
            id,
            title,
            thread_type,
            target_role,
            latest_message_at,
            is_active,
            created_at,
            internal_chat_participants!inner(user_id)
        `)
        .eq('is_active', true)
        .order('latest_message_at', { ascending: false });

    if (role !== 'admin' && role !== 'super_admin') {
        query = query.eq('internal_chat_participants.user_id', userId);
    }

    const { data, error } = await query;

    if (error || !data) {
        return [];
    }

    return (data as any[]).map((row) => ({
        id: row.id,
        title: row.title,
        thread_type: row.thread_type,
        target_role: row.target_role,
        latest_message_at: row.latest_message_at,
        is_active: row.is_active,
        created_at: row.created_at,
        participant_count: Array.isArray(row.internal_chat_participants) ? row.internal_chat_participants.length : undefined,
    }));
}

export async function listMessagesForThread(threadId: string): Promise<CommunicationMessage[]> {
    const supabase = getAdminClient();
    const { data, error } = await supabase
        .from('internal_chat_messages')
        .select(`
            id,
            thread_id,
            sender_id,
            content,
            attachment_name,
            attachment_path,
            attachment_mime,
            attachment_size,
            created_at
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

    if (error || !data) {
        return [];
    }

    const messages = data as any[];
    const senderIds = [...new Set(messages.map((message) => message.sender_id).filter(Boolean))];
    const senderMap = new Map<string, { full_name: string | null; role: string | null }>();

    if (senderIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', senderIds);

        (profiles || []).forEach((profile: any) => {
            senderMap.set(profile.id, {
                full_name: profile.full_name,
                role: profile.role,
            });
        });
    }

    return Promise.all(messages.map(async (message) => {
        let attachmentUrl: string | null = null;
        if (message.attachment_path) {
            const signed = await supabase.storage
                .from('internal-communications')
                .createSignedUrl(message.attachment_path, 60 * 60 * 6);
            attachmentUrl = signed.data?.signedUrl || null;
        }

        const sender = message.sender_id ? senderMap.get(message.sender_id) : null;
        return {
            id: message.id,
            thread_id: message.thread_id,
            sender_id: message.sender_id,
            content: message.content,
            attachment_name: message.attachment_name,
            attachment_path: message.attachment_path,
            attachment_url: attachmentUrl,
            attachment_mime: message.attachment_mime,
            attachment_size: message.attachment_size,
            created_at: message.created_at,
            sender_name: sender?.full_name || null,
            sender_role: sender?.role || null,
        };
    }));
}

export async function createThread(input: {
    title: string;
    threadType: 'direct' | 'role' | 'group' | 'announcement';
    createdBy: string;
    targetRole?: string | null;
    participantIds?: string[];
}) {
    const supabase = getAdminClient();
    const participantIds = [...new Set([input.createdBy, ...(input.participantIds || [])])];

    const { data: thread, error: threadError } = await supabase
        .from('internal_chat_threads')
        .insert({
            title: input.title,
            thread_type: input.threadType,
            created_by: input.createdBy,
            target_role: input.targetRole || null,
            latest_message_at: new Date().toISOString(),
        })
        .select('*')
        .single();

    if (threadError || !thread) {
        throw threadError || new Error('Failed to create thread.');
    }

    let resolvedParticipants = participantIds;
    if (input.threadType === 'role' || input.threadType === 'announcement') {
        const { data: roleUsers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', input.targetRole || '');

        resolvedParticipants = [...new Set([
            ...participantIds,
            ...((roleUsers || []).map((user: any) => user.id)),
        ])];
    }

    if (resolvedParticipants.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role')
            .in('id', resolvedParticipants);

        const rows = (profiles || []).map((profile: any) => ({
            thread_id: thread.id,
            user_id: profile.id,
            role_at_join: profile.role,
        }));

        if (rows.length > 0) {
            const { error: participantsError } = await supabase
                .from('internal_chat_participants')
                .insert(rows);
            if (participantsError) {
                throw participantsError;
            }
        }
    }

    return thread.id as string;
}

export async function sendMessage(input: {
    threadId: string;
    senderId: string;
    content: string;
    attachmentName?: string | null;
    attachmentPath?: string | null;
    attachmentMime?: string | null;
    attachmentSize?: number | null;
}) {
    const supabase = getAdminClient();
    const { error } = await supabase
        .from('internal_chat_messages')
        .insert({
            thread_id: input.threadId,
            sender_id: input.senderId,
            content: input.content,
            attachment_name: input.attachmentName || null,
            attachment_path: input.attachmentPath || null,
            attachment_mime: input.attachmentMime || null,
            attachment_size: input.attachmentSize || null,
        });

    if (error) {
        throw error;
    }

    await supabase
        .from('internal_chat_threads')
        .update({
            latest_message_at: new Date().toISOString(),
        })
        .eq('id', input.threadId);

    await supabase
        .from('notifications')
        .insert({
            user_id: null,
            title: 'New internal message',
            message: input.content.slice(0, 180) || 'A new file or announcement was shared.',
            type: 'system',
            notification_type: 'system',
            data: { threadId: input.threadId },
            is_read: false,
            action_url: '/dashboard/messages',
            sent_via: ['in_app'],
            is_active: true,
            target_surface: ['dashboard'],
            priority: 5,
        });
}

export async function markThreadRead(threadId: string, userId: string) {
    const supabase = getAdminClient();
    await supabase
        .from('internal_chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', userId);
}

export async function uploadCommunicationFile(input: {
    userId: string;
    fileName: string;
    fileType: string;
    buffer: Buffer;
}) {
    const supabase = getAdminClient();
    const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${input.userId}/${Date.now()}-${sanitizedName}`;

    const { error } = await supabase.storage
        .from('internal-communications')
        .upload(path, input.buffer, {
            contentType: input.fileType,
            upsert: false,
        });

    if (error) {
        throw error;
    }

    return path;
}

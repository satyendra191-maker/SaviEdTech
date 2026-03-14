/**
 * Queue System for Hyperscale
 * 
 * Handles:
 * - AI generation jobs
 * - Email sending
 * - Notifications
 * - Video processing
 * - Analytics pipelines
 */

export type JobData = Record<string, unknown>;
export type JobResult = Record<string, unknown>;

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry';

export interface QueueJob {
    id: string;
    type: string;
    data: JobData;
    status: JobStatus;
    attempts: number;
    maxAttempts: number;
    result?: JobResult;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export type JobProcessor = (data: JobData) => Promise<JobResult>;

class QueueSystem {
    private queues: Map<string, QueueJob[]> = new Map();
    private processors: Map<string, JobProcessor> = new Map();
    private processing = false;

    registerProcessor(type: string, processor: JobProcessor): void {
        this.processors.set(type, processor);
    }

    async enqueue(type: string, data: JobData, maxAttempts = 3): Promise<string> {
        const job: QueueJob = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type,
            data,
            status: 'pending',
            attempts: 0,
            maxAttempts,
            createdAt: new Date(),
        };

        if (!this.queues.has(type)) {
            this.queues.set(type, []);
        }

        this.queues.get(type)!.push(job);
        console.log(`[Queue] Enqueued job ${job.id} (${type})`);

        return job.id;
    }

    async processNext(type: string): Promise<JobResult | null> {
        const queue = this.queues.get(type);
        if (!queue || queue.length === 0) return null;

        const job = queue.find(j => j.status === 'pending');
        if (!job) return null;

        const processor = this.processors.get(type);
        if (!processor) {
            console.error(`[Queue] No processor for ${type}`);
            return null;
        }

        job.status = 'processing';
        job.startedAt = new Date();
        job.attempts++;

        try {
            const result = await processor(job.data);
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();
            console.log(`[Queue] Completed job ${job.id}`);
            return result;
        } catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Unknown error';
            job.completedAt = new Date();
            console.error(`[Queue] Failed job ${job.id}:`, job.error);

            if (job.attempts < job.maxAttempts) {
                job.status = 'pending';
                console.log(`[Queue] Will retry job ${job.id} (attempt ${job.attempts + 1})`);
            }

            return null;
        }
    }

    async processAll(type: string): Promise<void> {
        const queue = this.queues.get(type);
        if (!queue) return;

        const pending = queue.filter(j => j.status === 'pending');
        
        for (const job of pending) {
            await this.processNext(type);
        }
    }

    getJob(type: string, jobId: string): QueueJob | undefined {
        return this.queues.get(type)?.find(j => j.id === jobId);
    }

    getJobs(type: string, status?: JobStatus): QueueJob[] {
        const queue = this.queues.get(type) || [];
        if (status) {
            return queue.filter(j => j.status === status);
        }
        return queue;
    }

    getQueueStats(type: string): { pending: number; processing: number; completed: number; failed: number } {
        const queue = this.queues.get(type) || [];
        return {
            pending: queue.filter(j => j.status === 'pending').length,
            processing: queue.filter(j => j.status === 'processing').length,
            completed: queue.filter(j => j.status === 'completed').length,
            failed: queue.filter(j => j.status === 'failed').length,
        };
    }

    clearCompleted(type: string): number {
        const queue = this.queues.get(type);
        if (!queue) return 0;

        const before = queue.length;
        this.queues.set(type, queue.filter(j => j.status !== 'completed'));
        return before - this.queues.get(type)!.length;
    }
}

export const queueSystem = new QueueSystem();

queueSystem.registerProcessor('ai_content', async (data) => {
    console.log('[Queue] Processing AI content generation:', data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, content: 'Generated content' };
});

queueSystem.registerProcessor('send_email', async (data) => {
    console.log('[Queue] Processing email:', data);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, sent: true };
});

queueSystem.registerProcessor('notification', async (data) => {
    console.log('[Queue] Processing notification:', data);
    return { success: true, delivered: true };
});

queueSystem.registerProcessor('video_process', async (data) => {
    console.log('[Queue] Processing video:', data);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return { success: true, processed: true };
});

queueSystem.registerProcessor('analytics', async (data) => {
    console.log('[Queue] Processing analytics:', data);
    return { success: true, aggregated: true };
});

export const QUEUE_TYPES = {
    AI_CONTENT: 'ai_content',
    EMAIL: 'send_email',
    NOTIFICATION: 'notification',
    VIDEO_PROCESSING: 'video_process',
    ANALYTICS: 'analytics',
} as const;

export default queueSystem;

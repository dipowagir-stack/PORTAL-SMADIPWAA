import { PrintJob, PrintResult } from "../types";

export interface PrintQueueItem {
    id: string;
    job: PrintJob;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED';
    retryCount: number;
    error?: string;
}

export class PrintQueue {
    private queue: Map<string, PrintQueueItem[]> = new Map();

    public enqueue(job: PrintJob): void {
        if (!this.queue.has(job.printerId)) {
            this.queue.set(job.printerId, []);
        }
        
        const q = this.queue.get(job.printerId)!;
        
        // Duplicate check based on ID / idempotencyKey
        const duplicate = q.find(item => item.job.id === job.id || (item.job.idempotencyKey && item.job.idempotencyKey === job.idempotencyKey));
        if (duplicate && ['PENDING', 'PROCESSING', 'COMPLETED'].includes(duplicate.status)) {
            // Already processed or processing
            return;
        }

        q.push({
            id: job.id,
            job,
            status: 'PENDING',
            retryCount: 0
        });
    }

    public getPendingJob(printerId: string): PrintQueueItem | undefined {
        const q = this.queue.get(printerId);
        if (!q) return undefined;

        return q.find(item => item.status === 'PENDING' || item.status === 'RETRYING');
    }

    public updateJobStatus(printerId: string, jobId: string, status: PrintQueueItem['status'], error?: string): void {
        const q = this.queue.get(printerId);
        if (!q) return;

        const item = q.find(i => i.id === jobId);
        if (item) {
            item.status = status;
            if (error) {
                item.error = error;
            }
        }
    }
}

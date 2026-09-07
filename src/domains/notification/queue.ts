import {
  NotificationJob, NotificationPreference
} from './types';
import { notificationJobsService, notificationPrefsService } from './services';
import { RulePipeline } from '../../foundation/ruleEngine/RulePipeline';
import { IRule } from '../../foundation/ruleEngine/types';
import { RuleContext } from '../../foundation/ruleEngine/RuleContext';
import { RuleResult } from '../../foundation/ruleEngine/RuleResult';
import { where } from 'firebase/firestore';

class OptOutRule implements IRule {
  id = 'NOTIFICATION_OPT_OUT';
  name = 'Check if user opted out';
  evaluate(context: RuleContext): RuleResult {
    const job = context.params.job as NotificationJob;
    const prefs = context.params.prefs as NotificationPreference | undefined;
    
    if (prefs?.optOutCategories?.includes(job.category)) {
      return { passed: false, message: 'User opted out' };
    }
    return { passed: true };
  }
}

class PreferredChannelsRule implements IRule {
  id = 'NOTIFICATION_PREFERRED_CHANNELS';
  name = 'Filter preferred channels';
  evaluate(context: RuleContext): RuleResult {
    const job = context.params.job as NotificationJob;
    const prefs = context.params.prefs as NotificationPreference | undefined;
    
    let allowedChannels = job.channels;
    if (prefs && job.priority !== 'urgent' && prefs.preferredChannels?.length > 0) {
      allowedChannels = allowedChannels.filter(c => prefs.preferredChannels.includes(c));
    }
    
    if (allowedChannels.length === 0) {
       return { passed: false, message: 'No allowed channels' };
    }
    
    context.state.allowedChannels = allowedChannels;
    return { passed: true };
  }
}

/**
 * Queue Processor
 * This simulates a background worker that picks up 'pending' notifications
 * and dispatches them to their respective channels.
 */
export async function processNotificationQueue() {
  console.log("[Notification Queue] Starting worker...");
  
  const pendingJobsRes = await notificationJobsService.findWithConstraintsResult([where('status', '==', 'pending')]);
  if (pendingJobsRes.isFailure) {
     console.error("[Queue] Failed to get pending jobs", pendingJobsRes.getError());
     return;
  }
  const pendingJobs = pendingJobsRes.getValue();

  let processed = 0;
  
  const pipeline = new RulePipeline(true)
      .addRule(new OptOutRule())
      .addRule(new PreferredChannelsRule());

  for (const job of pendingJobs) {
    const jobId = job.id!;

    try {
      // 1. Mark as processing
      await notificationJobsService.updateResult(jobId, { status: 'processing', updatedAt: Date.now() });

      // 2. Load Preferences
      const prefsRes = await notificationPrefsService.getByFieldResult('userId', job.userId);
      const prefs = prefsRes.isSuccess && prefsRes.getValue().length > 0 ? prefsRes.getValue()[0] : undefined;

      const context: RuleContext = {
         params: { job, prefs },
         state: {}
      };
      
      const pipelineResult = await pipeline.execute(context);
      
      if (!pipelineResult.passed) {
          // Find the failed rule
          const failedRule = Object.values(pipelineResult.results).find(r => !r.passed);
          console.log(`[Queue] Job ${jobId} skipped: ${failedRule?.message}`);
          await notificationJobsService.updateResult(jobId, { status: 'failed', error: failedRule?.message || 'Rule failed', updatedAt: Date.now() });
          continue;
      }
      
      const allowedChannels = context.state.allowedChannels as string[];

      // 3. Dispatch to Channels
      let dispatchSuccess = false;
      for (const channel of allowedChannels) {
        dispatchSuccess = await dispatchToChannel(channel, job) || dispatchSuccess;
      }

      // 4. Update Status
      if (dispatchSuccess) {
        await notificationJobsService.updateResult(jobId, { status: 'sent', sentAt: Date.now(), updatedAt: Date.now() });
      } else {
        await notificationJobsService.updateResult(jobId, { status: 'failed', error: 'All channels failed or skipped', updatedAt: Date.now() });
      }
      processed++;
    } catch (err: any) {
      console.error(`[Queue] Failed to process job ${jobId}:`, err);
      await notificationJobsService.updateResult(jobId, { status: 'failed', error: err.message, updatedAt: Date.now() });
    }
  }

  console.log(`[Notification Queue] Worker finished. Processed ${processed} jobs.`);
}

/**
 * Simulates dispatching to external services (Twilio, FCM, SendGrid)
 */
async function dispatchToChannel(channel: string, job: NotificationJob): Promise<boolean> {
  console.log(`[Channel:${channel.toUpperCase()}] Sending to ${job.userId}: ${job.payload.title}`);
  
  // Simulated success rate
  const success = Math.random() > 0.1; // 90% success
  if (!success) {
    console.warn(`[Channel:${channel.toUpperCase()}] Failed to send.`);
  }

  return success;
}

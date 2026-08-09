import { sendEmail, type SendEmailInput } from '@/lib/email/send'

// No `server-only` import here (unlike lib/email/adapter.ts) — this module
// is loaded by db/jobs-worker.ts, a plain tsx script outside Next's server
// bundling context, where `server-only` can't be resolved.
export const jobHandlers: Record<string, (payload: unknown) => Promise<void>> =
    {
        send_invite_email: async (payload) => {
            await sendEmail(payload as SendEmailInput)
        },
        send_notification_email: async (payload) => {
            await sendEmail(payload as SendEmailInput)
        },
    }

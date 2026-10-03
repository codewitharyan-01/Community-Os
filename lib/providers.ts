// Provider abstractions — swap mock implementations for real ones (Razorpay,
// SMTP, SMS, LLM, S3) without touching product code. All defaults work offline.

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentIntent {
  providerTxn: string;
  provider: string;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(args: { invoiceNumber: string; amount: number; idempotencyKey: string }): Promise<PaymentIntent>;
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = "MockGateway";
  async createIntent(_args: { invoiceNumber: string; amount: number; idempotencyKey: string }) {
    // Deterministic-ish demo transaction id; a real provider would return its own.
    const rand = Math.floor(10000 + Math.random() * 89999);
    void _args;
    return { providerTxn: `TXN-DEMO-${rand}`, provider: this.name };
  }
}

export const paymentProvider: PaymentProvider =
  process.env.PAYMENT_PROVIDER_KEY ? ({} as PaymentProvider) : new MockPaymentProvider();

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  template?: string;
  communityId?: string | null;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

class MockEmailProvider implements EmailProvider {
  readonly name = "MockOutbox";
  async send(msg: EmailMessage) {
    // Emails land in the EmailOutbox table (visible in Settings → Developer Tools).
    const { db } = await import("@/lib/db");
    await db.emailOutbox.create({
      data: {
        communityId: msg.communityId ?? null,
        to: msg.to,
        subject: msg.subject,
        body: msg.body,
        template: msg.template ?? "generic",
      },
    });
  }
}

export const emailProvider: EmailProvider =
  process.env.SMTP_HOST && process.env.SMTP_USER
    ? ({} as EmailProvider) // plug SMTPProvider here in production
    : new MockEmailProvider();

export async function sendEmail(msg: EmailMessage) {
  try {
    await emailProvider.send(msg);
  } catch (e) {
    console.error("[email] send failed", e);
  }
}

// ─── Storage (local uploads now, S3-compatible later) ─────────────────────────

export interface StorageProvider {
  readonly name: string;
  save(file: File, dir: string): Promise<{ path: string; size: number }>;
}

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_UPLOAD_MB = 8;

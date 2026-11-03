import nodemailer from "nodemailer";

function hasSmtpCredentials(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

function shouldSkipEmailSend(): boolean {
  return process.env.SKIP_EMAIL_SEND === "true";
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

// Gmail App Passwords are shown in groups of 4 ("abcd efgh ijkl mnop"). Nodemailer
// requires the raw 16 characters, so strip whitespace before use.
const smtpPassword = process.env.SMTP_PASS?.replace(/\s+/g, "");
const smtpUser = process.env.SMTP_USER?.trim();
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
  tls: {
    rejectUnauthorized: true,
  },
  // Without these, a dead SMTP host hangs the request until the platform
  // timeout instead of failing fast.
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  pool: true,
  maxConnections: 3,
});

/** Domain of an address that may be wrapped as `Name <addr>`. */
function addressDomain(value: string): string {
  const addr = value.match(/<(.+)>/)?.[1]?.trim() || value.trim();
  return addr.split("@")[1]?.toLowerCase() || "";
}

/**
 * Resolve the From header and warn when it cannot be authenticated.
 *
 * Gmail rejects a From address that is neither the authenticated account nor a
 * verified alias, failing with "550 Sender address not authenticated" even when
 * the credentials are valid. Catching this up front turns a confusing delivery
 * failure into an actionable message.
 */
function resolveFrom(): string {
  const configured = process.env.SMTP_FROM?.trim();
  const fallback = `"PROMOSPORT" <${smtpUser}>`;

  if (!configured) return fallback;

  const fromDomain = addressDomain(configured);
  const userDomain = addressDomain(smtpUser || "");
  const sameProvider = fromDomain && userDomain && (
    fromDomain === userDomain ||
    fromDomain === "gmail.com" ||
    fromDomain.endsWith(".gmail.com")
  );

  if (!sameProvider) {
    console.warn(
      `[email] SMTP_FROM domain "${fromDomain}" does not match SMTP_USER domain "${userDomain}". ` +
      `Gmail will reject this sender with "550 Sender address not authenticated" even with valid ` +
      `credentials. Either send from the authenticated address, or add "${fromDomain}" as a verified ` +
      `"send mail as" alias on the Google account.`
    );
  }

  return configured;
}

/**
 * One-time startup diagnostic. Surfaces misconfiguration before a candidate
 * ever hits it, instead of only appearing in server logs after a failure.
 */
function reportSmtpConfigOnce(): void {
  const problems: string[] = [];

  if (!hasSmtpCredentials()) {
    problems.push("SMTP_USER and/or SMTP_PASS are not set");
  } else {
    if (smtpPassword && smtpPassword.length !== 16 && smtpHost.includes("gmail")) {
      problems.push(
        `SMTP_PASS is ${smtpPassword.length} characters; a Gmail App Password must be exactly 16`
      );
    }
    const from = process.env.SMTP_FROM?.trim();
    if (from && addressDomain(from) !== addressDomain(smtpUser || "")) {
      problems.push(
        `SMTP_FROM (${addressDomain(from)}) differs from SMTP_USER domain (${addressDomain(smtpUser || "")})`
      );
    }
  }

  if (shouldSkipEmailSend()) {
    console.warn(
      "[email] SKIP_EMAIL_SEND=true - no mail will be sent. Verification codes are only logged to the console."
    );
    return;
  }

  if (problems.length > 0) {
    console.warn(
      "[email] SMTP configuration problems detected:\n" +
      problems.map((p) => `  - ${p}`).join("\n") +
      `\n  Run "npm run smtp:check" for a live connection test.`
    );
  }
}

let configReported = false;
function ensureConfigReported(): void {
  if (configReported) return;
  configReported = true;
  reportSmtpConfigOnce();
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** True when a dev-only fallback (log the code and carry on) is acceptable. */
function allowsDevFallback(): boolean {
  // Explicit opt-out for local work; production always throws.
  if (process.env.SMTP_STRICT === "true") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * Human-readable explanation for common SMTP auth failures, so the log says
 * what to actually do rather than echoing a raw Gmail response.
 */
function explainSmtpError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const response = String((error as { response?: string })?.response || "");

  if (code === "EAUTH" || response.includes("535")) {
    return (
      "SMTP authentication rejected (535 BadCredentials). The App Password is invalid or revoked. " +
      "Regenerate it: Google Account > Security > 2-Step Verification > App passwords. " +
      "The account must have 2-Step Verification enabled first."
    );
  }
  if (code === "EENVELOPE" || response.includes("550")) {
    return (
      "Gmail rejected the sender address. SMTP_FROM must be the authenticated account " +
      "or a verified alias."
    );
  }
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EDNS") {
    return `Cannot reach ${smtpHost}:${smtpPort}. Check network/firewall.`;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Send an email, applying the shared failure policy.
 *
 * Previously each send site swallowed SMTP errors in development, which made a
 * broken configuration look like it worked locally while failing every request
 * in production. The dev fallback is now opt-in and always logged loudly.
 */
async function sendOrThrow(options: {
  to: string;
  kind: string;
  mail: Record<string, unknown>;
  devFallbackCode?: string;
}): Promise<{ messageId?: string }> {
  ensureConfigReported();

  try {
    const info = await transporter.sendMail({
      from: resolveFrom(),
      ...options.mail,
      to: options.to,
    } as never);
    console.log(`[email] ${options.kind} sent to ${options.to} (id: ${info.messageId})`);
    return info;
  } catch (error) {
    const explanation = explainSmtpError(error);
    console.error(`[email] ${options.kind} FAILED for ${options.to}: ${explanation}`);

    if (allowsDevFallback()) {
      console.warn(
        `[email] Dev fallback active (NODE_ENV=${process.env.NODE_ENV}). ` +
        `This will NOT happen in production - the request will fail instead. ` +
        (options.devFallbackCode ? `Code for ${options.to}: ${options.devFallbackCode}` : "")
      );
      return {};
    }

    throw new Error(`${options.kind} failed: ${explanation}`);
  }
}

function buildVerificationEmail(code: string, locale: "ar" | "fr") {
  const isArabic = locale === "ar";
  const subject = isArabic ? "رمز التحقق - PROMOSPORT" : "Votre code de vérification - PROMOSPORT";
  const heading = isArabic ? "تأكيد البريد الإلكتروني" : "Vérification de votre adresse e-mail";
  const message = isArabic
    ? "شكراً لتسجيلك في منصة PROMOSPORT. استخدم رمز التحقق التالي لتأكيد بريدك الإلكتروني:"
    : "Merci pour votre inscription sur PROMOSPORT. Utilisez le code ci-dessous pour confirmer votre adresse e-mail:";
  const expiryText = isArabic
    ? "هذا الرمز صالح لمدة 15 دقيقة."
    : "Ce code est valable 15 minutes.";
  const footer = isArabic
    ? "إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة."
    : "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.";

  const html = `
    <div dir="${isArabic ? "rtl" : "ltr"}" style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">${heading}</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
          <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20px; text-align: center; margin: 20px 0; border-radius: 6px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e3a8a; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 16px 0 0 0;">${expiryText}</p>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 8px 0 0 0;">${footer}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">PROMOSPORT — Plateforme de recrutement</p>
        </div>
      </div>
    </div>
  `;

  const text = isArabic
    ? `تأكيد البريد الإلكتروني - PROMOSPORT\n\n` +
      `شكراً لتسجيلك في منصة PROMOSPORT.\n` +
      `رمز التحقق الخاص بك هو: ${code}\n\n` +
      `هذا الرمز صالح لمدة 15 دقيقة.\n` +
      `إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.\n\n` +
      `PROMOSPORT — Plateforme de recrutement`
    : `Vérification de votre adresse e-mail - PROMOSPORT\n\n` +
      `Merci pour votre inscription sur PROMOSPORT.\n` +
      `Votre code de vérification: ${code}\n\n` +
      `Ce code est valable 15 minutes.\n` +
      `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\n` +
      `PROMOSPORT — Plateforme de recrutement`;

  return { subject, html, text };
}

function buildPasswordResetEmail(code: string, locale: "ar" | "fr") {
  const isArabic = locale === "ar";
  const subject = isArabic ? "إعادة تعيين كلمة المرور - PROMOSPORT" : "Réinitialisation de votre mot de passe - PROMOSPORT";
  const heading = isArabic ? "إعادة تعيين كلمة المرور" : "Réinitialisation de votre mot de passe";
  const message = isArabic
    ? "تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. استخدم الرمز التالي:"
    : "Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le code ci-dessous:";
  const expiryText = "Ce code est valable 15 minutes. / هذا الرمز صالح لمدة 15 دقيقة.";
  const footer = isArabic
    ? "إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة."
    : "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.";

  const html = `
    <div dir="${isArabic ? "rtl" : "ltr"}" style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">${heading}</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
          <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20px; text-align: center; margin: 20px 0; border-radius: 6px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e3a8a; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 16px 0 0 0;">${expiryText}</p>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 8px 0 0 0;">${footer}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">PROMOSPORT — Plateforme de recrutement</p>
        </div>
      </div>
    </div>
  `;

  const text = isArabic
    ? `إعادة تعيين كلمة المرور - PROMOSPORT\n\n` +
      `رمز إعادة التعيين: ${code}\n\n` +
      `هذا الرمز صالح لمدة 15 دقيقة.\n\n` +
      `PROMOSPORT — Plateforme de recrutement`
    : `Réinitialisation de votre mot de passe - PROMOSPORT\n\n` +
      `Votre code de réinitialisation: ${code}\n\n` +
      `Ce code est valable 15 minutes.\n\n` +
      `PROMOSPORT — Plateforme de recrutement`;

  return { subject, html, text };
}

export async function sendVerificationEmail(email: string, name: string, locale: "ar" | "fr" = "ar") {
  const code = generateVerificationCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  if (shouldSkipEmailSend()) {
    console.warn(`[email] SKIP_EMAIL_SEND: verification code for ${email}: ${code}`);
    return { code, expiry };
  }

  if (!hasSmtpCredentials()) {
    if (allowsDevFallback()) {
      console.warn(`[email] Missing SMTP_USER/SMTP_PASS. Verification code for ${email}: ${code}`);
      return { code, expiry };
    }
    throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS");
  }

  const { subject, html, text } = buildVerificationEmail(code, locale);

  await sendOrThrow({
    to: email,
    kind: "Verification email",
    devFallbackCode: code,
    mail: {
      subject,
      text,
      html,
      headers: { "X-Priority": "1", "X-Mailer": "PROMOSPORT-Mailer" },
    },
  });

  return { code, expiry };
}

export async function sendConvocationEmail(
  email: string,
  name: string,
  locale: "ar" | "fr",
  pdfBuffer: Buffer,
  jobTitle: string
) {
  const isArabic = locale === "ar";
  const subject = isArabic
    ? `استدعاء اختبار شفوي - ${jobTitle}`
    : `Convocation test oral - ${jobTitle}`;
  const heading = isArabic ? "استدعاء للاختبار الشفوي" : "Convocation à l'examen oral";
  const message = isArabic
    ? `السيد(ة) ${name}،<br><br>نهنئكم على نجاحكم في المرحلة الأولى من الانتقاء. يسرنا دعوتكم لإجراء الاختبار الشفوي. تجدون في المرفق استدعاءكم الرسمي.<br><br>يمكنكم أيضاً تحميل الاستدعاء من منصة PROMOSPORT عبر حسابكم الشخصي.`
    : `Madame, Monsieur ${name},<br><br>Nous avons le plaisir de vous informer que vous êtes convoqué(e) à l'examen oral. Veuillez trouver ci-joint votre convocation officielle.<br><br>Vous pouvez également télécharger la convocation depuis votre espace personnel sur PROMOSPORT.`;

  const html = `
    <div dir="${isArabic ? "rtl" : "ltr"}" style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">${heading}</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">PROMOSPORT — Plateforme de recrutement</p>
        </div>
      </div>
    </div>
  `;

  const text = isArabic
    ? `استدعاء اختبار شفوي - ${jobTitle}\n\n` +
      `السيد(ة) ${name}،\n\n` +
      `نهنئكم على نجاحكم في المرحلة الأولى من الانتقاء.\n` +
      `يسرنا دعوتكم لإجراء الاختبار الشفوي.\n\n` +
      `يمكنكم تحميل الاستدعاء من حسابكم الشخصي على PROMOSPORT.\n\n` +
      `PROMOSPORT — Plateforme de recrutement`
    : `Convocation test oral - ${jobTitle}\n\n` +
      `Madame, Monsieur ${name},\n\n` +
      `Nous avons le plaisir de vous informer que vous êtes convoqué(e) à l'examen oral.\n\n` +
      `Vous pouvez télécharger la convocation depuis votre espace personnel sur PROMOSPORT.\n\n` +
      `PROMOSPORT — Plateforme de recrutement`;

  if (shouldSkipEmailSend()) {
    console.warn(`[email] SKIP_EMAIL_SEND: convocation email for ${email}`);
    return;
  }

  if (!hasSmtpCredentials()) {
    if (allowsDevFallback()) {
      console.warn(`[email] Missing SMTP_USER/SMTP_PASS. Convocation email skipped for ${email}`);
      return;
    }
    throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS");
  }

  await sendOrThrow({
    to: email,
    kind: "Convocation email",
    mail: {
      subject,
      text,
      html,
      attachments: [
        {
          filename: `invitation-${jobTitle.replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      headers: { "X-Priority": "1", "X-Mailer": "PROMOSPORT-Mailer" },
    },
  });
}

export async function sendPasswordResetEmail(email: string, name: string, code: string, locale: "ar" | "fr" = "ar") {
  if (shouldSkipEmailSend()) {
    console.warn(`[email] SKIP_EMAIL_SEND: reset code for ${email}: ${code}`);
    return;
  }

  if (!hasSmtpCredentials()) {
    if (allowsDevFallback()) {
      console.warn(`[email] Missing SMTP_USER/SMTP_PASS. Reset code for ${email}: ${code}`);
      return;
    }
    throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS");
  }

  const { subject, html, text } = buildPasswordResetEmail(code, locale);

  await sendOrThrow({
    to: email,
    kind: "Password reset email",
    devFallbackCode: code,
    mail: {
      subject,
      text,
      html,
      headers: { "X-Priority": "1", "X-Mailer": "PROMOSPORT-Mailer" },
    },
  });
}
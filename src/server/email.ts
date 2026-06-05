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
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    if (isDevelopment()) {
      console.warn(
        `[email] Missing SMTP_USER/SMTP_PASS. Verification code for ${email}: ${code}`
      );
      return { code, expiry };
    }
    throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS");
  }

  const { subject, html, text } = buildVerificationEmail(code, locale);
  const from = process.env.SMTP_FROM || `"PROMOSPORT" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
      headers: {
        "X-Priority": "1",
        "X-Mailer": "PROMOSPORT-Mailer",
      },
    });
    console.log(`[email] Verification email sent to ${email} (id: ${info.messageId})`);
    return { code, expiry };
  } catch (error) {
    console.error(`[email] Verification email failed for ${email}:`, error);
    if (isDevelopment()) {
      console.warn(
        `[email] Dev fallback: SMTP failed but registration continues. Verification code for ${email}: ${code}`
      );
      return { code, expiry };
    }
    throw new Error("Failed to send verification email. Check SMTP credentials.");
  }
}

export async function sendPasswordResetEmail(email: string, name: string, code: string, locale: "ar" | "fr" = "ar") {
  if (shouldSkipEmailSend()) {
    console.warn(`[email] SKIP_EMAIL_SEND: reset code for ${email}: ${code}`);
    return;
  }

  if (!hasSmtpCredentials()) {
    if (isDevelopment()) {
      console.warn(`[email] Missing SMTP_USER/SMTP_PASS. Reset code for ${email}: ${code}`);
      return;
    }
    throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS");
  }

  const { subject, html, text } = buildPasswordResetEmail(code, locale);
  const from = process.env.SMTP_FROM || `"PROMOSPORT" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
      headers: {
        "X-Priority": "1",
        "X-Mailer": "PROMOSPORT-Mailer",
      },
    });
    console.log(`[email] Password reset email sent to ${email} (id: ${info.messageId})`);
  } catch (error) {
    console.error(`[email] Password reset email failed for ${email}:`, error);
    if (isDevelopment()) {
      console.warn(`[email] Dev fallback: reset code for ${email}: ${code}`);
      return;
    }
    throw new Error("Failed to send reset email. Check SMTP credentials.");
  }
}
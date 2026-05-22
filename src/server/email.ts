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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(email: string, name: string, locale: "ar" | "fr" = "ar") {
  const code = generateVerificationCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  const isArabic = locale === "ar";
  const subject = isArabic ? "رمز التحقق من البريد الإلكتروني" : "Code de vérification d'e-mail";
  const heading = isArabic ? "مرحباً بك في PROMOSPORT" : "Bienvenue sur PROMOSPORT";
  const message = isArabic
    ? `كود التحقق الخاص بك هو:`
    : "Votre code de vérification est:";
  const expiryText = isArabic
    ? "هذا الرمز صالح لمدة 15 دقيقة"
    : "Ce code est valide pendant 15 minutes";

  const html = `
    <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; color: #333;">${message}</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">${expiryText}</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        PROMOSPORT © 2025
      </div>
    </div>
  `;

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

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"PROMOSPORT" <noreply@promosport.tn>',
      to: email,
      subject,
      html,
    });
    return { code, expiry };
  } catch (error) {
    console.error("Email sending failed:", error);
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
  const isArabic = locale === "ar";
  const subject = isArabic ? "إعادة تعيين كلمة المرور" : "Réinitialisation du mot de passe";
  const heading = isArabic ? "إعادة تعيين كلمة المرور" : "Réinitialisation du mot de passe";
  const message = isArabic
    ? `كود إعادة تعيين كلمة المرور الخاص بك هو:`
    : "Votre code de réinitialisation du mot de passe est:";

  const html = `
    <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; color: #333;">${message}</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">Ce code est valide pendant 15 minutes / هذا الرمز صالح لمدة 15 دقيقة</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        PROMOSPORT © 2025
      </div>
    </div>
  `;

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

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"PROMOSPORT" <noreply@promosport.tn>',
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Password reset email failed:", error);
    if (isDevelopment()) {
      console.warn(`[email] Dev fallback: reset code for ${email}: ${code}`);
      return;
    }
    throw new Error("Failed to send reset email. Check SMTP credentials.");
  }
}
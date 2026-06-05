import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function testSMTP() {
  console.log("🔍 Testing SMTP connection...\n");
  console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`SMTP_PASS: ${process.env.SMTP_PASS?.substring(0, 10)}...`);
  console.log("");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: false,
    logger: false,
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful!");
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log("");

    // Send test email
    const testEmail = process.env.TEST_EMAIL || process.env.SMTP_USER;
    
    if (!testEmail) {
      console.log("⚠️  No TEST_EMAIL or SMTP_USER set. Skipping test email send.");
      console.log("   Set TEST_EMAIL=your-email@example.com in .env to send a test email.");
      return;
    }

    console.log(`📧 Sending test email to: ${testEmail}`);
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"PROMOSPORT" <noreply@promosport.tn>',
      to: testEmail,
      subject: "SMTP Test - PROMOSPORT",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #667eea;">SMTP Test Successful!</h1>
          <p>This is a test email from your PROMOSPORT application.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p style="color: #28a745;">✅ If you're seeing this, your SMTP configuration is working correctly!</p>
        </div>
      `,
    });

    console.log(`✅ Test email sent successfully!`);
    console.log(`   Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("❌ SMTP test failed!");
    const err = error as Error;
    console.error(`   Error: ${err.message}`);
    console.log("\n💡 Troubleshooting tips:");
    console.log("   1. Check your Brevo credentials in .env");
    console.log("   2. Verify your sender email/domain in Brevo dashboard");
    console.log("   3. Ensure SMTP_PORT is 587 (TLS) or 465 (SSL)");
    console.log("   4. Check firewall/antivirus isn't blocking outbound SMTP");
    process.exit(1);
  }
}

testSMTP();

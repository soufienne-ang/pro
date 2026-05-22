import nodemailer from "nodemailer";
import { readFileSync } from "fs";

// Simple .env parser
const env = Object.fromEntries(
  readFileSync(".env", "utf-8")
    .split("\n")
    .filter(line => line.includes("=") && !line.startsWith("#"))
    .map(line => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").replace(/^["']|["']$/g, "").trim()];
    })
);

console.log("🔍 Testing SMTP connection...\n");
console.log(`SMTP_HOST: ${env.SMTP_HOST}`);
console.log(`SMTP_PORT: ${env.SMTP_PORT}`);
console.log(`SMTP_USER: ${env.SMTP_USER}`);
console.log(`SMTP_PASS: ${env.SMTP_PASS?.substring(0, 15)}...`);
console.log("");

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10),
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

async function test() {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful!");
    
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: env.TEST_EMAIL || env.SMTP_USER,
      subject: "SMTP Test - PROMOSPORT",
      html: "<h1>Test successful!</h1>",
    });
    
    console.log(`✅ Email sent! Message ID: ${info.messageId}`);
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Failed: ${err.message}`);
  }
}

test();

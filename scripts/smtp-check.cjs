/**
 * Live SMTP diagnostic:  npm run smtp:check
 *
 * Verifies configuration, then performs a real connection + authentication
 * against the configured server. Exits non-zero on failure so it can be used
 * in CI or a deployment check.
 *
 * Never prints the password itself.
 */
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

function loadEnvFile(file) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return {};
  const out = {};
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const fileEnv = { ...loadEnvFile(".env.local"), ...loadEnvFile(".env") };
const env = { ...process.env, ...fileEnv };

const host = env.SMTP_HOST || "smtp.gmail.com";
const port = Number(env.SMTP_PORT || 587);
const secure = env.SMTP_SECURE === "true" || port === 465;
const user = (env.SMTP_USER || "").trim();
const passRaw = env.SMTP_PASS || "";
const pass = passRaw.replace(/\s+/g, "");
const from = (env.SMTP_FROM || "").trim();

const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const warn = (s) => `\x1b[33m${s}\x1b[0m`;

function addressDomain(v) {
  const addr = (v.match(/<(.+)>/)?.[1] || v).trim();
  return (addr.split("@")[1] || "").toLowerCase();
}

const problems = [];

console.log("\n=== PROMOSPORT SMTP check ===\n");

if (env.SKIP_EMAIL_SEND === "true") {
  console.warn("SKIP_EMAIL_SEND=true  -> no email will ever be sent.");
  console.log("\nResult: SKIPPED (intentional)\n");
  process.exit(0);
}

console.log(`  host        ${host}`);
console.log(`  port        ${port}${secure ? " (TLS)" : " (STARTTLS)"}`);
console.log(`  user        ${user || bad("(not set)")}`);
console.log(`  password    ${pass ? `${pass.length} chars` : bad("(not set)")}`);
console.log(`  from        ${from || "(defaults to user)"}`);

if (!user) problems.push("SMTP_USER is not set");
if (!pass) problems.push("SMTP_PASS is not set");

if (pass && pass.length !== 16 && host.includes("gmail")) {
  problems.push(
    `Password is ${pass.length} characters; a Gmail App Password is exactly 16 ` +
    `(whitespace stripped from the "abcd efgh ijkl mnop" groups)`
  );
}

if (passRaw !== pass && pass) {
  console.log(`  note        whitespace stripped from SMTP_PASS before use`);
}

const userDomain = addressDomain(user);
const fromDomain = addressDomain(from);
if (from && userDomain && fromDomain !== userDomain && fromDomain !== "gmail.com") {
  problems.push(
    `SMTP_FROM domain "${fromDomain}" differs from SMTP_USER domain "${userDomain}". ` +
    `Gmail rejects unverified senders with 550 Sender address not authenticated.`
  );
}

console.log("");
if (problems.length) {
  console.log("Configuration problems:");
  problems.forEach((p) => console.log(`  ${bad("x")} ${p}`));
  console.log("");
} else {
  console.log(`Configuration ${ok("looks valid")}`);
}

console.log(`Connecting to ${host}:${port} ...\n`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  tls: { rejectUnauthorized: true },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

(async () => {
  try {
    await transporter.verify();
    console.log(ok("AUTHENTICATION SUCCESS") + "\n");
    console.log(`SMTP is working for ${user}.`);
    console.log("Restart the dev server (or restart PM2) so it picks up the new .env values.\n");
    process.exit(0);
  } catch (e) {
    const code = e.code || "";
    const response = String(e.response || "");
    console.log(`${bad("AUTHENTICATION FAILED")}  (${code})`);
    if (response.trim()) console.log(`  server said: ${response.split("\n")[0]}`);

    console.log("");
    if (code === "EAUTH" || response.includes("535")) {
      console.log(wrap("Most likely cause: the App Password is invalid or revoked."));
      console.log("");
      console.log("  1. Enable 2-Step Verification on the Google account");
      console.log("     https://myaccount.google.com/security");
      console.log("  2. Then create a NEW App Password:");
      console.log("     https://myaccount.google.com/apppasswords");
      console.log("  3. Copy the 16-character password (ignore the spaces)");
      console.log("  4. Put it in .env as SMTP_PASS (keep the spaces, they are stripped)");
      console.log("  5. Re-run: npm run smtp:check");
    } else if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EDNS") {
      console.log(wrap("Cannot reach the SMTP host. Check firewall / network."));
    }
    process.exit(1);
  }
})();

function wrap(s) {
  return s;
}
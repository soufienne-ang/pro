import fs from "fs";
import puppeteer, { type Browser } from "puppeteer";
import type { LaunchOptions } from "puppeteer";

// Candidate Chrome/Edge/Chromium binaries, in priority order. Lets local dev
// and CI work without a separate `npx puppeteer browsers install chrome`
// download when the OS already ships a browser.
const SYSTEM_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
];

// Chromium's own sandbox/headless flags. Safe on Linux and macOS too.
const BASE_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

function firstExistingSystemBrowser(): string | undefined {
  for (const candidate of SYSTEM_BROWSER_PATHS) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // Ignore and keep looking.
    }
  }
  return undefined;
}

/**
 * Resolve a usable Chrome executable, or undefined to let Puppeteer use its
 * own downloaded copy.
 *
 * Order: PUPPETEER_EXECUTABLE_PATH -> Puppeteer's installed browser ->
 * a system browser. @sparticuz/chromium is handled separately by the callers
 * because it needs its own launch args, not just an executable path.
 */
async function resolveExecutablePath(): Promise<string | undefined> {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  // Puppeteer's own managed browser, if `puppeteer browsers install` was run.
  try {
    const installed = await puppeteer.executablePath();
    if (installed && fs.existsSync(installed)) return installed;
  } catch {
    // Not installed - fall through to the system browser.
  }

  return firstExistingSystemBrowser();
}

/**
 * Launch a browser for PDF/HTML rendering.
 *
 * Prefers @sparticuz/chromium (the only viable option on Vercel/Lambda) and
 * otherwise falls back to a locally resolvable Chrome. Passing an explicit
 * executablePath avoids Puppeteer's "Could not find Chrome" failure when only
 * a system browser is present.
 */
export async function launchBrowser(): Promise<Browser> {
  const options: LaunchOptions = {
    headless: true,
    args: BASE_ARGS,
  };

  // Serverless: @sparticuz/chromium ships its own binary and required args.
  try {
    const chromium = await import("@sparticuz/chromium");
    const c = chromium.default;
    if (c) {
      const executablePath = await c.executablePath();
      if (executablePath && fs.existsSync(executablePath)) {
        return await puppeteer.launch({
          ...options,
          args: [...c.args, ...BASE_ARGS],
          executablePath,
        });
      }
    }
  } catch {
    // Package absent (local dev) - use the local resolution below.
  }

  const executablePath = await resolveExecutablePath();
  if (executablePath) {
    return await puppeteer.launch({ ...options, executablePath });
  }

  // Nothing resolvable: let Puppeteer surface its own actionable error.
  return await puppeteer.launch(options);
}
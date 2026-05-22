# Tasks & Milestones — PROMOSPORT Rebuild 2025

---

## Milestone 0: Project Foundation

**Goal:** Initialize the project, tooling, and infrastructure scaffolding.

- [ ] Initialize Next.js 14 project with TypeScript, App Router, Tailwind CSS
- [ ] Configure shadcn/ui with custom theme (RTL-compatible)
- [ ] Set up `next-intl` with Arabic (default, RTL) and French (LTR) locales
- [ ] Configure ESLint, Prettier, and lint-staged
- [ ] Set up Prisma ORM with MySQL schema (initial migration)
- [ ] Create `.env` configuration template
- [ ] Set up folder structure: `src/app`, `src/components`, `src/lib`, `src/server`, `src/i18n`
- [ ] Configure Docker Compose for local dev (Next.js + MySQL)
- [ ] Set up PM2 ecosystem file for production

---

## Milestone 1: Authentication & Authorization

**Goal:** Secure login/registration for candidates and admins.

- [ ] Install and configure NextAuth.js (JWT strategy)
- [ ] Implement candidate registration endpoint with password validation
- [ ] Implement email verification flow (6-digit code via Nodemailer)
- [ ] Implement login endpoint for candidates
- [ ] Implement admin login with role-based access (Super Admin / Reviewer)
- [ ] Create Auth UI pages (login, register, verify email, forgot password)
- [ ] Add session management and audit log for admin accounts
- [ ] Build middleware to protect routes (candidate vs. admin)

---

## Milestone 2: Candidate Portal — Multi-Step Application Flow

**Goal:** Build the full 8-step application wizard.

- [ ] **Step 1 — Account Creation:** registration form, terms & conditions, email verification
- [ ] **Step 2 — Personal Info:** form with all personal fields, Tunisian phone validation, governorate/delegation dropdowns
- [ ] **Step 3 — Academic Info:** multi-diploma form with study level, grade, institution
- [ ] **Step 4 — Professional Experience:** toggle + dynamic experience entry list
- [ ] **Step 5 — Job Selection:** browse/display available positions, link to job description, single-select
- [ ] **Step 6 — Document Upload:** file upload UI, format/size validation, progress indicator
- [ ] **Step 7 — Review & Validate:** full summary page, edit capability, certification checkbox, legal notice
- [ ] **Step 8 — Confirmation:** success screen, confirmation email trigger, link to dashboard
- [ ] Build persistent step indicator / breadcrumb component
- [ ] Implement auto-save draft state (per-step)
- [ ] Implement step validation before allowing navigation

---

## Milestone 3: Candidate Dashboard ("My Space")

**Goal:** Let candidates track their application status and receive communications.

- [ ] Dashboard page showing submitted application(s) with status badges
- [ ] Download application summary as PDF
- [ ] Display notification history (in-app)
- [ ] Profile settings page (edit personal info, change password)
- [ ] SMS opt-in / opt-out toggle at registration and in settings

---

## Milestone 4: Admin Back-Office — Job & Application Management

**Goal:** Give admins full CRUD for job postings and application review.

- [ ] Admin layout shell with sidebar navigation
- [ ] Job posting creation form (title, code, description, location, type, openings, deadline, docs, PDF)
- [ ] Job posting list with status toggles (Draft / Published / Closed)
- [ ] Application list page with filters (position, status, governorate, diploma level, date range)
- [ ] Search by candidate name or CIN
- [ ] Bulk status update (Approve / Reject / Move to review)
- [ ] Full candidate profile modal/page with document preview/download
- [ ] Document download helper (individual or bulk zip)

---

## Milestone 5: Admin Back-Office — Scoring & Results

**Goal:** Enable scoring, ranking, and result export.

- [ ] Configure scoring criteria per position (weight system)
- [ ] Manual score input per candidate
- [ ] Import scores via spreadsheet (.xlsx)
- [ ] Automatic ranking view per position
- [ ] Flag candidates for oral test / dossier review
- [ ] Export filtered candidate list to Excel (.xlsx)
- [ ] Export full results report (PDF)
- [ ] Generate and view ranked list per position

---

## Milestone 6: Notifications System

**Goal:** Send email and SMS notifications for key events.

- [ ] Set up Nodemailer SMTP integration
- [ ] Set up Twilio (or local Tunisian SMS provider) integration
- [ ] Create bilingual notification template engine (ar / fr)
- [ ] Trigger email on: registration, verification, status change, confirmation
- [ ] Trigger SMS on: status change (opt-in only)
- [ ] Admin notification interface: send to all, by status, or individual
- [ ] Editable notification templates per competition cycle
- [ ] Notification history log (who was notified, when, what)

---

## Milestone 7: Admin Back-Office — Dashboard & Analytics

**Goal:** Give admins an overview of platform activity.

- [ ] Overview cards: total applications, by position, by status
- [ ] Completion rate per application step (funnel visualization)
- [ ] Activity timeline per competition cycle
- [ ] Export analytics data (CSV / Excel)

---

## Milestone 8: Localization & RTL

**Goal:** Full bilingual experience with correct layout direction.

- [ ] Translate all static labels, messages, and errors into `ar.json` and `fr.json`
- [ ] Implement `<html dir>` switching based on locale
- [ ] Apply Tailwind `rtl:` variant utilities across all components
- [ ] RTL-aware layout: sidebar, breadcrumbs, forms, tables
- [ ] Language switcher component (persistent in header)
- [ ] Bilingual email and SMS templates
- [ ] Date format (dd/mm/yyyy) and number format consistency

---

## Milestone 9: File Upload & Storage

**Goal:** Reliable file upload with validation and organized storage.

- [ ] Implement multipart file upload API route (formidable or multer)
- [ ] File type validation (MIME check — not just extension)
- [ ] File size validation (max 5MB)
- [ ] Store files partitioned by competition cycle (`/uploads/{cycleId}/{candidateId}/`)
- [ ] Secure file access (authenticated download only)
- [ ] File cleanup / retention policy

---

## Milestone 10: Security & Compliance

**Goal:** Meet GDPR-aligned data handling and OWASP security standards.

- [ ] HTTPS enforcement middleware
- [ ] Input sanitization and server-side validation on all forms
- [ ] File upload MIME validation (server-side, not just client)
- [ ] JWT access + refresh token rotation
- [ ] Rate limiting on auth endpoints (login, register, verify)
- [ ] Audit logging for all admin actions
- [ ] GDPR data retention policy implementation
- [ ] Data export / delete for candidates (right to erasure)

---

## Milestone 11: Performance & Scalability

**Goal:** Meet NFR targets (load time, concurrency, resilience).

- [ ] Database connection pooling via Prisma
- [ ] Image and file caching strategy (CDN-ready path)
- [ ] Load test with 500+ concurrent users during peak
- [ ] Optimize bundle size (code splitting, tree shaking)
- [ ] SSR + caching for public pages (static generation where possible)
- [ ] Graceful degradation plan for when CIN or SMS service is unavailable

---

## Milestone 12: Responsive Design & Accessibility

**Goal:** WCAG 2.1 AA compliance, mobile-first responsive design.

- [ ] Mobile-first responsive layout (375px to 1440px)
- [ ] shadcn/ui accessibility audit (keyboard navigation, focus management)
- [ ] Screen reader testing (labels, aria attributes, announcements)
- [ ] Color contrast compliance
- [ ] Touch-friendly form elements (sized for mobile)
- [ ] Responsive step indicator and sidebar

---

## Milestone 13: Testing

**Goal:** Ensure reliability through automated testing.

- [ ] Unit tests for utilities, validation functions, and helpers
- [ ] Integration tests for API routes (auth, applications, scoring)
- [ ] Prisma schema validation tests
- [ ] E2E tests for critical candidate flow (register → apply → submit)
- [ ] E2E tests for admin CRUD flow (posting → review → score → export)
- [ ] Accessibility tests (axe-core or similar)
- [ ] Load / stress tests for peak concurrency scenarios

---

## Milestone 14: Deployment & CI/CD

**Goal:** Automate deployment and monitoring.

- [ ] Dockerfile and docker-compose.yml for production
- [ ] GitHub Actions CI pipeline (lint → test → build)
- [ ] Deployment script (rsync or Docker-based)
- [ ] Health check endpoint (`/api/health`)
- [ ] PM2 process management with auto-restart
- [ ] Logging setup (Winston or Pino) with log rotation
- [ ] Backup strategy for database and uploads
- [ ] Monitoring and alerting (uptime, disk, memory)

---

## Milestone 15: Documentation & Handover

**Goal:** Prepare maintainable project documentation.

- [ ] README with setup, dev, and deployment instructions
- [ ] API route reference (or inline with Swagger/OpenAPI)
- [ ] Prisma schema ERD documentation
- [ ] Admin back-office user manual
- [ ] Translation contributor guide (how to add/edit locale strings)
- [ ] Runbook for common operations (backup, restore, deploy)

---

## Delivery Roadmap

| Phase | Milestones | Target |
|-------|-----------|--------|
| **Foundation** | M0, M1 | Sprint 1–2 |
| **Candidate Portal** | M2, M3 | Sprint 3–5 |
| **Admin Back-Office** | M4, M5 | Sprint 6–9 |
| **Communications** | M6 | Sprint 8 |
| **Dashboard & Analytics** | M7 | Sprint 9 |
| **Polish & Hardening** | M8, M9, M10, M11, M12 | Sprint 10–12 |
| **Testing** | M13 | Sprint 11–13 (ongoing) |
| **Deployment & Docs** | M14, M15 | Sprint 13–14 |

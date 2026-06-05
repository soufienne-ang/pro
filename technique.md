# Stack Technique — PROMOSPORT Recruitment

## Frontend
| Technologie | Usage |
|-------------|-------|
| **Next.js 14.2.35** | App Router framework |
| **React 18** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling (shadcn/ui compatible) |
| **next-intl** | i18n (fr/ar) |
| **next-auth** | Authentication (JWT) |
| **lucide-react** | Icons |

## Backend / API
| Technologie | Usage |
|-------------|-------|
| **Next.js API Routes** | REST endpoints |
| **Prisma 5** | ORM |
| **Neon (PostgreSQL)** | Database (production, via Vercel) |
| **MySQL** | Database (local dev) |
| **Zod** | Schema validation |
| **bcryptjs** | Password hashing |
| **next-auth** | Session management |

## Services
| Technologie | Usage |
|-------------|-------|
| **Nodemailer** | Email sending (Ethereal SMTP pour dev) |
| **Twilio** | SMS notifications (configured, not active) |
| **formidable** | File uploads |

## File Export
| Technologie | Usage |
|-------------|-------|
| **xlsx** | Export Excel |
| **pdfkit** | Génération PDF |

## Infrastructure
| Technologie | Usage |
|-------------|-------|
| **Vercel** | Hébergement & déploiement |
| **PM2** | Process manager (production locale) |
| **Docker / docker-compose** | MySQL local + app |
| **Winston** | Logger (installé mais non utilisé) |

## Patterns notables
- **Locale routing**: Toutes les pages sous `src/app/[locale]/` (`fr` / `ar`)
- **Client components**: Pages utilisent `"use client"` avec `useParams()` pour la locale
- **Static generation**: `generateStaticParams()` dans le layout pré-rend les deux locales au build
- **Ethereal Email**: SMTP factice pour dev — emails visibles sur https://ethereal.email/login

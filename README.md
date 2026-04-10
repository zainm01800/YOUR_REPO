# ClearMatch

ClearMatch is a reconciliation-first SaaS MVP for finance teams, accountants, bookkeepers, and SMEs working from transaction exports plus batches of receipts or invoices.

Core outcome:

- Upload a CSV or Excel transaction file
- Upload PDFs, images, or a ZIP of documents
- Extract supplier, date, net, VAT, gross, and document details
- Match documents to transactions with explainable scoring
- Review exceptions in a finance-style workspace
- Export a clean CSV or Excel file

## Product Positioning

This project is intentionally not positioned as "AI OCR for receipts".

It is positioned as:

`Reconciliation + validation + finance workflow automation`

The differentiators in this MVP are:

- Reconciliation-first workflow
- Configurable mapping templates
- Deterministic and explainable matching
- VAT and exception validation
- Review-table-first UX
- Exportable, finance-ready outputs
- Audit trail and saved runs

## Recommended Product Name

Recommended name: `ClearMatch`

Alternative options:

- MatchLedger
- ReconcileFlow
- CloseMatch
- LedgerReview

Why `ClearMatch`:

- Speaks to reconciliation and clarity instead of OCR
- Feels like a SaaS workflow product rather than a utility
- Works for finance, bookkeeping, AP, and card-export use cases

## Stack

- Frontend: Next.js 16 App Router, React 19, Tailwind CSS v4
- API: Next.js route handlers
- Data model: Prisma schema for PostgreSQL
- Persistence: Prisma + PostgreSQL when `DATABASE_URL` is configured, otherwise in-memory demo mode
- Exporting: `exceljs` and CSV generation
- Parsing: `xlsx`, `jszip`, `pdf-parse`
- Auth: Clerk

## Architecture

### App surfaces

- Landing page
- Sign in and sign up
- Dashboard
- New reconciliation run
- Column mapping
- Processing
- Review workspace
- Exceptions view
- Export view
- Settings

### Service boundaries

- `src/lib/transactions`: transaction file parsing and mapping
- `src/lib/uploads`: ZIP expansion and document extraction
- `src/lib/matching`: deterministic matching engine
- `src/lib/tax`: VAT rule validation
- `src/lib/gl`: GL code suggestion
- `src/lib/reconciliation`: review row synthesis and processing summary
- `src/lib/export`: CSV and Excel generation
- `src/lib/data`: repository abstraction with demo-mode adapter

### Database schema

The PostgreSQL schema is defined in:

- `prisma/schema.prisma`
- `prisma/migrations/20260407223000_init/migration.sql`

Core tables:

- users
- workspaces
- memberships
- reconciliation_runs
- uploaded_files
- transactions
- documents
- document_tax_lines
- match_decisions
- review_actions
- vat_rules
- gl_code_rules
- mapping_templates
- export_history

## Demo Credentials

- Email: `owner@clearmatch.app`
- Password: `DemoFinance123!`

## Running Locally

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Start the app:

```bash
npm run dev
```

5. Open:

`http://localhost:3000`

By default the app can run in `DEMO_MODE=true`, which uses the seeded in-memory repository so the full flow works without a database.

If you set:

```bash
DEMO_MODE=false
DATABASE_URL=your-postgres-connection-string
```

the app now switches automatically to the Prisma-backed PostgreSQL repository.

## Deploy To Vercel With GitHub

This repo is now set up so you can use it as a hosted website with Git-based deployments.

What is included:

- `vercel.json` for Vercel project settings and basic security headers
- `.github/workflows/ci.yml` so GitHub runs lint and build checks on pushes and pull requests
- Production-safe session secret handling
- `GET /api/health` for simple uptime checks

Recommended deployment flow:

1. Create a GitHub repository
2. Push this project to the `main` branch
3. Import the repo into Vercel
4. Add environment variables in Vercel
5. Deploy

### Environment variables for Vercel

Minimum variables:

- `SESSION_SECRET`
- `DEMO_MODE`

For an instant hosted demo:

- `SESSION_SECRET=replace-with-a-long-random-string`
- `DEMO_MODE=true`

For production persistence:

- `SESSION_SECRET=replace-with-a-long-random-string`
- `DEMO_MODE=false`
- `DATABASE_URL=your-postgres-connection-string`

### GitHub integration behavior

With Vercel Git integration:

- every push to `main` can deploy to production
- every pull request gets a preview deployment
- GitHub CI still runs lint and build before merge

### Suggested first live setup

If you want this online quickly, start with:

- Vercel hosting
- `DEMO_MODE=true`
- custom domain later

That gives you a working hosted website without having to provision the database layer on day one.

## PostgreSQL Mode

To move toward production persistence:

1. Provision PostgreSQL
2. Set `DATABASE_URL`
3. Set `DEMO_MODE=false`
4. Run:

```bash
npm run db:generate
npm run db:migrate
```

The Prisma schema and migrations are already included, and the app now switches between the demo repository and the Prisma-backed repository through `src/lib/data`.

## Next Step To Scale Further

The hosted version can now use PostgreSQL for persistent run data.

The next steps for stronger multi-user scale are:

1. Store uploaded files in object storage
2. Move document processing into a queue-backed worker
3. Add database-backed template persistence for review/export layouts
4. Attach Clerk users and workspaces to persisted database records

## Finance Workflow Covered In MVP

### Included

- Workspace concept
- Auth screens
- New reconciliation run flow
- Transaction file parsing
- Column mapping screen
- Mapping template support
- Document upload and ZIP support
- Browser-side OCR for uploaded image receipts with Tesseract.js
- Local PDF text extraction scaffold
- Matching engine with explainable scores
- VAT validation and code resolution
- GL code suggestion
- Review table with overrides
- Dedicated exceptions screen
- CSV and Excel exports
- Audit trail

### Not included yet

- Real object storage
- Queue-backed worker infrastructure
- Full OCR provider integration for image-heavy receipts
- ERP or accounting integrations
- Billing and subscriptions
- Fine-grained permissions
- Bank feeds

## Export Format

Exports include:

- Source
- Supplier
- Date
- Currency
- Net
- VAT
- Gross
- VAT %
- VAT Code
- GL Code
- Match Status
- Original Description
- Employee
- Notes

## Repository Notes

This MVP is designed to be extended in two directions:

1. Extend the Prisma-backed repository with richer user/workspace ownership and storage-backed uploads.
2. Replace the local extractor with a stronger OCR or document-intelligence provider while keeping the review, matching, VAT, and export layers intact.

## Useful Scripts

```bash
npm run dev
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run seed
npm run worker:demo
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Structure

```
src/
  app/
    api/**           BFF proxy routes. Forwarding only — no logic.
    page.tsx         screens
  lib/
    env.ts           server-only environment access, validated
    backend.ts       the ONLY module that talks to the backend
    fixtures/        stand-in responses while no backend exists
  components/ui/     shared primitives
```

## The boundary

Server code here is a **backend-for-frontend proxy, never an implementation**
([ADR-0001](../docs/decisions/0001-frontend-stack-nextjs.md)).

Route Handlers may forward credentials, aggregate backend calls, and reshape
payloads. They may not implement domain rules, decide authorization, or open a
database, cache, queue, or object-store connection. A 401 or 403 from the
backend is passed through unchanged — reinterpreting it here would move an
authorization decision into the frontend.

`src/lib/backend.ts` is the single egress point. Nothing else should call the
backend directly. `src/lib/env.ts` and `src/lib/backend.ts` both import
`server-only`, so importing them from a client component fails the build rather
than leaking configuration to the browser.

## Running without a backend

The backend stack is undecided, so the app runs entirely against fixtures.
Leave `BACKEND_URL` unset and `src/lib/fixtures` answers instead:

```bash
npm run dev
curl -i localhost:3000/api/health     # x-data-source: fixture
```

Set `BACKEND_URL` and the same route hits the real service, returning
`x-data-source: backend`. Every response carries that header, so which mode
answered is never a guess.

Fixtures are a development scaffold, not a specification. When a contract is
approved under `contracts/`, regenerate or replace them from it — a fixture is
never the source of truth for an interface.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

Copy `.env.example` to `.env.local` for local values. Names only in the example;
never commit a value.

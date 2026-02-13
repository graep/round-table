# Round Table

Evaluate whether a business idea is good and marketable using expert personas. You choose which experts (personas) to include for each idea, then run an evaluation and see per-expert opinions and an overall verdict.

## Stack

- **Frontend**: React (Vite + TypeScript) — runs **without a backend**. Personas are loaded from static JSON; evaluation runs in the browser.
- **Backend** (optional): If you set `VITE_API_URL`, the app will call that API instead of using in-browser logic. Use this when you add a server (e.g. for an LLM like Bedrock).
- **Experts**: JSON persona documents in `personas/` (role, summary, guiding_questions, principles, etc.)

## Personas (experts)

Personas live in `personas/*.json`. Each file is one expert (e.g. `customer-advocate.json`, `ceo.json`). The app ships with 13 core personas; you can add or edit JSON files to match your company’s expert roles.

To sync from your existing persona repo, copy or symlink into `personas/`:

- Customer Advocate, Finance/Ops Manager, Lead Software Engineer, Marketing Expert, Product Manager, Sales/Growth Lead, Security/Compliance Officer, UX/Design Lead, Business Attorney, CEO, CPA, Critic, CTO

## Run locally

No backend required. From the repo root:

```bash
npm install && npm run dev
```

The dev script copies `personas/*.json` into `public/personas/` and starts Vite. Open the app, select experts, enter your idea, and click **Run evaluation**. Everything runs in the browser.

Optional: to use a backend instead (e.g. for a future LLM), set `VITE_API_URL` and run the backend (see `backend/README` or `backend/server.js`).

## Deploy (frontend only)

Build and host the static site anywhere (Vercel, Netlify, S3 + CloudFront, etc.):

```bash
npm run build
```

Output is in `dist/`. The build copies personas into `public/personas/`, so they are served as static files. No server required.

## Optional: AWS backend

If you later add an API (e.g. for Bedrock/LLM), see `backend/` and `backend/infra/cdk/` for Lambda + API Gateway. Set `VITE_API_URL` to that API when building the frontend to use it instead of in-browser evaluation.

## Project layout

- `personas/` – JSON expert/persona definitions
- `shared/types/persona.ts` – TypeScript types for persona JSON
- `src/` – React app (expert selector, idea form, evaluation results)
- `backend/` – Express server and Lambda handler
- `backend/lambda/` – Lambda entry and personas loader for AWS
- `backend/infra/cdk/` – CDK stack (Lambda + API Gateway HTTP API)

## Approval

No deployments or pushes are made without your explicit approval.

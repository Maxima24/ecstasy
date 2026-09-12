# Ecstacy backend

Adaptive GRE/GMAT quantitative reasoning. FastAPI, SQLite, no LLM in the
request path.

## Demo-day runbook

Do this in order. It takes about a minute.

```bash
# 1. backend
cd backend
uv run uvicorn app.main:app --port 8000

# 2. reset the demo account (a real database does not reset on restart,
#    so after two rehearsals the account is dirty)
curl -X POST "http://localhost:8000/admin/reset?user_id=demo"

# 3. frontend, pointed at it
cd ../frontend          # in the frontend worktree
echo "BACKEND_URL=http://localhost:8000" > .env.local
npm run build && PORT=3001 npm start
```

Then confirm, before anyone is watching:

1. `http://localhost:3001` loads.
2. Every response carries `x-data-source: backend` — this is the one check that
   proves no fixture is answering:
   `curl -sD - http://localhost:3001/api/health | grep x-data-source`
3. Answer one question correctly. The roadmap must reorder.

**If anything fails:** delete `frontend/.env.local` and restart the frontend.
The fixtures take over and the demo works again. That rollback is one file and
sixty seconds, and it is why the fixture layer is still in the tree.

## Deployment

**Must be a single long-lived instance** — Render, Fly, Railway, a container.
Not Vercel or any serverless platform.

Session state lives in SQLite on local disk. On serverless, each invocation can
get a cold container, so mastery silently resets mid-demo, the roadmap stops
reordering, and the failure is unreproducible. This is a deployment choice, not
a code change, and it has to be made before a demo script is built on it.

To move to Postgres later: change `DATABASE_URL` and add a driver. Nothing in
the models is dialect-specific.

## Running it

```bash
uv sync
uv run uvicorn app.main:app --port 8000    # tables created and seeded on start
uv run pytest -q                           # 147 tests, about 20s
```

`http://localhost:8000/docs` is Swagger over the published contract.

## Environment

Every variable has a working default; the service starts with no environment at
all.

| Variable           | Default                          | Meaning |
|--------------------|----------------------------------|---------|
| `DATABASE_URL`     | `sqlite+pysqlite:///./ecstacy.db` | Postgres is this string plus a driver |
| `API_TOKEN`        | unset                            | **Unset means auth is DISABLED**, mirroring the frontend proxy, which omits the header entirely when its own token is unset. "No token on either side" is a working local configuration rather than a 401 loop |
| `CORS_ORIGINS`     | `localhost:3001,localhost:3000`  | Only matters for Swagger and curl: the Next.js *server* calls this service, and server-to-server has no preflight |
| `PUBLIC_BASE_URL`  | `http://localhost:8000`          | Used to build absolute `audio_url` values |

## Layout

```
app/
  domain/     PURE. No FastAPI, no SQLAlchemy. The policy, mastery movement,
              evidence claims and ranking. This is why 147 tests run in 20s and
              why the policy is reviewable without a database.
  schemas/    Pydantic. This IS the wire contract; contracts/openapi.json is
              generated from it.
  db/         models, seed, schema-version guard
  services/   rows in, blocks out. The only layer that knows about both sides.
  api/        thin handlers: parse, call a service, return
  data/       seeded topics, materials, questions, audio, NOTICE
scripts/
  export_openapi.py   regenerate contracts/openapi.json
  curate_aqua.py      shortlist AQuA-RAT candidates for review
  verify_aqua.py      re-derive every answer; promote only what checks out
  capture_goldens.sh  recapture tests/golden from a running fixture frontend
```

## Things that will bite you

**The contract lives in `contracts/openapi.json`.** After any schema change run
`uv run python scripts/export_openapi.py`, then regenerate the frontend's types
with `npm run contract:types`. A drift test fails if you forget.

**`/ask` must stay side-effect free.** The frontend prefetches all four profiles
the moment the first response lands, so it runs four times concurrently per
question. It must not persist the profile, and question selection must stay
deterministic for a given evidence state.

**Bump `SCHEMA_VERSION` in `db/seed.py` after any model change.** A mismatch
rebuilds the database; forgetting means a stale schema surfacing as
`no such column`.

**The seeded mastery gap is load-bearing.** The two weakest topics must be
closer together than `CORRECT_DELTA`, or one correct answer will not reorder the
roadmap and the demo's centrepiece animation does nothing. A test enforces it,
because this regression already shipped once.

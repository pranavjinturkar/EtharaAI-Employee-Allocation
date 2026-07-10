# Ethara Seat Allocation & Project Mapping System

A full-stack application that manages seat allocation for 5,000+ employees across multiple projects, floors, and zones — with an AI-powered natural language assistant for querying seating and project information.

---

## 🔗 Live Links

| Resource                        | URL                                                             |
| ------------------------------- | --------------------------------------------------------------- |
| **Frontend**                    | https://employee-allocation-fe.vercel.app/                      |
| **Backend API**                 | https://employee-allocation-be-production.up.railway.app/       |
| **API Documentation (Swagger)** | https://employee-allocation-be-production.up.railway.app/docs   |
| **GitHub Repository**           | https://github.com/pranavjinturkar/EtharaAI-Employee-Allocation |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                   Next.js 16 (Vercel CDN)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│                  (Railway — Python 3.13)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  /employees  │  │  /projects   │  │       /seats         │   │
│  │   Router     │  │   Router     │  │       Router         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  /dashboard  │  │   /ai/query  │  │  Allocation Engine   │   │
│  │   Router     │  │   Router     │  │  (proximity logic)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                 │
│       SQLAlchemy ORM + Alembic Migrations + Redis Cache         │
└──────────────┬─────────────────────────────┬────────────────────┘
               │ TCP (private network)       │ TCP (private network)
               ▼                             ▼
┌──────────────────────────┐   ┌────────────────────────────────┐
│  PostgreSQL 16 (Railway) │   │      Redis 7 (Railway)         │
│  employees │ projects    │   │  dashboard:summary (30s TTL)   │
│  seats │ seat_allocations│   │  dashboard:project-util (30s)  │
└──────────────────────────┘   │  dashboard:floor-util (30s)    │
                               │  projects:all (5min TTL)       │
                               └────────────────────────────────┘
```

### Key Design Decisions

- **Split deployment** — Frontend on Vercel (edge CDN, instant deploys), Backend on Railway (persistent server, same private network as Postgres and Redis)
- **Redis caching** — Dashboard and project endpoints cached in Redis. Response times dropped from ~200ms to 50–100ms on repeat requests. Cache auto-invalidates after any allocation, release, or project creation
- **Pagination on all list endpoints** — returns `{ data, total, page, limit, total_pages }` to handle 5,000+ records without loading everything into memory
- **N+1 query prevention** — `joinedload()` + batch `IN` queries instead of per-row DB calls. Reduced employee list from 29s → <1s
- **Row-level locking** — `SELECT ... FOR UPDATE` on seat during allocation prevents race conditions when two requests allocate the same seat simultaneously
- **Rule-based AI** — Intent parser with keyword scoring + entity extraction. No external API dependency, zero cost, deterministic responses
- **Graceful cache degradation** — If Redis is unavailable, all endpoints fall through to PostgreSQL automatically with no errors

---

## 🛠️ Tech Stack

### Frontend

| Technology              | Purpose                 |
| ----------------------- | ----------------------- |
| Next.js 16 (App Router) | Framework, routing, SSR |
| TypeScript              | Type safety             |
| Tailwind CSS            | Styling                 |
| shadcn/ui               | Component library       |
| React Hook Form         | Form state management   |
| Zod                     | Schema validation       |
| Recharts                | Dashboard charts        |
| react-hot-toast         | Notifications           |
| lucide-react            | Icons                   |

### Backend

| Technology      | Purpose                          |
| --------------- | -------------------------------- |
| Python 3.13     | Runtime                          |
| FastAPI         | Web framework, auto Swagger docs |
| SQLAlchemy 2.0  | ORM, query building              |
| Alembic         | Database migrations              |
| Pydantic v2     | Request/response validation      |
| psycopg2        | PostgreSQL driver                |
| Redis (hiredis) | Response caching                 |
| Faker           | Seed data generation             |
| Uvicorn         | ASGI server                      |

### Infrastructure

| Technology    | Purpose                            |
| ------------- | ---------------------------------- |
| PostgreSQL 16 | Primary database                   |
| Redis 7       | Response cache                     |
| Railway       | Backend + Database + Cache hosting |
| Vercel        | Frontend hosting                   |
| GitHub        | Version control                    |

---

## 📁 Project Structure

```
ethara-seat-allocation/
├── backend/
│   ├── routers/
│   │   ├── employees.py          # CRUD + pagination + N+1 fix
│   │   ├── projects.py           # Project management + cache invalidation
│   │   ├── seats.py              # Seat CRUD + allocate + release + cache invalidation
│   │   ├── dashboard.py          # Aggregate queries + Redis cache
│   │   └── ai.py                 # AI query endpoint
│   ├── services/
│   │   ├── allocation_engine.py  # Proximity-based seat suggestion
│   │   └── intent_parser.py      # Rule-based NL query handler
│   ├── alembic/                  # Database migrations
│   ├── main.py                   # FastAPI app + CORS + health check
│   ├── cache.py                  # Redis client + cache decorator + invalidation
│   ├── database.py               # SQLAlchemy engine + session
│   ├── models.py                 # ORM models + enums
│   ├── schemas.py                # Pydantic schemas
│   ├── seed.py                   # 5,000 employee seed script
│   ├── clear_db.py               # Database reset utility
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Dashboard
│   │   ├── employees/            # Employee management
│   │   ├── seats/                # Seat management
│   │   ├── projects/             # Project management
│   │   └── assistant/            # AI chat interface
│   ├── components/
│   │   ├── forms/                # RHF + Zod form components
│   │   ├── ui/                   # shadcn components
│   │   └── StatusBadge.tsx       # Reusable status component
│   ├── lib/
│   │   ├── api.ts                # Typed API client
│   │   └── validations.ts        # Zod schemas
│   └── hooks/
│       ├── usePagination.ts      # Pagination hook
│       └── useDebounce.ts        # Debounce hook
├── README.md
└── AI_PROMPTS.md
```

---

## 🗄️ Database Schema

```sql
-- Projects
CREATE TABLE projects (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR UNIQUE NOT NULL,
    description  VARCHAR,
    manager_name VARCHAR,
    status       VARCHAR DEFAULT 'ACTIVE',
    created_at   TIMESTAMP DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
    id            SERIAL PRIMARY KEY,
    employee_code VARCHAR UNIQUE NOT NULL,  -- Auto-generated: ETH00001
    name          VARCHAR NOT NULL,
    email         VARCHAR UNIQUE NOT NULL,
    department    VARCHAR NOT NULL,
    role          VARCHAR NOT NULL,
    joining_date  DATE NOT NULL,
    status        VARCHAR DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | PENDING_ALLOCATION
    project_id    INTEGER REFERENCES projects(id),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Seats
CREATE TABLE seats (
    id          SERIAL PRIMARY KEY,
    floor       INTEGER NOT NULL,
    zone        VARCHAR NOT NULL,
    bay         VARCHAR NOT NULL,
    seat_number VARCHAR NOT NULL,
    status      VARCHAR DEFAULT 'AVAILABLE', -- AVAILABLE | OCCUPIED | RESERVED | MAINTENANCE
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (floor, zone, seat_number)        -- Business Rule 7
);

-- Seat Allocations (historical — never deleted)
CREATE TABLE seat_allocations (
    id                SERIAL PRIMARY KEY,
    employee_id       INTEGER REFERENCES employees(id) NOT NULL,
    seat_id           INTEGER REFERENCES seats(id) NOT NULL,
    project_id        INTEGER REFERENCES projects(id) NOT NULL,
    allocation_status VARCHAR DEFAULT 'ACTIVE', -- ACTIVE | RELEASED
    allocation_date   TIMESTAMP DEFAULT NOW(),
    released_date     TIMESTAMP
);
```

### Business Rules Enforced

| Rule                               | Enforcement                                   |
| ---------------------------------- | --------------------------------------------- |
| One employee → one active seat     | App-level check before insert                 |
| One seat → one active employee     | `SELECT FOR UPDATE` row lock                  |
| Released seats become available    | `release_seat` flips status to AVAILABLE      |
| Reserved seats cannot be allocated | Status check returns 409                      |
| New joiners get proximity seats    | Allocation engine: zone → floor → global      |
| Duplicate email rejected           | `UNIQUE` constraint + 409 response            |
| Duplicate seat on same floor/zone  | `UNIQUE(floor, zone, seat_number)` constraint |
| Dashboard updates after mutations  | Cache invalidated + client refreshes          |

---

## ⚡ Caching Strategy

Redis is used to cache read-heavy, infrequently-changing endpoints:

| Cache Key                       | Endpoint                             | TTL   | Invalidated By    |
| ------------------------------- | ------------------------------------ | ----- | ----------------- |
| `dashboard:summary`             | `GET /dashboard/summary`             | 30s   | allocate, release |
| `dashboard:project-utilization` | `GET /dashboard/project-utilization` | 30s   | allocate, release |
| `dashboard:floor-utilization`   | `GET /dashboard/floor-utilization`   | 30s   | allocate, release |
| `projects:all`                  | `GET /projects`                      | 5 min | create project    |

**Not cached:** `GET /employees`, `GET /seats` — too many filter/pagination combinations make per-key caching impractical and stale risk is high.

**Graceful degradation:** If Redis goes down, `REDIS_AVAILABLE` flag is set to `False` at startup and all requests fall through to PostgreSQL silently. The `/health` endpoint reports cache status separately from app status.

```json
// GET /health
{
  "status": "ok",
  "cache": "connected",
  "cache_url": "configured"
}
```

---

## 🚀 Local Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL (or use Railway connection string)
- Redis (optional — app works without it)

### Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate     # Mac/Linux
# venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env — add DATABASE_URL and optionally REDIS_URL

# Run migrations
alembic upgrade head

# Seed database (5,000 employees, 5,750 seats)
python seed.py

# Start server
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`
Swagger docs at: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

### Environment Variables

**`backend/.env`:**

```
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://localhost:6379   # optional — app works without Redis
```

**`frontend/.env.local`:**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🌱 Seed Data

The seed script generates data satisfying all assessment requirements:

| Metric             | Value                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Projects           | 11 (Indigo, Indreed, Mydreed, Preed, Serfy, Oreed, bedegreed, Opreed, Serry, Kaary, Mered) |
| Floors             | 5                                                                                          |
| Zones              | 10 (A–J)                                                                                   |
| Total seats        | 5,750                                                                                      |
| Available seats    | 700+                                                                                       |
| Reserved seats     | 100                                                                                        |
| Total employees    | 5,000                                                                                      |
| Pending allocation | 50                                                                                         |
| Active allocations | 4,950                                                                                      |

```bash
python seed.py        # wipe + re-seed everything
python clear_db.py    # wipe only, keep table structure
```

The seed script uses a single SQL `WITH` CTE to insert 4,950 allocations in one statement rather than a Python loop — completes in under 30 seconds.

---

## 📡 API Endpoints

Full interactive documentation: https://employee-allocation-be-production.up.railway.app/docs

### Employees

```
POST   /employees                Create employee (auto-generates ETH code)
GET    /employees                List with pagination + search + filters
GET    /employees/{id}           Get employee with seat info
PUT    /employees/{id}           Update employee
DELETE /employees/{id}           Soft deactivate (status → INACTIVE)
```

### Projects

```
POST   /projects                 Create project
GET    /projects                 List active projects (Redis cached 5min)
GET    /projects/{id}/employees  List employees in project with seat info
```

### Seats

```
POST   /seats                    Create seat
GET    /seats                    List with pagination + filters
GET    /seats/available          List available seats (proximity-sorted if project_id given)
POST   /seats/allocate           Allocate seat to employee (auto-suggest if no seat_id)
POST   /seats/release            Release employee's active seat
PATCH  /seats/{id}/status        Update seat status (Available/Reserved/Maintenance)
```

### Dashboard

```
GET    /dashboard/summary              Totals (Redis cached 30s)
GET    /dashboard/project-utilization  Per-project seat counts (Redis cached 30s)
GET    /dashboard/floor-utilization    Per-floor occupancy breakdown (Redis cached 30s)
```

### AI Assistant

```
POST   /ai/query
Body:    { "query": "Where is Amit seated?", "email": "amit@ethara.ai" }
Returns: { "answer": "Amit Sharma is seated on Floor 2, Zone B, Bay 4, Seat B4-23. They are assigned to Project Indigo." }
```

### Health

```
GET    /health    App + cache status
```

---

## 🤖 AI Assistant

The AI assistant uses a **rule-based intent parser** — no external API required, zero cost, fully deterministic.

### Supported Intents

| Intent              | Example Query                                 |
| ------------------- | --------------------------------------------- |
| Seat lookup         | "Where is Amit seated?" / "Where is my seat?" |
| Project lookup      | "What project is ETH00042 on?"                |
| Available seats     | "Show available seats on Floor 3"             |
| Team nearby         | "Who sits near me?" (requires email)          |
| Project utilization | "How many seats does Project Indigo have?"    |

### How It Works

1. **Intent scoring** — query lowercased and scored against keyword sets for each intent
2. **Entity extraction** — employee matched by per-word name search or email; floor via regex `(?:floor\s*)(\d+)`; project by string match against DB
3. **DB query** — relevant data fetched based on winning intent + extracted entities
4. **Template response** — natural language answer built from a template string

---

## 🧪 Testing

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

Tests use an in-memory SQLite database and cover all 8 core business rules including:

- Duplicate email rejection (409)
- Double seat allocation prevention (409)
- Reserved seat allocation rejection (409)
- Soft delete verification (row persists, status = INACTIVE)
- Release restores seat to AVAILABLE
- Dashboard response shape validation
- AI query fallback for unrecognised input

---

## 🚢 Deployment Notes

### Backend (Railway)

- Service linked to GitHub repo, root directory: `backend/`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `DATABASE_URL` — auto-linked from Railway Postgres service
  - `REDIS_URL` — auto-linked from Railway Redis service
- Run migrations: `railway run alembic upgrade head`
- Run seed: `railway run python seed.py`

### Redis (Railway)

- Add Redis service to same Railway project as backend
- Use "Add Variable Reference" to link `REDIS_URL` automatically — no manual copying
- Redis and backend are on Railway's private network — no public exposure needed

### Frontend (Vercel)

- Linked to GitHub repo, root directory: `frontend/`
- Environment variable: `NEXT_PUBLIC_API_URL=https://employee-allocation-be-production.up.railway.app`
- Auto-deploys on push to main branch

### CORS

Update `allow_origins` in `backend/main.py` if the frontend URL changes.

---

## 📸 Screenshots

### Dashboard

![Dashboard](assets/dashboard.png)

### Employee List

![Employees](assets/employees.png)

### Seat Management

![Seats](assets/seats.png)

### Project Team Modal

![Projects](assets/projects.png)

### AI Assistant

![AI Assistant](assets/ai-assistant.png)

---

## 👤 Author

**Pranav Jinturkar**
Full-Stack Developer

- Portfolio: https://ambitionlessdev.in
- GitHub: https://github.com/pranavjinturkar

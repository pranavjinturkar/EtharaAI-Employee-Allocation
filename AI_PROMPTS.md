# AI_PROMPTS.md — Ethara Seat Allocation & Project Mapping System

All prompts used during development, what AI generated correctly, what was wrong, what was manually fixed, and how correctness was verified.

---

## Prompt 1 — Architecture & Planning

**Tool used:** Claude (claude.ai)

**Prompt:**

> Design a full system architecture for a seat allocation system for 5,000 employees at Ethara. Requirements: FastAPI backend, Next.js frontend, PostgreSQL database, REST APIs for employee management, seat allocation with business rules (one employee one seat, proximity-based allocation, reserved seat protection), a dashboard with utilization metrics, and an AI assistant for natural language queries. Include tech stack justification, folder structure, deployment plan on Railway + Vercel, and database schema.

**What AI generated correctly:**

- Complete folder structure with `backend/` and `frontend/` as sibling directories
- Technology mapping table (FastAPI = Express equivalent, Pydantic = body validation, Depends() = middleware)
- Deployment topology — Vercel for frontend, Railway for backend + Postgres
- Identified that Swagger docs are free/automatic in FastAPI — no extra library needed
- Explained that the `seat_allocations` table should be historical (never delete rows, use `allocation_status` ACTIVE/RELEASED)

**What AI generated incorrectly:**

- Initially suggested Node.js/Express instead of FastAPI — had to correct this
- Architecture doc initially used Prisma references — needed to be updated to SQLAlchemy/Alembic

**What I manually fixed:**

- Corrected stack from Node.js to FastAPI
- Adjusted deployment commands to use `uvicorn` instead of `npm start`

**How I verified correctness:**

- Cross-checked folder structure against assessment requirements
- Confirmed all required API endpoints were covered in the architecture before writing any code

---

## Prompt 2 — Database Design

**Tool used:** Claude (claude.ai)

**Prompt:**

> In `backend/models.py`, create SQLAlchemy 2.0 models using `Mapped`/`mapped_column` style for: Employee (id, employee_code unique, name, email unique, department, role, joining_date, status enum ACTIVE/INACTIVE/PENDING_ALLOCATION, project_id nullable FK), Project (id, name unique, description, manager_name, status enum ACTIVE/ARCHIVED), Seat (id, floor, zone, bay, seat_number, status enum AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE, unique constraint on floor+zone+seat_number), SeatAllocation (id, employee_id FK, seat_id FK, project_id FK, allocation_status enum ACTIVE/RELEASED, allocation_date, released_date nullable). Add indexes on all FK columns and status columns. Also set up Alembic migrations reading DATABASE_URL from .env.

**What AI generated correctly:**

- All 4 models with correct field types and relationships
- UniqueConstraint on `(floor, zone, seat_number)` for Business Rule 7
- Composite indexes on `(employee_id, allocation_status)` and `(seat_id, allocation_status)` for fast allocation lookups
- Alembic `env.py` reading DATABASE_URL programmatically

**What AI generated incorrectly:**

- Used relative import `from .database import Base` in `models.py` — caused `ImportError: attempted relative import with no known parent package`
- In `alembic/env.py`, the `if DATABASE_URL:` check was placed before the import that defined `DATABASE_URL` — caused `NameError: name 'DATABASE_URL' is not defined`

**What I manually fixed:**

- Changed `from .database import Base` → `from database import Base` (absolute import)
- Moved `sys.path.insert()` and all imports to the top of `env.py` before any usage

**How I verified correctness:**

- Ran `alembic upgrade head` and confirmed it exited cleanly
- Connected to Railway Postgres and ran `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` — confirmed all 4 tables created with correct columns

---

## Prompt 3 — Backend APIs

**Tool used:** Antigravity (Gemini 3.1 Pro)

**Prompt:**

> I'm building a FastAPI seat allocation system. Fill in all router files completely. [Full prompt included schemas.py with all Pydantic models, employees.py with 5 endpoints including pagination and search, projects.py with 3 endpoints, seats.py with 5 endpoints including allocate/release with row locking, dashboard.py with 3 aggregate query endpoints using func.count() and group_by(), and ai.py calling the intent parser service.]

**What AI generated correctly:**

- All 16 required API endpoints with correct HTTP methods and paths
- Soft delete pattern (status → INACTIVE instead of row deletion)
- 409 conflict responses for duplicate email and duplicate seat
- `func.count()` + `group_by()` for dashboard aggregates — no Python-level counting
- `with_for_update()` row lock on seat during allocation

**What AI generated incorrectly:**

- `GET /employees` initially returned a plain list — needed to be wrapped in a paginated response object `{ data, total, page, limit, total_pages }`
- `_populate_employee_out()` function ran one DB query per employee to fetch seat info — N+1 query problem causing 29-second response times on 50 employees

**What I manually fixed:**

- Added `PaginatedResponse[T]` generic schema to `schemas.py`
- Rewrote `GET /employees` to use `joinedload(Employee.project)` and a single batch `IN` query for all allocations on the current page instead of one query per row — reduced response time from 29s to <1s
- Applied same N+1 fix to `GET /seats` (batch allocation lookup per page) and `GET /projects/{id}/employees`

**How I verified correctness:**

- Tested all endpoints in Swagger UI at `localhost:8000/docs`
- Created employee → verified 409 on duplicate email
- Allocated seat → verified seat status flipped to OCCUPIED, employee status to ACTIVE
- Released seat → verified seat flipped back to AVAILABLE
- Measured response times before and after N+1 fix using browser Network tab

---

## Prompt 4 — Seat Allocation Logic

**Tool used:** Antigravity (Gemini 3.1 Pro)

**Prompt:**

> Create `backend/services/allocation_engine.py` implementing `suggest_seat(db, employee_id)`. Logic: find employee's project_id, find most common floor+zone among active allocations for that project (teammates' seats), search AVAILABLE seats in that zone first, then same floor any zone, then any floor. If none found, set employee status to PENDING_ALLOCATION and raise HTTPException 409. Use `select ... with_for_update()` to row-lock during allocation.

**What AI generated correctly:**

- Three-tier fallback: zone → floor → global
- Row locking with `with_for_update()`
- Setting employee status to `PENDING_ALLOCATION` when no seats available
- Correct SQLAlchemy query using `func.count()` and `group_by()` to find the most common floor+zone for a project

**What AI generated incorrectly:**

- Did not handle the case where `employee.project_id` is None — caused an unhandled AttributeError when allocating an employee not yet assigned to a project

**What I manually fixed:**

- Added early check: `if not employee.project_id: raise HTTPException(400, "Employee must be assigned to a project first")`

**How I verified correctness:**

- Created a new employee assigned to Project Indigo
- Called `POST /seats/allocate` with only `employee_id` (no `seat_id`)
- Verified the allocated seat was in the same zone as other Indigo team members
- Tested fallback by temporarily marking all zone A seats as RESERVED and confirmed allocation fell back to same floor, different zone

---

## Prompt 5 — AI Assistant

**Tool used:** Antigravity + Claude (claude.ai)

**Prompt:**

> Create `backend/services/intent_parser.py` implementing a rule-based intent parser. Define intents: SEAT_LOOKUP (keywords: where, seat, sitting, located, floor), PROJECT_LOOKUP (keywords: project, assigned, working on, team), AVAILABLE_SEATS (keywords: available, free, empty, vacant), TEAM_NEARBY (keywords: near me, nearby, next to, neighbors, who sits), PROJECT_UTILIZATION (keywords: how many, count, occupied, utilization). Score each intent by keyword matches, pick highest score, extract entities (employee name/email, floor number, project name), query DB, return natural language answer. Main function: `parse_and_answer(db, query, email)`.

**What AI generated correctly:**

- Intent scoring system with keyword matching
- Floor number extraction using regex `(?:floor\s*)(\d+)|(\d+)(?:st|nd|rd|th)\s*floor`
- Project name matching against DB records
- Email-based employee context resolution
- All 5 intent handlers with DB queries and template responses

**What AI generated incorrectly:**

- `SEAT_LOOKUP` handler checked `emp.name.lower() in query_lower` — this requires the full name "amit sharma" to appear in the query. "Amit" alone didn't match
- Fallback to `ctx_emp` only fired for exact words "i" or "my" in query — too restrictive

**What I manually fixed:**

- Rewrote `find_employee_in_query()` to also check each word in the employee's name individually (first name, last name), skipping words shorter than 3 characters to avoid false matches
- Made `ctx_emp` (from email parameter) the default fallback for SEAT_LOOKUP when no name is found in query text

**How I verified correctness:**

- Tested `POST /ai/query` with `{"query": "Where is Amit seated?", "email": "amit@ethara.ai"}` — returned correct floor/zone/seat/project
- Tested "Show available seats on floor 3" — returned correct count
- Tested "Who sits near me?" with email — returned nearby team members
- Tested gibberish input — returned helpful fallback message, no 500 error

---

## Prompt 6 — Frontend

**Tool used:** Antigravity (Gemini 3.1 Pro)

**Prompt:**

> [Full frontend prompt — Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, color palette #F7F6F6/#7CC0AA/#88778F/#96849A/#43464D. Seven files: layout.tsx with responsive sidebar, page.tsx dashboard with recharts, employees/page.tsx with paginated table + CRUD dialogs, seats/page.tsx with allocate/release actions, projects/page.tsx with project cards + team modal, assistant/page.tsx chat UI, .env.local. All pages use react-hot-toast for notifications, loading skeletons, error states.]

**What AI generated correctly:**

- Responsive layout with bottom tab bar on mobile, sidebar on desktop
- Dashboard with two recharts bar charts (project utilization + floor occupancy)
- Paginated employee table with search and filter dropdowns
- Status badges with correct colors per status
- AI assistant chat UI with message bubbles and example chips

**What AI generated incorrectly:**

- Project team viewer used a Sheet component that was too narrow on desktop — content clipped, Status column hidden
- All Select components used both `defaultValue` and `value` props — caused React controlled/uncontrolled warning
- Employee form included `employee_code` field even after backend was changed to auto-generate it
- No error handling on API calls — page crashed when backend was offline

**What I manually fixed:**

- Replaced Sheet with Dialog modal (`max-w-[900px]`) for project team viewer with explicit column widths (55%/30%/15%)
- Fixed all Select components to use only `value` prop, never `defaultValue` alongside it
- Removed `employee_code` from form, added read-only display for edit mode
- Added `getErrorMessage()` helper and `toast.error()` on all API catch blocks

**How I verified correctness:**

- Clicked through all pages in browser
- Tested all CRUD operations (create/edit/deactivate employee, allocate/release seat, create project)
- Tested on mobile viewport (Chrome DevTools iPhone 12) — confirmed bottom tab bar and card layout
- Verified no console errors during normal usage

---

## Prompt 7 — Testing

**Tool used:** Antigravity (Gemini 3.1 Pro)

**Prompt:**

> Create a pytest test suite in `backend/tests/test_api.py` using SQLite in-memory database. Cover: health check, employee CRUD including duplicate email 409, pagination response shape, soft delete verification, seat allocation business rules (one employee one seat, one seat one employee, reserved seat protection, release restores availability), dashboard response fields, AI query endpoint.

**What AI generated correctly:**

- `conftest.py` with SQLite in-memory engine overriding `get_db` dependency
- Fixture chain: project fixture → employee fixture → seat fixture
- Tests for all 8 business rules
- Docstrings explaining which business rule each test verifies

**What AI generated incorrectly:**

- Some tests used hardcoded IDs (`employee_id=1`) instead of using IDs from fixture responses
- SQLite doesn't support `FOR UPDATE` — the `with_for_update()` call in allocation engine caused test failures

**What I manually fixed:**

- Changed all hardcoded IDs to use `response.json()["id"]` from fixture setup
- Added SQLite dialect check in allocation engine: skip `with_for_update()` when using SQLite (test env)

**How I verified correctness:**

- Ran `pytest tests/ -v` — all tests passed
- Checked that business rule tests actually failed before the fix (to confirm they were testing real behavior, not passing vacuously)

---

## Prompt 8 — Debugging

**Tool used:** Claude (claude.ai)

**Issues encountered and resolved:**

### Issue 1 — Alembic NameError

**Error:** `NameError: name 'DATABASE_URL' is not defined` in `alembic/env.py`
**Cause:** `if DATABASE_URL:` check appeared before the import that defined `DATABASE_URL`
**Fix:** Moved all imports to top of file before any usage
**Verified:** `alembic upgrade head` completed cleanly

### Issue 2 — Relative Import Error

**Error:** `ImportError: attempted relative import with no known parent package` in `models.py`
**Cause:** Used `from .database import Base` (relative import) — files are siblings not inside a package
**Fix:** Changed to `from database import Base` (absolute import)
**Verified:** `uvicorn main:app --reload` started without errors

### Issue 3 — N+1 Query Problem

**Error:** `GET /employees` taking 29 seconds for 50 results
**Cause:** `_populate_employee_out()` ran one DB query per employee to fetch seat allocation — 51 queries for 50 employees
**Fix:** Batch fetch all allocations for the current page in one `IN` query, build a dict keyed by `employee_id`, do O(1) lookup per employee
**Verified:** Response time dropped from 29s to <1s measured in browser Network tab

### Issue 4 — Seed Script Timeout

**Error:** `seed.py` hanging for 5+ minutes on seat allocation step
**Cause:** ORM-level loop updating 4,950 seat objects individually — each `seat.status = OCCUPIED` queued as a separate UPDATE statement
**Fix:** Replaced Python loop with single SQL `WITH` CTE that inserts all allocations at once + one `UPDATE seats SET status='OCCUPIED' WHERE id IN (SELECT seat_id FROM seat_allocations)`
**Verified:** Seed script completed in under 30 seconds

### Issue 5 — AI Intent Parser Name Matching

**Error:** `POST /ai/query {"query": "Where is Amit seated?"}` returned "I couldn't identify the employee"
**Cause:** Parser checked `emp.name.lower() in query_lower` — requires full name "amit sharma" not just "amit"
**Fix:** Split name by spaces, check each word individually, skip words under 3 chars
**Verified:** Query "Where is Amit seated?" with email returned correct seat info

### Issue 6 — React Select Controlled/Uncontrolled Warning

**Error:** Console warning "A component is changing the uncontrolled value state of Select to be controlled"
**Cause:** shadcn Select used both `defaultValue` and `value` props simultaneously — `value={undefined}` on first render made it uncontrolled, then it switched
**Fix:** Removed all `defaultValue` props from Select components, always use only `value`, convert null/undefined to empty string `""`
**Verified:** No console warnings when opening and interacting with employee form

### Issue 7 — Project Team Sheet Too Narrow

**Error:** Status column clipped, names truncated in project team side panel
**Cause:** shadcn Sheet default width was too narrow, no explicit column widths on table
**Fix:** Replaced Sheet with Dialog (`max-w-[900px]`), set explicit column widths `55% / 30% / 15%`
**Verified:** All names fully visible, Status column always shows on desktop and tablet

---

## Prompt 9 — Deployment

**Tool used:** Claude (claude.ai)

**Prompt:**

> Deployment guide for FastAPI backend on Railway and Next.js frontend on Vercel. Backend needs: start command uvicorn, DATABASE_URL env var, run alembic upgrade head and python seed.py after deploy. Frontend needs: NEXT_PUBLIC_API_URL pointing at Railway URL. CORS must be updated to allow Vercel domain. Include Railway CLI commands.

**What AI generated correctly:**

- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Railway CLI commands for running migrations and seed against production DB
- CORS middleware configuration with production domain
- Vercel environment variable setup

**What AI generated incorrectly:**

- Did not mention that Railway auto-links `DATABASE_URL` when Postgres is in the same project — suggested manual copying which is unnecessary

**What I manually fixed:**

- Used Railway's "Add Variable Reference" to link DATABASE_URL automatically from the Postgres service

**How I verified correctness:**

- Opened `https://employee-allocation-be-production.up.railway.app/docs` — Swagger UI loaded
- Opened `https://employee-allocation-fe.vercel.app/` — dashboard loaded with real data from Railway DB
- Tested cross-origin request from Vercel frontend to Railway backend — no CORS errors in browser console

---

## Prompt 10 — Refactoring

**Tool used:** Claude (claude.ai)

**Prompt:**

> Review my FastAPI employees router for performance issues. I'm seeing 29-second response times on GET /employees returning 50 results. The database has 5,000 employees. Identify the root cause and rewrite the endpoint to fix it without changing the response shape.

**What AI generated correctly:**

- Correctly identified N+1 query problem immediately
- Provided `joinedload()` solution for the project relationship
- Provided batch `IN` query + dict lookup pattern for allocations

**What AI generated incorrectly:**

- Initially suggested adding a database index as the fix — this would not help since the issue was query count, not query speed
- First refactor still had a subtle issue: `joinedload` on `SeatAllocation.seat` inside the allocation batch query was loading unnecessary seat data

**What I manually fixed:**

- Kept `joinedload(SeatAllocation.seat)` since we need `seat.floor/zone/bay/seat_number` for `EmployeeOut`
- Added `joinedload(Employee.project)` to the main employee query to eliminate the project N+1 as well

**How I verified correctness:**

- Measured before: 29,350ms for GET /employees (50 results)
- Measured after: 487ms for the same request
- Confirmed response shape unchanged — same fields, same pagination structure

---

## Summary

### What AI Generated Correctly

- Complete project architecture and folder structure
- All SQLAlchemy models with correct relationships, enums, and constraints
- All 16 API endpoints with correct HTTP methods, status codes, and validation
- Pagination pattern (`{ data, total, page, limit, total_pages }`)
- Dashboard aggregate queries using `func.count()` + `group_by()`
- Seat allocation proximity logic (zone → floor → global fallback)
- Rule-based AI intent parser with 5 intents
- React Hook Form + Zod form validation setup
- Responsive layout with mobile bottom tab bar + desktop sidebar
- Recharts dashboard visualizations

### What AI Generated Incorrectly

- Relative imports instead of absolute imports in Python files
- N+1 query problem in list endpoints (one DB query per row)
- Seed script using ORM objects in loops (too slow for 5,000 rows)
- React Select controlled/uncontrolled component warning
- Project team viewer too narrow on desktop (wrong component choice)
- AI parser using full-name substring match (too strict)
- Missing null check for `employee.project_id` in allocation engine

### What I Manually Fixed

- All relative imports → absolute imports
- N+1 queries → batch `IN` queries + `joinedload()`
- Seed script loop → single SQL CTE
- Select `defaultValue`+`value` → `value` only
- Sheet → Dialog with explicit widths
- AI name matching → per-word partial matching
- Added project_id null guard in allocation engine

### How I Verified Correctness

- Every API endpoint tested in Swagger UI before frontend integration
- Response times measured in browser Network tab before and after fixes
- Database state verified directly via Railway query console after each operation
- All 8 business rules tested explicitly (duplicate seat, double allocation, reserved seat, etc.)
- Mobile view tested in Chrome DevTools (iPhone 12 viewport)
- Pytest suite run with `pytest tests/ -v` — all tests passing
- Live deployment tested end-to-end from Vercel frontend hitting Railway backend

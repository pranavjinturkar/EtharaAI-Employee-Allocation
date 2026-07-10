from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import employees, projects, seats, dashboard, ai
from cache import redis_client, REDIS_AVAILABLE
import os

app = FastAPI(title="Ethara Seat Allocation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://employee-allocation-fe.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees.router, prefix="/employees", tags=["Employees"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(seats.router, prefix="/seats", tags=["Seats"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])

@app.get("/health")
def health():
    cache_status = "connected" if REDIS_AVAILABLE else "unavailable"
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.ping()
        except Exception:
            cache_status = "error"
    return {
        "status": "ok",
        "cache": cache_status,
        "cache_url": "configured" if os.getenv("REDIS_URL") else "not configured"
    }
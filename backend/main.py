from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import employees, projects, seats, dashboard, ai

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
    return {"status": "ok"}
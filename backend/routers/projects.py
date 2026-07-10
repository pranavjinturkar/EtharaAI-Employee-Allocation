from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Project, ProjectStatus, Employee, EmployeeStatus
import schemas
from routers.employees import _build_employee_out
from cache import cache_response, invalidate_pattern

router = APIRouter()

@router.post("/", response_model=schemas.ProjectOut)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.name == project.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Project name already exists")
        
    db_proj = Project(**project.model_dump())
    db.add(db_proj)
    db.commit()
    db.refresh(db_proj)
    invalidate_pattern("projects:*")
    invalidate_pattern("dashboard:*")
    return db_proj

@router.get("/", response_model=List[schemas.ProjectOut])
@cache_response("projects:all", ttl=300)
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.status == ProjectStatus.ACTIVE).all()
    # Return as list of dicts — cacheable, and Pydantic response_model handles validation
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "manager_name": p.manager_name,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]

@router.get("/{id}/employees", response_model=List[schemas.EmployeeOut])
def get_project_employees(id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from models import SeatAllocation, AllocationStatus

    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    employees = (
        db.query(Employee)
        .options(joinedload(Employee.project))
        .filter(Employee.project_id == id, Employee.status == EmployeeStatus.ACTIVE)
        .all()
    )

    emp_ids = [e.id for e in employees]
    allocations = (
        db.query(SeatAllocation)
        .options(joinedload(SeatAllocation.seat))
        .filter(
            SeatAllocation.employee_id.in_(emp_ids),
            SeatAllocation.allocation_status == AllocationStatus.ACTIVE
        )
        .all()
    )
    alloc_map = {a.employee_id: a for a in allocations}

    return [_build_employee_out(emp, alloc_map) for emp in employees]
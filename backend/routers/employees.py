from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional
import math

from database import get_db
from models import Employee, EmployeeStatus, SeatAllocation, AllocationStatus
import schemas

router = APIRouter()

def _build_employee_out(emp: Employee, alloc_map: dict) -> dict:
    """Build employee response dict using pre-loaded allocation map — zero extra queries."""
    alloc = alloc_map.get(emp.id)
    return {
        "id": emp.id,
        "employee_code": emp.employee_code,
        "name": emp.name,
        "email": emp.email,
        "department": emp.department,
        "role": emp.role,
        "joining_date": emp.joining_date,
        "project_id": emp.project_id,
        "status": emp.status,
        "created_at": emp.created_at,
        "project_name": emp.project.name if emp.project else None,
        "seat_info": {
            "floor": alloc.seat.floor,
            "zone": alloc.seat.zone,
            "bay": alloc.seat.bay,
            "seat_number": alloc.seat.seat_number,
        } if alloc and alloc.seat else None,
    }

@router.get("/", response_model=schemas.PaginatedResponse[schemas.EmployeeOut])
def get_employees(
    search: Optional[str] = None,
    project_id: Optional[int] = None,
    status: Optional[EmployeeStatus] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Employee).options(joinedload(Employee.project))

    if search:
        query = query.filter(or_(
            Employee.name.ilike(f"%{search}%"),
            Employee.email.ilike(f"%{search}%"),
            Employee.employee_code.ilike(f"%{search}%")
        ))
    if project_id is not None:
        query = query.filter(Employee.project_id == project_id)
    if status is not None:
        query = query.filter(Employee.status == status)

    total = query.count()
    offset = (page - 1) * limit
    employees = query.offset(offset).limit(limit).all()

    # ONE query to get all active allocations for this page's employees
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
    # Map employee_id → allocation for O(1) lookup
    alloc_map = {a.employee_id: a for a in allocations}

    return {
        "data": [_build_employee_out(emp, alloc_map) for emp in employees],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 1,
    }

@router.get("/{id}", response_model=schemas.EmployeeOut)
def get_employee(id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).options(joinedload(Employee.project)).filter(Employee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    alloc = db.query(SeatAllocation).options(joinedload(SeatAllocation.seat)).filter(
        SeatAllocation.employee_id == id,
        SeatAllocation.allocation_status == AllocationStatus.ACTIVE
    ).first()
    alloc_map = {id: alloc} if alloc else {}
    return _build_employee_out(emp, alloc_map)

@router.post("/", response_model=schemas.EmployeeOut)
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    if db.query(Employee).filter(Employee.email == emp.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    # Auto-generate code
    db_emp = Employee(**emp.model_dump(), employee_code="")
    db.add(db_emp)
    db.flush()
    db_emp.employee_code = f"ETH{db_emp.id:05d}"
    db.commit()
    db.refresh(db_emp)
    emp_with_project = db.query(Employee).options(joinedload(Employee.project)).filter(Employee.id == db_emp.id).first()
    return _build_employee_out(emp_with_project, {})

@router.put("/{id}", response_model=schemas.EmployeeOut)
def update_employee(id: int, emp_update: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.id == id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    update_data = emp_update.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] != db_emp.email:
        if db.query(Employee).filter(Employee.email == update_data["email"]).first():
            raise HTTPException(status_code=409, detail="Email already registered")
    for key, value in update_data.items():
        setattr(db_emp, key, value)
    db.commit()
    emp_with_project = db.query(Employee).options(joinedload(Employee.project)).filter(Employee.id == id).first()
    alloc = db.query(SeatAllocation).options(joinedload(SeatAllocation.seat)).filter(
        SeatAllocation.employee_id == id,
        SeatAllocation.allocation_status == AllocationStatus.ACTIVE
    ).first()
    return _build_employee_out(emp_with_project, {id: alloc} if alloc else {})

@router.delete("/{id}")
def delete_employee(id: int, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.id == id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db_emp.status = EmployeeStatus.INACTIVE
    db.commit()
    return {"detail": "Employee soft deleted"}
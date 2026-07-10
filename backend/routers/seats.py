from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import math
from database import get_db
from models import Seat, SeatStatus, SeatAllocation, AllocationStatus, Employee, EmployeeStatus
import schemas
from services.allocation_engine import suggest_seat
router = APIRouter()
@router.post("/", response_model=schemas.SeatOut)
def create_seat(seat: schemas.SeatCreate, db: Session = Depends(get_db)):
    existing = db.query(Seat).filter(
        Seat.floor == seat.floor,
        Seat.zone == seat.zone,
        Seat.seat_number == seat.seat_number
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Seat already exists")
        
    db_seat = Seat(**seat.model_dump())
    db.add(db_seat)
    db.commit()
    db.refresh(db_seat)
    return db_seat

@router.get("/", response_model=schemas.PaginatedResponse[schemas.SeatOut])
def get_seats(
    floor: Optional[int] = None,
    zone: Optional[str] = None,
    status: Optional[SeatStatus] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload

    query = db.query(Seat)
    if floor is not None:
        query = query.filter(Seat.floor == floor)
    if zone:
        query = query.filter(Seat.zone == zone)
    if status:
        query = query.filter(Seat.status == status)

    total = query.count()
    offset = (page - 1) * limit
    seats = query.offset(offset).limit(limit).all()

    # ONE query for all active allocations on this page
    seat_ids = [s.id for s in seats]
    allocations = (
        db.query(SeatAllocation)
        .options(
            joinedload(SeatAllocation.employee).joinedload(Employee.project)
        )
        .filter(
            SeatAllocation.seat_id.in_(seat_ids),
            SeatAllocation.allocation_status == AllocationStatus.ACTIVE
        )
        .all()
    )
    alloc_map = {a.seat_id: a for a in allocations}

    results = []
    for s in seats:
        alloc = alloc_map.get(s.id)
        results.append({
            "id": s.id,
            "floor": s.floor,
            "zone": s.zone,
            "bay": s.bay,
            "seat_number": s.seat_number,
            "status": s.status,
            "created_at": s.created_at,
            "allocated_employee_name": alloc.employee.name if alloc and alloc.employee else None,
            "allocated_employee_code": alloc.employee.employee_code if alloc and alloc.employee else None,
            "allocated_employee_id": alloc.employee.id if alloc and alloc.employee else None,
            "allocated_project_name": alloc.employee.project.name if alloc and alloc.employee and alloc.employee.project else None,
            "allocation_date": alloc.allocation_date if alloc else None,
        })

    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 1,
    }

@router.get("/available", response_model=List[schemas.SeatOut])
def get_available_seats(
    floor: Optional[int] = None,
    zone: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Seat).filter(Seat.status == SeatStatus.AVAILABLE)
    if floor is not None:
        query = query.filter(Seat.floor == floor)
    if zone:
        query = query.filter(Seat.zone == zone)
        
    seats = query.all()
    
    if project_id:
        project_zones = db.query(Seat.zone).join(SeatAllocation).filter(
            SeatAllocation.project_id == project_id,
            SeatAllocation.allocation_status == AllocationStatus.ACTIVE
        ).distinct().all()
        project_zones = [z[0] for z in project_zones]
        
        prioritized = [s for s in seats if s.zone in project_zones]
        others = [s for s in seats if s.zone not in project_zones]
        return prioritized + others
        
    return seats
@router.post("/allocate")
def allocate_seat(req: schemas.AllocateRequest, db: Session = Depends(get_db)):
    existing_alloc = db.query(SeatAllocation).filter(
        SeatAllocation.employee_id == req.employee_id,
        SeatAllocation.allocation_status == AllocationStatus.ACTIVE
    ).first()
    if existing_alloc:
        raise HTTPException(status_code=409, detail="Employee already has an active seat allocation")
        
    employee = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if not employee.project_id:
        raise HTTPException(status_code=400, detail="Employee must be assigned to a project first")
    seat_to_allocate = None
    if req.seat_id:
        seat_to_allocate = db.query(Seat).with_for_update().filter(Seat.id == req.seat_id).first()
        if not seat_to_allocate:
            raise HTTPException(status_code=404, detail="Seat not found")
        if seat_to_allocate.status != SeatStatus.AVAILABLE:
            raise HTTPException(status_code=409, detail="Seat is not available")
    else:
        suggested = suggest_seat(db, req.employee_id)
        seat_to_allocate = db.query(Seat).with_for_update().filter(Seat.id == suggested.id).first()
        if not seat_to_allocate or seat_to_allocate.status != SeatStatus.AVAILABLE:
            raise HTTPException(status_code=409, detail="Suggested seat is no longer available")
            
    alloc = SeatAllocation(
        employee_id=req.employee_id,
        seat_id=seat_to_allocate.id,
        project_id=employee.project_id,
        allocation_status=AllocationStatus.ACTIVE
    )
    db.add(alloc)
    
    seat_to_allocate.status = SeatStatus.OCCUPIED
    employee.status = EmployeeStatus.ACTIVE
    
    db.commit()
    return {"detail": "Seat allocated successfully", "seat_id": seat_to_allocate.id}
@router.post("/release")
def release_seat(req: schemas.ReleaseRequest, db: Session = Depends(get_db)):
    alloc = db.query(SeatAllocation).filter(
        SeatAllocation.employee_id == req.employee_id,
        SeatAllocation.allocation_status == AllocationStatus.ACTIVE
    ).first()
    
    if not alloc:
        raise HTTPException(status_code=404, detail="No active allocation found for employee")
        
    alloc.allocation_status = AllocationStatus.RELEASED
    alloc.released_date = datetime.now()
    
    seat = db.query(Seat).filter(Seat.id == alloc.seat_id).first()
    if seat:
        seat.status = SeatStatus.AVAILABLE
        
    db.commit()
    return {"detail": "Seat released successfully"}

@router.patch("/{seat_id}/status")
def update_seat_status(seat_id: int, payload: schemas.SeatStatusUpdate, db: Session = Depends(get_db)):
    seat = db.query(Seat).filter(Seat.id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
    seat.status = SeatStatus(payload.status)
    db.commit()
    return {"detail": "Seat status updated", "status": seat.status}

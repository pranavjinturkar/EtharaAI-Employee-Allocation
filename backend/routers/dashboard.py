from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from database import get_db
from models import Employee, EmployeeStatus, Seat, SeatStatus, Project, SeatAllocation, AllocationStatus
from cache import cache_response

router = APIRouter()

@router.get("/summary")
@cache_response("dashboard:summary", ttl=30)
def get_summary(db: Session = Depends(get_db)):
    total_employees = db.query(func.count(Employee.id)).scalar()
    total_seats = db.query(func.count(Seat.id)).scalar()
    
    occupied_seats = db.query(func.count(Seat.id)).filter(Seat.status == SeatStatus.OCCUPIED).scalar()
    available_seats = db.query(func.count(Seat.id)).filter(Seat.status == SeatStatus.AVAILABLE).scalar()
    reserved_seats = db.query(func.count(Seat.id)).filter(Seat.status == SeatStatus.RESERVED).scalar()
    maintenance_seats = db.query(func.count(Seat.id)).filter(Seat.status == SeatStatus.MAINTENANCE).scalar()
    
    pending_allocation_count = db.query(func.count(Employee.id)).filter(Employee.status == EmployeeStatus.PENDING_ALLOCATION).scalar()
    
    return {
        "total_employees": total_employees,
        "total_seats": total_seats,
        "occupied_seats": occupied_seats,
        "available_seats": available_seats,
        "reserved_seats": reserved_seats,
        "maintenance_seats": maintenance_seats,
        "pending_allocation_count": pending_allocation_count
    }

@router.get("/project-utilization")
@cache_response("dashboard:project-utilization", ttl=30)
def get_project_utilization(db: Session = Depends(get_db)):
    results = db.query(
        Project.name,
        func.count(SeatAllocation.id.distinct()).label("allocated_seats"),
        func.count(Employee.id.distinct()).label("total_employees")
    ).outerjoin(Employee, Project.id == Employee.project_id)\
     .outerjoin(SeatAllocation, (Project.id == SeatAllocation.project_id) & (SeatAllocation.allocation_status == AllocationStatus.ACTIVE))\
     .group_by(Project.name).all()
     
    return [
        {
            "project_name": row[0],
            "allocated_seats": row[1],
            "total_employees": row[2]
        }
        for row in results
    ]

@router.get("/floor-utilization")
@cache_response("dashboard:floor-utilization", ttl=30)
def get_floor_utilization(db: Session = Depends(get_db)):
    results = db.query(
        Seat.floor,
        func.count(Seat.id).label("total_seats"),
        func.sum(case((Seat.status == SeatStatus.OCCUPIED, 1), else_=0)).label("occupied_seats"),
        func.sum(case((Seat.status == SeatStatus.AVAILABLE, 1), else_=0)).label("available_seats")
    ).group_by(Seat.floor).all()
    
    return [
        {
            "floor": row[0],
            "total_seats": row[1],
            "occupied_seats": int(row[2]) if row[2] else 0,
            "available_seats": int(row[3]) if row[3] else 0
        }
        for row in results
    ]

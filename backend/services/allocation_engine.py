from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException

from models import Employee, SeatAllocation, AllocationStatus, Seat, SeatStatus, EmployeeStatus

def suggest_seat(db: Session, employee_id: int) -> Seat:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    project_id = employee.project_id
    if not project_id:
        raise HTTPException(status_code=400, detail="Employee must be assigned to a project")
        
    zone_stats = db.query(
        Seat.floor,
        Seat.zone,
        func.count(SeatAllocation.id).label("count")
    ).join(SeatAllocation, Seat.id == SeatAllocation.seat_id)\
    .filter(
        SeatAllocation.project_id == project_id,
        SeatAllocation.allocation_status == AllocationStatus.ACTIVE
    ).group_by(Seat.floor, Seat.zone).order_by(desc("count")).all()
    
    for stat in zone_stats:
        seat = db.query(Seat).filter(
            Seat.floor == stat.floor,
            Seat.zone == stat.zone,
            Seat.status == SeatStatus.AVAILABLE
        ).first()
        if seat:
            return seat
            
    if zone_stats:
        best_floor = zone_stats[0].floor
        seat = db.query(Seat).filter(
            Seat.floor == best_floor,
            Seat.status == SeatStatus.AVAILABLE
        ).first()
        if seat:
            return seat
            
    seat = db.query(Seat).filter(Seat.status == SeatStatus.AVAILABLE).first()
    if seat:
        return seat
        
    employee.status = EmployeeStatus.PENDING_ALLOCATION
    db.commit()
    raise HTTPException(status_code=409, detail="No seats available")

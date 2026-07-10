from datetime import date, datetime
from typing import Optional, List, TypeVar, Generic
from pydantic import BaseModel, ConfigDict
from models import EmployeeStatus, ProjectStatus, SeatStatus
T = TypeVar('T')
class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    limit: int
    total_pages: int
class EmployeeBase(BaseModel):
    name: str
    email: str
    department: str
    role: str
    joining_date: date
    project_id: Optional[int] = None
class EmployeeCreate(EmployeeBase):
    pass
class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    joining_date: Optional[date] = None
    project_id: Optional[int] = None
class SeatInfoOut(BaseModel):
    floor: int
    zone: str
    bay: str
    seat_number: str
class EmployeeOut(EmployeeBase):
    id: int
    employee_code: str
    status: EmployeeStatus
    created_at: datetime
    project_name: Optional[str] = None
    seat_info: Optional[SeatInfoOut] = None
    model_config = ConfigDict(from_attributes=True)
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    manager_name: Optional[str] = None
class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    manager_name: Optional[str] = None
    status: ProjectStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
class SeatCreate(BaseModel):
    floor: int
    zone: str
    bay: str
    seat_number: str
    status: SeatStatus = SeatStatus.AVAILABLE
class SeatOut(BaseModel):
    id: int
    floor: int
    zone: str
    bay: str
    seat_number: str
    status: SeatStatus
    created_at: datetime
    allocated_employee_name: Optional[str] = None
    allocated_employee_code: Optional[str] = None
    allocated_employee_id: Optional[int] = None
    allocated_project_name: Optional[str] = None
    allocation_date: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
class AllocateRequest(BaseModel):
    employee_id: int
    seat_id: Optional[int] = None
class ReleaseRequest(BaseModel):
    employee_id: int
class SeatStatusUpdate(BaseModel):
    status: str
class AIQueryRequest(BaseModel):
    query: str
    email: Optional[str] = None
class AIQueryResponse(BaseModel):
    answer: str

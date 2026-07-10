from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy import ForeignKey, String, Integer, DateTime, Date, Enum as SQLEnum, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base

class EmployeeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PENDING_ALLOCATION = "PENDING_ALLOCATION"

class ProjectStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class SeatStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    RESERVED = "RESERVED"
    MAINTENANCE = "MAINTENANCE"

class AllocationStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RELEASED = "RELEASED"

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    manager_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(SQLEnum(ProjectStatus), default=ProjectStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="project")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[EmployeeStatus] = mapped_column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="employees")
    allocations: Mapped[List["SeatAllocation"]] = relationship("SeatAllocation", back_populates="employee")

    __table_args__ = (
        Index("ix_employees_project_id", "project_id"),
        Index("ix_employees_status", "status"),
    )


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(primary_key=True)
    floor: Mapped[int] = mapped_column(Integer, nullable=False)
    zone: Mapped[str] = mapped_column(String, nullable=False)
    bay: Mapped[str] = mapped_column(String, nullable=False)
    seat_number: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[SeatStatus] = mapped_column(SQLEnum(SeatStatus), default=SeatStatus.AVAILABLE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    allocations: Mapped[List["SeatAllocation"]] = relationship("SeatAllocation", back_populates="seat")

    __table_args__ = (
        UniqueConstraint("floor", "zone", "seat_number", name="uq_seat_location"),
        Index("ix_seats_status", "status"),
        Index("ix_seats_floor_zone", "floor", "zone"),
    )


class SeatAllocation(Base):
    __tablename__ = "seat_allocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    allocation_status: Mapped[AllocationStatus] = mapped_column(SQLEnum(AllocationStatus), default=AllocationStatus.ACTIVE)
    allocation_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    released_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="allocations")
    seat: Mapped["Seat"] = relationship("Seat", back_populates="allocations")

    __table_args__ = (
        Index("ix_seat_allocations_emp_status", "employee_id", "allocation_status"),
        Index("ix_seat_allocations_seat_status", "seat_id", "allocation_status"),
    )

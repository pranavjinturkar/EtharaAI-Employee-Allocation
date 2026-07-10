import os
import sys
from datetime import date
from itertools import count
from typing import Optional

# Add backend directory to sys.path so tests can import our app modules directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite://")

from database import Base, get_db
from main import app
from models import Employee, EmployeeStatus


_counter = count(1)


@pytest.fixture()
def db_session():
    """Create all tables for one test, then drop them so tests stay isolated."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """Provide a TestClient that uses the in-memory SQLite test DB."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def make_project(client):
    """Create projects through the API and return response payloads."""

    def _make_project(name: Optional[str] = None):
        token = next(_counter)
        response = client.post(
            "/projects/",
            json={
                "name": name or f"Project {token}",
                "description": "Test project",
                "manager_name": "Test Manager",
            },
        )
        assert response.status_code == 200, response.text
        return response.json()

    return _make_project


@pytest.fixture()
def make_employee(client, make_project):
    """Create employees through the API and return response payloads."""

    def _make_employee(
        *,
        project_id: Optional[int] = None,
        name: Optional[str] = None,
        email: Optional[str] = None,
        department: str = "Engineering",
        role: str = "Backend Engineer",
    ):
        token = next(_counter)
        if project_id is None:
            project_id = make_project()["id"]

        response = client.post(
            "/employees/",
            json={
                "name": name or f"Test Employee {token}",
                "email": email or f"employee{token}@ethara.test",
                "department": department,
                "role": role,
                "joining_date": date.today().isoformat(),
                "project_id": project_id,
            },
        )
        assert response.status_code == 200, response.text
        return response.json()

    return _make_employee


@pytest.fixture()
def make_seat(client):
    """Create seats through the API and return response payloads."""

    def _make_seat(
        *,
        floor: Optional[int] = None,
        zone: str = "A",
        bay: str = "1",
        seat_number: Optional[str] = None,
        status: str = "AVAILABLE",
    ):
        token = next(_counter)
        response = client.post(
            "/seats/",
            json={
                "floor": floor if floor is not None else token,
                "zone": zone,
                "bay": bay,
                "seat_number": seat_number or f"{zone}{bay}-{token}",
                "status": status,
            },
        )
        assert response.status_code == 200, response.text
        return response.json()

    return _make_seat


@pytest.fixture()
def one_project(make_project):
    """Seed one project."""
    return make_project("Core Platform")


@pytest.fixture()
def one_employee(make_employee, one_project):
    """Seed one employee assigned to one_project."""
    return make_employee(project_id=one_project["id"], name="Amit Sharma", email="amit.sharma@ethara.test")


@pytest.fixture()
def one_seat(make_seat):
    """Seed one available seat."""
    return make_seat(floor=2, zone="B", bay="4", seat_number="B4-23")


@pytest.fixture()
def mark_employee_pending(db_session):
    """Mark an employee as pending allocation for allocation transition tests."""

    def _mark_employee_pending(employee_id: int):
        employee = db_session.query(Employee).filter(Employee.id == employee_id).first()
        assert employee is not None
        employee.status = EmployeeStatus.PENDING_ALLOCATION
        db_session.commit()
        return employee

    return _mark_employee_pending

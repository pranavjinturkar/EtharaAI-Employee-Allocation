import re

from models import AllocationStatus, SeatAllocation


def test_health_check(client):
    """Verifies the public health endpoint reports the API is running."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# Employee tests

def test_create_employee(client, one_project):
    """Verifies employees can be created with an auto-generated ETH employee code."""
    response = client.post(
        "/employees/",
        json={
            "name": "Priya Nair",
            "email": "priya.nair@ethara.test",
            "department": "Product",
            "role": "Product Manager",
            "joining_date": "2026-01-15",
            "project_id": one_project["id"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert re.fullmatch(r"ETH\d{5}", data["employee_code"])


def test_create_employee_duplicate_email(client, one_employee, one_project):
    """Verifies duplicate employee emails are rejected with HTTP 409."""
    response = client.post(
        "/employees/",
        json={
            "name": "Duplicate Email",
            "email": one_employee["email"],
            "department": "Engineering",
            "role": "Engineer",
            "joining_date": "2026-01-15",
            "project_id": one_project["id"],
        },
    )

    assert response.status_code == 409


def test_get_employees_pagination(client, one_employee):
    """Verifies GET /employees returns the paginated response contract."""
    response = client.get("/employees/", params={"page": 1, "limit": 10})

    assert response.status_code == 200
    data = response.json()
    assert {"data", "total", "page", "limit", "total_pages"} <= data.keys()
    assert data["page"] == 1
    assert data["limit"] == 10
    assert data["total"] >= 1
    assert any(employee["id"] == one_employee["id"] for employee in data["data"])


def test_get_employee_by_id(client, one_employee):
    """Verifies an employee can be fetched by the id returned from creation."""
    response = client.get(f"/employees/{one_employee['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == one_employee["id"]
    assert data["email"] == one_employee["email"]


def test_get_employee_not_found(client):
    """Verifies an unknown employee id returns HTTP 404."""
    response = client.get("/employees/99999")

    assert response.status_code == 404


def test_update_employee(client, one_employee):
    """Verifies employee updates persist changed department data."""
    response = client.put(
        f"/employees/{one_employee['id']}",
        json={"department": "Finance"},
    )

    assert response.status_code == 200
    assert response.json()["department"] == "Finance"


def test_delete_employee_soft(client, one_employee):
    """Verifies deleting an employee soft-deletes by setting status to INACTIVE."""
    delete_response = client.delete(f"/employees/{one_employee['id']}")
    get_response = client.get(f"/employees/{one_employee['id']}")

    assert delete_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "INACTIVE"


# Project tests

def test_create_project(client):
    """Verifies projects can be created successfully."""
    response = client.post(
        "/projects/",
        json={
            "name": "Talos",
            "description": "Workspace planning",
            "manager_name": "Asha Rao",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "Talos"


def test_create_project_duplicate_name(client, one_project):
    """Verifies duplicate project names are rejected with HTTP 409."""
    response = client.post(
        "/projects/",
        json={
            "name": one_project["name"],
            "description": "Duplicate",
            "manager_name": "Asha Rao",
        },
    )

    assert response.status_code == 409


def test_get_projects(client, one_project):
    """Verifies GET /projects returns active projects as a list."""
    response = client.get("/projects/")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(project["id"] == one_project["id"] for project in data)


def test_get_project_employees(client, one_project, one_employee):
    """Verifies project employee listing returns employees assigned to that project."""
    response = client.get(f"/projects/{one_project['id']}/employees")

    assert response.status_code == 200
    data = response.json()
    assert any(employee["id"] == one_employee["id"] for employee in data)


# Seat tests

def test_create_seat(client):
    """Verifies seats can be created successfully."""
    response = client.post(
        "/seats/",
        json={
            "floor": 7,
            "zone": "C",
            "bay": "2",
            "seat_number": "C2-17",
            "status": "AVAILABLE",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["seat_number"] == "C2-17"


def test_create_seat_duplicate(client, one_seat):
    """Verifies duplicate floor+zone+seat_number combinations are rejected with HTTP 409."""
    response = client.post(
        "/seats/",
        json={
            "floor": one_seat["floor"],
            "zone": one_seat["zone"],
            "bay": "99",
            "seat_number": one_seat["seat_number"],
            "status": "AVAILABLE",
        },
    )

    assert response.status_code == 409


def test_get_seats_paginated(client, one_seat):
    """Verifies GET /seats returns the paginated response contract."""
    response = client.get("/seats/", params={"page": 1, "limit": 10})

    assert response.status_code == 200
    data = response.json()
    assert {"data", "total", "page", "limit", "total_pages"} <= data.keys()
    assert any(seat["id"] == one_seat["id"] for seat in data["data"])


def test_get_available_seats(client, make_seat):
    """Verifies GET /seats/available returns only seats with AVAILABLE status."""
    available_seat = make_seat(status="AVAILABLE")
    occupied_seat = make_seat(status="OCCUPIED")
    response = client.get("/seats/available")

    assert response.status_code == 200
    data = response.json()
    seat_ids = {seat["id"] for seat in data}
    assert available_seat["id"] in seat_ids
    assert occupied_seat["id"] not in seat_ids
    assert all(seat["status"] == "AVAILABLE" for seat in data)


# Allocation business rules

def test_allocate_seat_success(client, one_employee, one_seat, mark_employee_pending):
    """Business Rules 1 and 2: allocating an available seat succeeds and activates the employee."""
    mark_employee_pending(one_employee["id"])
    response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": one_seat["id"]},
    )
    seat_response = client.get("/seats/", params={"status": "OCCUPIED"})
    employee_response = client.get(f"/employees/{one_employee['id']}")

    assert response.status_code == 200
    assert response.json()["seat_id"] == one_seat["id"]
    assert any(seat["id"] == one_seat["id"] for seat in seat_response.json()["data"])
    assert employee_response.json()["status"] == "ACTIVE"


def test_allocate_seat_already_occupied(client, one_employee, make_seat):
    """Business Rule 2: allocating an already OCCUPIED seat returns HTTP 409."""
    occupied_seat = make_seat(status="OCCUPIED")
    response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": occupied_seat["id"]},
    )

    assert response.status_code == 409


def test_allocate_seat_employee_already_has_seat(client, one_employee, make_seat):
    """Business Rules 1 and 2: an employee cannot hold two active seat allocations."""
    first_seat = make_seat()
    second_seat = make_seat()
    first_response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": first_seat["id"]},
    )
    second_response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": second_seat["id"]},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 409


def test_release_seat_success(client, one_employee, one_seat, db_session):
    """Business Rule 3: releasing a seat makes it AVAILABLE and marks the allocation RELEASED."""
    allocate_response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": one_seat["id"]},
    )
    release_response = client.post("/seats/release", json={"employee_id": one_employee["id"]})
    available_response = client.get("/seats/available")
    allocation = (
        db_session.query(SeatAllocation)
        .filter(SeatAllocation.employee_id == one_employee["id"], SeatAllocation.seat_id == one_seat["id"])
        .first()
    )

    assert allocate_response.status_code == 200
    assert release_response.status_code == 200
    assert any(seat["id"] == one_seat["id"] for seat in available_response.json())
    assert allocation.allocation_status == AllocationStatus.RELEASED


def test_allocate_reserved_seat_fails(client, one_employee, make_seat):
    """Business Rule 4: RESERVED seats cannot be allocated."""
    reserved_seat = make_seat(status="RESERVED")
    response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": reserved_seat["id"]},
    )

    assert response.status_code == 409


def test_release_no_active_allocation(client, one_employee):
    """Business Rule 3: releasing without an active allocation returns HTTP 404."""
    response = client.post("/seats/release", json={"employee_id": one_employee["id"]})

    assert response.status_code == 404


# Dashboard tests

def test_dashboard_summary(client, one_employee, one_seat):
    """Verifies dashboard summary returns the required aggregate fields."""
    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    data = response.json()
    assert {
        "total_employees",
        "total_seats",
        "occupied_seats",
        "available_seats",
        "reserved_seats",
        "pending_allocation_count",
    } <= data.keys()


def test_dashboard_project_utilization(client, one_employee, one_seat):
    """Verifies project utilization includes project_name and allocated_seats fields."""
    client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": one_seat["id"]},
    )
    response = client.get("/dashboard/project-utilization")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data
    assert {"project_name", "allocated_seats"} <= data[0].keys()


def test_dashboard_floor_utilization(client, one_employee, one_seat):
    """Verifies floor utilization includes floor, total_seats, and occupied_seats fields."""
    client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": one_seat["id"]},
    )
    response = client.get("/dashboard/floor-utilization")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data
    assert {"floor", "total_seats", "occupied_seats"} <= data[0].keys()


# AI Assistant tests

def test_ai_query_seat_lookup(client, one_employee, one_seat):
    """Verifies the fallback AI assistant answers employee seat lookup questions."""
    allocate_response = client.post(
        "/seats/allocate",
        json={"employee_id": one_employee["id"], "seat_id": one_seat["id"]},
    )
    response = client.post(
        "/ai/query",
        json={
            "query": f"Where is {one_employee['name']} seated?",
            "email": one_employee["email"],
        },
    )

    assert allocate_response.status_code == 200
    assert response.status_code == 200
    answer = response.json()["answer"]
    assert "Floor 2" in answer
    assert "Zone B" in answer
    assert "Seat B4-23" in answer


def test_ai_query_unknown(client):
    """Verifies unrecognized AI assistant queries return a helpful fallback instead of HTTP 500."""
    response = client.post("/ai/query", json={"query": "purple banana spreadsheet vortex"})

    assert response.status_code == 200
    answer = response.json()["answer"]
    assert answer
    assert "Try" in answer or "couldn't understand" in answer

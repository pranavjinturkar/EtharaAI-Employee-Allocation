import random
from datetime import datetime, timedelta
from faker import Faker
from sqlalchemy import text
from database import SessionLocal
from models import Employee, Project, Seat, SeatAllocation, EmployeeStatus, ProjectStatus, SeatStatus, AllocationStatus

fake = Faker()

def clear_data(db):
    print("Clearing existing data...")
    db.execute(text("DELETE FROM seat_allocations"))
    db.execute(text("DELETE FROM seats"))
    db.execute(text("DELETE FROM employees"))
    db.execute(text("DELETE FROM projects"))
    db.commit()
    print("Cleared.")

def seed_data():
    db = SessionLocal()
    try:
        clear_data(db)

        # 1. Projects
        print("Creating projects...")
        project_names = [
            "Indigo", "Indreed", "Mydreed", "Preed", "Serfy",
            "Oreed", "bedegreed", "Opreed", "Serry", "Kaary", "Mered"
        ]
        projects = [Project(name=name, status=ProjectStatus.ACTIVE) for name in project_names]
        db.add_all(projects)
        db.commit()

        project_ids = [p.id for p in db.query(Project).all()]
        print(f"  {len(project_ids)} projects created.")

        # 2. Seats — 5 floors x 10 zones x 5 bays x 23 seats = 5,750
        print("Creating seats...")
        zones = list("ABCDEFGHIJ")
        seats = []
        for floor in range(1, 6):
            for zone in zones:
                for bay in range(1, 6):
                    for seat_num in range(1, 24):  # 23 seats per bay
                        seats.append(Seat(
                            floor=floor,
                            zone=zone,
                            bay=str(bay),
                            seat_number=f"{zone}{bay}-{seat_num}",
                            status=SeatStatus.AVAILABLE
                        ))

        # Mark exactly 100 as RESERVED
        for idx in random.sample(range(len(seats)), 100):
            seats[idx].status = SeatStatus.RESERVED

        # Batch insert seats
        for i in range(0, len(seats), 500):
            db.add_all(seats[i:i + 500])
            db.commit()
        print(f"  {len(seats)} seats created.")

        # 3. Employees — 4,950 active + 50 pending = 5,000
        print("Creating employees...")
        departments = ["Engineering", "HR", "Sales", "Marketing", "Finance", "Product", "Design"]
        two_years_ago = datetime.now() - timedelta(days=730)
        employees = []

        for i in range(1, 5001):
            is_pending = i > 4950
            employees.append(Employee(
                employee_code=f"ETH{i:05d}",
                name=fake.name(),
                email=f"eth{i:05d}@ethara.local",
                department=random.choice(departments),
                role=fake.job(),
                joining_date=fake.date_between(start_date=two_years_ago, end_date="today"),
                project_id=None if is_pending else project_ids[(i - 1) % len(project_ids)],
                status=EmployeeStatus.PENDING_ALLOCATION if is_pending else EmployeeStatus.ACTIVE,
            ))

        for i in range(0, len(employees), 500):
            db.add_all(employees[i:i + 500])
            db.commit()
        print(f"  {len(employees)} employees created.")

        # 4. Allocations — single SQL operation, no Python loop
        print("Creating allocations...")

        db.execute(text("""
            WITH ranked_employees AS (
                SELECT id, project_id, ROW_NUMBER() OVER (ORDER BY id) as rn
                FROM employees
                WHERE status = 'ACTIVE'
            ),
            ranked_seats AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY random()) as rn
                FROM seats
                WHERE status = 'AVAILABLE'
            ),
            paired AS (
                SELECT e.id as employee_id, e.project_id, s.id as seat_id
                FROM ranked_employees e
                JOIN ranked_seats s ON e.rn = s.rn
            )
            INSERT INTO seat_allocations
                (employee_id, seat_id, project_id, allocation_status, allocation_date, released_date)
            SELECT
                employee_id, seat_id, project_id, 'ACTIVE', NOW(), NULL
            FROM paired
        """))

        # One update to flip all allocated seats to OCCUPIED
        db.execute(text("""
            UPDATE seats SET status = 'OCCUPIED'
            WHERE id IN (
                SELECT seat_id FROM seat_allocations WHERE allocation_status = 'ACTIVE'
            )
        """))

        db.commit()
        print("  Allocations done.")

        # Summary
        print("\nDone! Summary:")
        print(f"  Projects:         {db.execute(text('SELECT COUNT(*) FROM projects')).scalar()}")
        print(f"  Seats total:      {db.execute(text('SELECT COUNT(*) FROM seats')).scalar()}")
        print(f"""  Seats AVAILABLE:  {db.execute(text("SELECT COUNT(*) FROM seats WHERE status = 'AVAILABLE'")).scalar()}""")
        print(f"""  Seats OCCUPIED:   {db.execute(text("SELECT COUNT(*) FROM seats WHERE status = 'OCCUPIED'")).scalar()}""")
        print(f"""  Seats RESERVED:   {db.execute(text("SELECT COUNT(*) FROM seats WHERE status = 'RESERVED'")).scalar()}""")
        print(f"  Employees total:  {db.execute(text('SELECT COUNT(*) FROM employees')).scalar()}")
        print(f"""  Employees PENDING:{db.execute(text("SELECT COUNT(*) FROM employees WHERE status = 'PENDING_ALLOCATION'")).scalar()}""")
        print(f"  Allocations:      {db.execute(text('SELECT COUNT(*) FROM seat_allocations')).scalar()}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
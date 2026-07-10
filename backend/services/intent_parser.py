import re
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import AllocationStatus, Employee, Project, Seat, SeatAllocation, SeatStatus


EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
EMPLOYEE_CODE_RE = re.compile(r"\beth\d{5}\b", re.IGNORECASE)


def _clean(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = value.strip().lower()
    return value or None


def _extract_email(query: str, email: Optional[str]) -> Optional[str]:
    """Prefer the explicit request field, then support natural text like 'my email is ...'."""
    explicit_email = _clean(email)
    if explicit_email:
        return explicit_email

    match = EMAIL_RE.search(query)
    return _clean(match.group(0)) if match else None


def _word_in_query(word: str, query_lower: str) -> bool:
    return bool(re.search(rf"\b{re.escape(word.lower())}\b", query_lower))


def _format_seat(seat: Seat) -> str:
    return f"Floor {seat.floor}, Zone {seat.zone}, Bay {seat.bay}, Seat {seat.seat_number}"


def _plural(count: int, singular: str, plural: Optional[str] = None) -> str:
    return singular if count == 1 else plural or f"{singular}s"


def _format_location_phrase(location_parts, default: str) -> str:
    if not location_parts:
        return default

    prefix = "on" if location_parts[0].startswith("Floor ") else "in"
    return f" {prefix} {', '.join(location_parts)}"


def _active_allocation(db: Session, employee_id: int) -> Optional[SeatAllocation]:
    return (
        db.query(SeatAllocation)
        .filter(
            SeatAllocation.employee_id == employee_id,
            SeatAllocation.allocation_status == AllocationStatus.ACTIVE,
        )
        .first()
    )


def _context_employee(db: Session, query: str, email: Optional[str]) -> Optional[Employee]:
    resolved_email = _extract_email(query, email)
    if not resolved_email:
        return None

    return db.query(Employee).filter(func.lower(Employee.email) == resolved_email).first()


def _query_points_to_self(query_lower: str) -> bool:
    return bool(re.search(r"\b(my|me|i|mine)\b", query_lower))


def find_employee_in_query(db: Session, query_lower: str, ctx_emp: Optional[Employee] = None):
    """Resolve an employee by email, employee code, full name, or useful name fragments."""
    email_match = EMAIL_RE.search(query_lower)
    if email_match:
        emp = db.query(Employee).filter(func.lower(Employee.email) == email_match.group(0).lower()).first()
        if emp:
            return emp

    code_match = EMPLOYEE_CODE_RE.search(query_lower)
    if code_match:
        emp = (
            db.query(Employee)
            .filter(func.lower(Employee.employee_code) == code_match.group(0).lower())
            .first()
        )
        if emp:
            return emp

    best_emp = None
    best_score = 0

    for emp in db.query(Employee).all():
        score = 0
        name = emp.name.lower()
        code = emp.employee_code.lower()
        email = emp.email.lower()

        if email in query_lower:
            score += 120
        if _word_in_query(code, query_lower):
            score += 110
        if re.search(rf"\b{re.escape(name)}\b", query_lower):
            score += 90

        for part in re.findall(r"[a-z0-9]+", name):
            if len(part) > 2 and _word_in_query(part, query_lower):
                score += 35

        if score > best_score:
            best_emp = emp
            best_score = score

    if best_emp:
        return best_emp

    return ctx_emp if ctx_emp and _query_points_to_self(query_lower) else None


def _find_project_in_query(db: Session, query_lower: str) -> Optional[Project]:
    projects = db.query(Project).all()
    best_project = None
    best_score = 0

    for project in projects:
        project_name = project.name.lower()
        score = 0

        if re.search(rf"\b{re.escape(project_name)}\b", query_lower):
            score += 100

        for part in re.findall(r"[a-z0-9]+", project_name):
            if len(part) > 2 and _word_in_query(part, query_lower):
                score += 25

        if score > best_score:
            best_project = project
            best_score = score

    return best_project


def _extract_floor(query_lower: str) -> Optional[int]:
    floor_match = re.search(r"(?:floor\s*)(\d+)|(\d+)(?:st|nd|rd|th)\s*floor", query_lower)
    if not floor_match:
        return None
    return int(floor_match.group(1) or floor_match.group(2))


def _extract_zone(query_lower: str) -> Optional[str]:
    zone_match = re.search(r"\bzone\s+([a-z])\b", query_lower)
    return zone_match.group(1).upper() if zone_match else None


def _extract_bay(query_lower: str) -> Optional[str]:
    bay_match = re.search(r"\bbay\s+([a-z0-9-]+)\b", query_lower)
    return bay_match.group(1).upper() if bay_match else None


def _classify_intent(query_lower: str) -> Optional[str]:
    has_available_word = any(word in query_lower for word in ["available", "free", "empty", "vacant", "open"])
    has_neighbor_word = any(
        phrase in query_lower
        for phrase in ["near me", "nearby", "next to", "neighbor", "neighbour", "around me"]
    )
    has_count_word = any(
        phrase in query_lower
        for phrase in ["how many", "count", "utilization", "utilisation", "occupied", "usage", "capacity"]
    )
    has_project_word = any(word in query_lower for word in ["project", "team"])
    has_location_word = any(
        word in query_lower for word in ["where", "located", "location", "seated", "sitting", "sit", "floor", "zone"]
    )
    has_assignment_word = any(
        phrase in query_lower for phrase in ["assigned", "assignment", "working on", "works on", "project"]
    )
    has_seat_word = any(word in query_lower for word in ["seat", "seated", "sitting", "located", "where", "floor"])

    if has_available_word:
        return "AVAILABLE_SEATS"
    if has_neighbor_word or "who sits near" in query_lower or "who is near" in query_lower:
        return "TEAM_NEARBY"
    if has_count_word:
        return "SEAT_UTILIZATION"
    if has_project_word and has_location_word:
        return "TEAM_LOCATION"
    if has_assignment_word:
        return "PROJECT_LOOKUP"
    if has_seat_word:
        return "SEAT_LOOKUP"
    return None


def _answer_seat_lookup(db: Session, query_lower: str, ctx_emp: Optional[Employee]) -> str:
    target_emp = find_employee_in_query(db, query_lower, ctx_emp)

    if not target_emp:
        return "I couldn't identify the employee. Please include their name, email, or employee code."

    alloc = _active_allocation(db, target_emp.id)
    if not alloc:
        return f"{target_emp.name} does not have an active seat allocation yet."

    project_name = target_emp.project.name if target_emp.project else "No Project"
    if ctx_emp and target_emp.id == ctx_emp.id and _query_points_to_self(query_lower):
        return f"You are allocated {_format_seat(alloc.seat)}. Your project is {project_name}."

    return (
        f"{target_emp.name} is seated on {_format_seat(alloc.seat)}. "
        f"They are assigned to Project {project_name}."
    )


def _answer_project_lookup(db: Session, query_lower: str, ctx_emp: Optional[Employee]) -> str:
    target_emp = find_employee_in_query(db, query_lower, ctx_emp)

    if not target_emp:
        project = _find_project_in_query(db, query_lower)
        if project:
            employee_count = db.query(Employee).filter(Employee.project_id == project.id).count()
            return f"Project {project.name} has {employee_count} assigned employees."
        return "I couldn't identify the employee or project. Please include a name, email, employee code, or project name."

    if target_emp.project:
        return f"{target_emp.name} is assigned to Project {target_emp.project.name}."
    return f"{target_emp.name} is not currently assigned to any project."


def _answer_available_seats(db: Session, query_lower: str) -> str:
    target_floor = _extract_floor(query_lower)
    target_zone = _extract_zone(query_lower)
    target_bay = _extract_bay(query_lower)

    q = db.query(Seat).filter(Seat.status == SeatStatus.AVAILABLE)
    location_parts = []

    if target_floor is not None:
        q = q.filter(Seat.floor == target_floor)
        location_parts.append(f"Floor {target_floor}")
    if target_zone is not None:
        q = q.filter(Seat.zone == target_zone)
        location_parts.append(f"Zone {target_zone}")
    if target_bay is not None:
        q = q.filter(Seat.bay == target_bay)
        location_parts.append(f"Bay {target_bay}")

    count = q.count()
    location = _format_location_phrase(location_parts, " across all floors")
    examples = q.order_by(Seat.floor, Seat.zone, Seat.bay, Seat.seat_number).limit(5).all()

    if not examples:
        return f"There are 0 available seats{location}."

    example_text = ", ".join(_format_seat(seat) for seat in examples)
    return f"There are {count} available {_plural(count, 'seat')}{location}. First available: {example_text}."


def _answer_nearby(db: Session, query_lower: str, ctx_emp: Optional[Employee]) -> str:
    target_emp = find_employee_in_query(db, query_lower, ctx_emp)
    if not target_emp:
        return "Please include your email, name, or employee code so I can find who is seated near you."

    alloc = _active_allocation(db, target_emp.id)
    if not alloc:
        return f"{target_emp.name} does not have an active seat allocation yet."

    neighbors = (
        db.query(Employee)
        .join(SeatAllocation, SeatAllocation.employee_id == Employee.id)
        .join(Seat, Seat.id == SeatAllocation.seat_id)
        .filter(
            SeatAllocation.allocation_status == AllocationStatus.ACTIVE,
            Seat.floor == alloc.seat.floor,
            Seat.zone == alloc.seat.zone,
            Employee.id != target_emp.id,
        )
        .order_by(Employee.name)
        .limit(10)
        .all()
    )

    if not neighbors:
        return f"No one else is seated in Zone {alloc.seat.zone} on Floor {alloc.seat.floor}."

    names = ", ".join(n.name for n in neighbors)
    if ctx_emp and target_emp.id == ctx_emp.id and _query_points_to_self(query_lower):
        return f"People seated near you in Zone {alloc.seat.zone}, Floor {alloc.seat.floor}: {names}."
    return f"People seated near {target_emp.name} in Zone {alloc.seat.zone}, Floor {alloc.seat.floor}: {names}."


def _answer_team_location(db: Session, query_lower: str, ctx_emp: Optional[Employee]) -> str:
    project = _find_project_in_query(db, query_lower)

    if not project:
        target_emp = find_employee_in_query(db, query_lower, ctx_emp)
        project = target_emp.project if target_emp and target_emp.project else None

    if not project:
        return "I couldn't identify the team or project. Please include a project name or an employee from that team."

    locations = (
        db.query(Seat.floor, Seat.zone, func.count(SeatAllocation.id).label("seat_count"))
        .join(SeatAllocation, SeatAllocation.seat_id == Seat.id)
        .filter(
            SeatAllocation.project_id == project.id,
            SeatAllocation.allocation_status == AllocationStatus.ACTIVE,
        )
        .group_by(Seat.floor, Seat.zone)
        .order_by(func.count(SeatAllocation.id).desc(), Seat.floor, Seat.zone)
        .limit(5)
        .all()
    )

    if not locations:
        return f"Project {project.name} does not have active seat allocations yet."

    location_text = ", ".join(
        f"Floor {floor}, Zone {zone} ({seat_count} seats)" for floor, zone, seat_count in locations
    )
    return f"Project {project.name} is mainly seated in: {location_text}."


def _answer_utilization(db: Session, query_lower: str) -> str:
    project = _find_project_in_query(db, query_lower)
    target_floor = _extract_floor(query_lower)
    target_zone = _extract_zone(query_lower)

    if project:
        active_allocations = (
            db.query(SeatAllocation)
            .filter(
                SeatAllocation.project_id == project.id,
                SeatAllocation.allocation_status == AllocationStatus.ACTIVE,
            )
            .count()
        )
        assigned_employees = db.query(Employee).filter(Employee.project_id == project.id).count()
        return (
            f"Project {project.name} currently uses {active_allocations} seats "
            f"for {assigned_employees} assigned employees."
        )

    seat_query = db.query(Seat)
    location_parts = []
    if target_floor is not None:
        seat_query = seat_query.filter(Seat.floor == target_floor)
        location_parts.append(f"Floor {target_floor}")
    if target_zone is not None:
        seat_query = seat_query.filter(Seat.zone == target_zone)
        location_parts.append(f"Zone {target_zone}")

    total = seat_query.count()
    occupied = seat_query.filter(Seat.status == SeatStatus.OCCUPIED).count()
    available = seat_query.filter(Seat.status == SeatStatus.AVAILABLE).count()
    reserved = seat_query.filter(Seat.status == SeatStatus.RESERVED).count()
    maintenance = seat_query.filter(Seat.status == SeatStatus.MAINTENANCE).count()
    utilization = round((occupied / total) * 100, 1) if total else 0
    location = _format_location_phrase(location_parts, " overall")

    return (
        f"Seat utilization{location}: {occupied}/{total} occupied ({utilization}%). "
        f"Available: {available}, reserved: {reserved}, maintenance: {maintenance}."
    )


def parse_and_answer(db: Session, query: str, email: Optional[str]) -> str:
    query = query.strip()
    query_lower = query.lower()

    if not query:
        return "Ask me about an employee seat, project assignment, available seats, team location, or seat utilization."

    ctx_emp = _context_employee(db, query, email)
    intent = _classify_intent(query_lower)

    if intent == "SEAT_LOOKUP":
        return _answer_seat_lookup(db, query_lower, ctx_emp)
    if intent == "PROJECT_LOOKUP":
        return _answer_project_lookup(db, query_lower, ctx_emp)
    if intent == "AVAILABLE_SEATS":
        return _answer_available_seats(db, query_lower)
    if intent == "TEAM_NEARBY":
        return _answer_nearby(db, query_lower, ctx_emp)
    if intent == "TEAM_LOCATION":
        return _answer_team_location(db, query_lower, ctx_emp)
    if intent == "SEAT_UTILIZATION":
        return _answer_utilization(db, query_lower)

    return (
        "I couldn't understand your question. Try: 'Where is ETH00001 seated?', "
        "'Where is my seat? My email is eth00001@ethara.local', "
        "'Show available seats on Floor 3', or 'How many seats does Project Indigo have?'"
    )

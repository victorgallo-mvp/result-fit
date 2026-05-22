from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.common import serialize_doc

DAY_MAP = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


async def mark_attendance(student_id: str, mark_date: date, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    mark_dt = datetime.combine(mark_date, datetime.min.time())
    existing = await db.attendances.find_one({
        "student_id": ObjectId(student_id),
        "date": mark_dt,
    })
    if existing:
        return serialize_doc(existing)

    doc = {
        "tenant_id": ObjectId(tenant_id),
        "student_id": ObjectId(student_id),
        "user_id": ObjectId(user_id),
        "date": mark_dt,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.attendances.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def unmark_attendance(student_id: str, mark_date: date, tenant_id: str, user_id: str):
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    mark_dt = datetime.combine(mark_date, datetime.min.time())
    result = await db.attendances.delete_one({
        "student_id": ObjectId(student_id),
        "date": mark_dt,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presença não encontrada")


async def get_today_list(tenant_id: str, user_id: str) -> list:
    db = get_db()
    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    today_weekday = today.weekday()  # 0=mon

    weekday_to_str = {v: k for k, v in DAY_MAP.items()}
    today_str = weekday_to_str[today_weekday]

    students = await db.students.find({
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
        "status": "active",
        "training_days": today_str,
    }).sort("name", 1).to_list(length=500)

    if not students:
        return []

    student_ids = [s["_id"] for s in students]
    attendances = await db.attendances.find({
        "student_id": {"$in": student_ids},
        "date": today_dt,
    }).to_list(length=500)
    marked_set = {str(a["student_id"]) for a in attendances}

    plans_ids = list({s["plan_id"] for s in students if s.get("plan_id")})
    plans = {}
    if plans_ids:
        async for p in db.plans.find({"_id": {"$in": plans_ids}}):
            plans[p["_id"]] = p

    result = []
    for s in students:
        doc = serialize_doc(s)
        doc["marked"] = str(s["_id"]) in marked_set
        plan = plans.get(s.get("plan_id"))
        doc["plan"] = serialize_doc(plan) if plan else None

        if s.get("birthday"):
            b = s["birthday"]
            doc["birthday_today"] = (b.month == today.month and b.day == today.day)
        else:
            doc["birthday_today"] = False

        result.append(doc)
    return result


async def get_attendance_stats(student_id: str, tenant_id: str, user_id: str, year: int, month: int) -> dict:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    import calendar
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    today = date.today()
    if last_day > today:
        last_day = today

    training_days = set(student.get("training_days", []))
    expected_dates = []
    current = first_day
    day_str = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}
    while current <= last_day:
        if day_str[current.weekday()] in training_days:
            expected_dates.append(current)
        current = current + timedelta(days=1)

    expected = len(expected_dates)

    start_dt = datetime.combine(first_day, datetime.min.time())
    end_dt = datetime.combine(last_day, datetime.min.time())
    attended = await db.attendances.count_documents({
        "student_id": ObjectId(student_id),
        "date": {"$gte": start_dt, "$lte": end_dt},
    })

    faltas = max(0, expected - attended)
    rate = round((attended / expected * 100), 1) if expected > 0 else 0.0

    return {"expected": expected, "attended": attended, "faltas": faltas, "rate": rate}


async def get_student_attendances_month(student_id: str, tenant_id: str, user_id: str, year: int, month: int) -> list:
    db = get_db()
    import calendar
    first_day = datetime(year, month, 1)
    last_day = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)

    docs = await db.attendances.find({
        "student_id": ObjectId(student_id),
        "date": {"$gte": first_day, "$lte": last_day},
    }).sort("date", 1).to_list(length=100)
    return [serialize_doc(d) for d in docs]

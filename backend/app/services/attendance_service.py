from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.common import serialize_doc


async def mark_attendance(student_id: str, mark_date: date) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
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
        "student_id": ObjectId(student_id),
        "date": mark_dt,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.attendances.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def unmark_attendance(student_id: str, mark_date: date):
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    mark_dt = datetime.combine(mark_date, datetime.min.time())
    result = await db.attendances.delete_one({
        "student_id": ObjectId(student_id),
        "date": mark_dt,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presença não encontrada")


async def get_today_list() -> list:
    db = get_db()
    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())

    students = await db.students.find({
        "status": "active",
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


async def get_attendance_stats(student_id: str, year: int, month: int) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    import calendar
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    today = date.today()
    if last_day > today:
        last_day = today

    days_in_period = (last_day - first_day).days + 1
    weekly_frequency = student.get("weekly_frequency", 3)
    expected = round(days_in_period / 7 * weekly_frequency)

    start_dt = datetime.combine(first_day, datetime.min.time())
    end_dt = datetime.combine(last_day, datetime.min.time())
    attended = await db.attendances.count_documents({
        "student_id": ObjectId(student_id),
        "date": {"$gte": start_dt, "$lte": end_dt},
    })

    faltas = max(0, expected - attended)
    rate = round(attended / expected * 100, 1) if expected > 0 else 0.0

    return {"expected": expected, "attended": attended, "faltas": faltas, "rate": rate}


async def get_month_attendance_list(year: int, month: int) -> list:
    import calendar as cal
    db = get_db()

    first_day = date(year, month, 1)
    last_day = date(year, month, cal.monthrange(year, month)[1])
    first_dt = datetime.combine(first_day, datetime.min.time())
    last_dt = datetime.combine(last_day, datetime.max.time())
    today = date.today()
    cutoff = min(last_day, today)

    students = await db.students.find(
        {"status": "active"},
        {"_id": 1, "name": 1, "weekly_frequency": 1},
    ).sort("name", 1).to_list(500)

    if not students:
        return []

    student_ids = [s["_id"] for s in students]
    att_docs = await db.attendances.find({
        "student_id": {"$in": student_ids},
        "date": {"$gte": first_dt, "$lte": last_dt},
    }).to_list(10000)

    att_map: dict = {}
    for a in att_docs:
        sid = a["student_id"]
        d = a["date"]
        ds = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
        att_map.setdefault(sid, set()).add(ds)

    days_in_period = (cutoff - first_day).days + 1

    result = []
    for s in students:
        weekly_frequency = s.get("weekly_frequency", 3)
        expected = round(days_in_period / 7 * weekly_frequency)
        attended_set = att_map.get(s["_id"], set())
        attended = len(attended_set)
        result.append({
            "id": str(s["_id"]),
            "name": s.get("name", ""),
            "weekly_frequency": weekly_frequency,
            "attended": attended,
            "expected": expected,
        })
    return result


async def get_student_attendances_month(student_id: str, year: int, month: int) -> list:
    db = get_db()
    import calendar
    first_day = datetime(year, month, 1)
    last_day = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)

    docs = await db.attendances.find({
        "student_id": ObjectId(student_id),
        "date": {"$gte": first_day, "$lte": last_day},
    }).sort("date", 1).to_list(length=100)
    return [serialize_doc(d) for d in docs]

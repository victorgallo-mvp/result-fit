from datetime import datetime, date, timedelta
from bson import ObjectId
from app.database import get_db
from app.models.common import serialize_doc


async def get_summary(tenant_id: str, user_id: str) -> dict:
    db = get_db()
    tid = ObjectId(tenant_id)
    uid = ObjectId(user_id)

    today = date.today()
    in_7 = today + timedelta(days=7)
    first_month = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
    last_month = datetime.combine(today, datetime.max.time())
    today_dt = datetime.combine(today, datetime.min.time())
    in_7_dt = datetime.combine(in_7, datetime.min.time())

    active_count = await db.students.count_documents({
        "tenant_id": tid, "assigned_to": uid, "status": "active"
    })

    student_ids = [
        s["_id"] async for s in db.students.find(
            {"tenant_id": tid, "assigned_to": uid, "status": "active"}, {"_id": 1}
        )
    ]

    vencendo = await db.payments.count_documents({
        "student_id": {"$in": student_ids},
        "status": "pending",
        "due_date": {"$gte": today_dt, "$lte": in_7_dt},
    })

    vencidas = await db.payments.count_documents({
        "student_id": {"$in": student_ids},
        "status": {"$in": ["pending", "overdue"]},
        "due_date": {"$lt": today_dt},
    })

    paid_docs = await db.payments.find({
        "student_id": {"$in": student_ids},
        "status": "paid",
        "paid_at": {"$gte": first_month, "$lte": last_month},
    }, {"amount": 1}).to_list(length=500)
    faturamento = sum(d["amount"] for d in paid_docs)

    # attendance rate for current month
    first_day = date(today.year, today.month, 1)
    first_dt = datetime.combine(first_day, datetime.min.time())
    last_dt = datetime.combine(today, datetime.max.time())

    attended_count = await db.attendances.count_documents({
        "student_id": {"$in": student_ids},
        "date": {"$gte": first_dt, "$lte": last_dt},
    })

    from datetime import timedelta
    day_str_map = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}
    total_expected = 0
    for s_id in student_ids:
        s = await db.students.find_one({"_id": s_id}, {"training_days": 1})
        if not s:
            continue
        training = set(s.get("training_days", []))
        current = first_day
        while current <= today:
            if day_str_map[current.weekday()] in training:
                total_expected += 1
            current = current + timedelta(days=1)

    taxa = round(attended_count / total_expected * 100, 1) if total_expected > 0 else 0.0

    return {
        "total_alunos_ativos": active_count,
        "mensalidades_vencendo": vencendo,
        "mensalidades_vencidas": vencidas,
        "faturamento_mes": faturamento,
        "taxa_frequencia_media": taxa,
    }

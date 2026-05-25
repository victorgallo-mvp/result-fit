import asyncio
from datetime import datetime, date, timedelta
from bson import ObjectId
from app.database import get_db
from app.models.common import serialize_doc


async def get_dashboard(tenant_id: str, user_id: str) -> dict:
    db = get_db()
    tid = ObjectId(tenant_id)
    uid = ObjectId(user_id)

    today = date.today()
    in_3 = today + timedelta(days=3)
    first_month_dt = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
    today_dt = datetime.combine(today, datetime.min.time())
    in_3_dt = datetime.combine(in_3, datetime.min.time())
    last_dt = datetime.combine(today, datetime.max.time())

    # 1 query: IDs + nomes + training_days de todos os alunos ativos
    students = await db.students.find(
        {"tenant_id": tid, "assigned_to": uid, "status": "active"},
        {"_id": 1, "name": 1, "training_days": 1},
    ).to_list(length=500)

    student_ids = [s["_id"] for s in students]
    student_name_map = {s["_id"]: s.get("name", "") for s in students}

    if not student_ids:
        return {
            "total_alunos_ativos": 0,
            "mensalidades_vencendo": 0,
            "mensalidades_vencidas": 0,
            "taxa_frequencia_media": 0.0,
            "vencendo_3_dias": [],
            "vencidas": [],
            "pagas_mes": [],
        }

    # 4 queries em paralelo
    vencendo_docs, vencidas_docs, pagas_docs, attended_count = await asyncio.gather(
        db.payments.find({
            "student_id": {"$in": student_ids},
            "status": "pending",
            "due_date": {"$gte": today_dt, "$lte": in_3_dt},
        }).sort("due_date", 1).to_list(length=100),
        db.payments.find({
            "student_id": {"$in": student_ids},
            "status": {"$in": ["pending", "overdue"]},
            "due_date": {"$lt": today_dt},
        }).sort("due_date", 1).to_list(length=100),
        db.payments.find({
            "student_id": {"$in": student_ids},
            "status": "paid",
            "paid_at": {"$gte": first_month_dt, "$lte": last_dt},
        }).sort("paid_at", -1).to_list(length=100),
        db.attendances.count_documents({
            "student_id": {"$in": student_ids},
            "date": {"$gte": first_month_dt, "$lte": last_dt},
        }),
    )

    # frequência: usa training_days já carregados, sem queries extras
    day_map = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}
    first_day = date(today.year, today.month, 1)
    total_expected = 0
    for s in students:
        training = set(s.get("training_days") or [])
        current = first_day
        while current <= today:
            if day_map[current.weekday()] in training:
                total_expected += 1
            current += timedelta(days=1)
    taxa = round(attended_count / total_expected * 100, 1) if total_expected > 0 else 0.0

    def enrich(docs):
        result = []
        for d in docs:
            doc = serialize_doc(d)
            doc["student_name"] = student_name_map.get(d["student_id"])
            result.append(doc)
        return result

    return {
        "total_alunos_ativos": len(student_ids),
        "mensalidades_vencendo": len(vencendo_docs),
        "mensalidades_vencidas": len(vencidas_docs),
        "taxa_frequencia_media": taxa,
        "vencendo_3_dias": enrich(vencendo_docs),
        "vencidas": enrich(vencidas_docs),
        "pagas_mes": enrich(pagas_docs),
    }

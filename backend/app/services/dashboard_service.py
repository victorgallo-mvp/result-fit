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
    today_dt = datetime.combine(today, datetime.min.time())
    in_3_dt = datetime.combine(today + timedelta(days=3), datetime.min.time())
    first_month_dt = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
    last_dt = datetime.combine(today, datetime.max.time())

    students = await db.students.find(
        {"tenant_id": tid, "assigned_to": uid, "status": "active"},
        {"_id": 1, "name": 1, "training_days": 1, "proximo_pagamento": 1, "plan_id": 1, "birthday": 1},
    ).to_list(length=500)

    student_ids = [s["_id"] for s in students]

    if not student_ids:
        return {
            "total_alunos_ativos": 0,
            "mensalidades_vencendo": 0,
            "mensalidades_vencidas": 0,
            "taxa_frequencia_media": 0.0,
            "vencendo_3_dias": [],
            "vencidas": [],
            "aniversariantes": [],
        }

    plan_ids = list({s["plan_id"] for s in students if s.get("plan_id")})
    plans_docs, attended_count = await asyncio.gather(
        db.plans.find({"_id": {"$in": plan_ids}}, {"price": 1}).to_list(100),
        db.attendances.count_documents({
            "student_id": {"$in": student_ids},
            "date": {"$gte": first_month_dt, "$lte": last_dt},
        }),
    )
    plan_price_map = {p["_id"]: p.get("price", 0) for p in plans_docs}

    # frequência: usa training_days já carregados
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

    def shape(s):
        pp = s.get("proximo_pagamento")
        return {
            "id": str(s["_id"]),
            "student_id": str(s["_id"]),
            "student_name": s.get("name", ""),
            "due_date": pp.strftime("%Y-%m-%d") if pp else None,
            "amount": plan_price_map.get(s.get("plan_id"), 0),
        }

    vencidas = sorted(
        [s for s in students if s.get("proximo_pagamento") and s["proximo_pagamento"] < today_dt],
        key=lambda s: s["proximo_pagamento"],
    )
    vencendo = sorted(
        [s for s in students if s.get("proximo_pagamento") and today_dt <= s["proximo_pagamento"] <= in_3_dt],
        key=lambda s: s["proximo_pagamento"],
    )

    birthdays = sorted(
        [s for s in students if s.get("birthday") and s["birthday"].month == today.month],
        key=lambda s: s["birthday"].day,
    )
    birthday_list = []
    for s in birthdays:
        doc = serialize_doc(s)
        doc["age_completing"] = today.year - s["birthday"].year
        birthday_list.append(doc)

    return {
        "total_alunos_ativos": len(student_ids),
        "mensalidades_vencidas": len(vencidas),
        "mensalidades_vencendo": len(vencendo),
        "taxa_frequencia_media": taxa,
        "vencidas": [shape(s) for s in vencidas],
        "vencendo_3_dias": [shape(s) for s in vencendo],
        "aniversariantes": birthday_list,
    }

from datetime import datetime, date, timedelta
from app.database import get_db
from app.models.common import serialize_doc
from app.services.student_service import valor_cobrado


async def get_dashboard() -> dict:
    db = get_db()

    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    in_3_dt = datetime.combine(today + timedelta(days=3), datetime.min.time())
    first_month_dt = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
    last_dt = datetime.combine(today, datetime.max.time())

    students = await db.students.find(
        {"status": "active"},
        # phone entra pro botão de WhatsApp dos cards de cobrança e aniversário
        {"_id": 1, "name": 1, "phone": 1, "weekly_frequency": 1, "proximo_pagamento": 1,
         "birthday": 1, "valor": 1, "periodicidade": 1},
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

    attended_count = await db.attendances.count_documents({
        "student_id": {"$in": student_ids},
        "date": {"$gte": first_month_dt, "$lte": last_dt},
    })

    first_day = date(today.year, today.month, 1)
    days_so_far = (today - first_day).days + 1
    total_expected = sum(
        round(days_so_far / 7 * s.get("weekly_frequency", 3))
        for s in students
    )
    taxa = round(attended_count / total_expected * 100, 1) if total_expected > 0 else 0.0

    def shape(s):
        pp = s.get("proximo_pagamento")
        return {
            "id": str(s["_id"]),
            "student_id": str(s["_id"]),
            "student_name": s.get("name", ""),
            "student_phone": s.get("phone"),
            "due_date": pp.strftime("%Y-%m-%d") if pp else None,
            "amount": valor_cobrado(s),
            "periodicidade": s.get("periodicidade", "mensal"),
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

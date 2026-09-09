import calendar
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.student import StudentCreate, StudentUpdate, PERIODICIDADE_MESES, PERIODICIDADE_LABEL
from app.models.common import serialize_doc


def valor_cobrado(student: dict) -> float:
    """Valor que este aluno paga por período."""
    return student.get("valor") or 0


def meses_periodo(student: dict) -> int:
    return PERIODICIDADE_MESES.get(student.get("periodicidade", "mensal"), 1)


def proximo_vencimento(ultimo: date, student: dict) -> date:
    return add_months(ultimo, meses_periodo(student))


def add_one_month(d: date) -> date:
    m = d.month % 12 + 1
    y = d.year if m > 1 else d.year + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def add_months(d: date, n: int) -> date:
    for _ in range(n):
        d = add_one_month(d)
    return d


async def list_students(status_filter: str | None, search: str | None) -> list:
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    students = await db.students.find(query).sort("name", 1).to_list(length=500)

    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    in_3_dt = datetime.combine(today + timedelta(days=3), datetime.min.time())

    result = []
    for s in students:
        doc = serialize_doc(s)
        pp = s.get("proximo_pagamento")
        if pp:
            if pp < today_dt:
                st = "overdue"
            elif pp <= in_3_dt:
                st = "pending"
            else:
                st = "upcoming"
            doc["next_payment"] = {
                "due_date": pp.strftime("%Y-%m-%d"),
                "amount": valor_cobrado(s),
                "status": st,
            }
        else:
            doc["next_payment"] = None
        result.append(doc)
    return result


async def get_student(student_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    return serialize_doc(student)


async def create_student(data: StudentCreate) -> dict:
    db = get_db()
    if data.valor <= 0:
        raise HTTPException(status_code=422, detail="Informe o valor cobrado")

    doc = {
        "name": data.name,
        "phone": data.phone,
        "birthday": datetime.combine(data.birthday, datetime.min.time()) if data.birthday else None,
        "weekly_frequency": data.weekly_frequency,
        "periodicidade": data.periodicidade,
        "valor": data.valor,
        "status": "active",
        "notes": data.notes,
        "photo_url": data.photo_url,
        "created_at": datetime.now(timezone.utc),
    }

    if data.ultimo_pagamento:
        ult_dt = datetime.combine(data.ultimo_pagamento, datetime.min.time())
        prox_dt = datetime.combine(proximo_vencimento(data.ultimo_pagamento, doc), datetime.min.time())
        doc["ultimo_pagamento"] = ult_dt
        doc["proximo_pagamento"] = prox_dt

    if data.ultima_avaliacao:
        freq = data.avaliacao_frequencia or 3
        doc["ultima_avaliacao"] = datetime.combine(data.ultima_avaliacao, datetime.min.time())
        doc["proxima_avaliacao"] = datetime.combine(add_months(data.ultima_avaliacao, freq), datetime.min.time())
    doc["avaliacao_frequencia"] = data.avaliacao_frequencia or 3

    result = await db.students.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def pagar_student(student_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    price = valor_cobrado(student)
    label = PERIODICIDADE_LABEL.get(student.get("periodicidade", "mensal"), "Mensal")

    today = date.today()
    proximo = proximo_vencimento(today, student)
    today_dt = datetime.combine(today, datetime.min.time())
    proximo_dt = datetime.combine(proximo, datetime.min.time())

    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"ultimo_pagamento": today_dt, "proximo_pagamento": proximo_dt}},
    )
    await db.payments.insert_one({
        "student_id": ObjectId(student_id),
        "amount": price,
        "due_date": today_dt,
        "status": "paid",
        "paid_at": today_dt,
        "payment_method": None,
        "notes": "",
        "created_at": datetime.now(timezone.utc),
    })
    await db.financial_transactions.insert_one({
        "type": "income",
        "category": "Mensalidade",
        "amount": price,
        "date": today_dt,
        "description": f"{label} - {student.get('name', '')}",
        "student_id": ObjectId(student_id),
        "created_at": datetime.now(timezone.utc),
    })
    return await get_student(student_id)


async def update_student(student_id: str, data: StudentUpdate) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    updates = data.model_dump(exclude_none=True)
    if "birthday" in updates and updates["birthday"]:
        updates["birthday"] = datetime.combine(updates["birthday"], datetime.min.time())
    if "valor" in updates and updates["valor"] <= 0:
        raise HTTPException(status_code=422, detail="Informe o valor cobrado")

    # periodicidade nova recalcula o vencimento a partir do último pagamento conhecido
    merged = {**student, **updates}
    ult_raw = updates.get("ultimo_pagamento") or student.get("ultimo_pagamento")
    if ult_raw and ("ultimo_pagamento" in updates or "periodicidade" in updates):
        ult = ult_raw.date() if hasattr(ult_raw, "date") else ult_raw
        updates["ultimo_pagamento"] = datetime.combine(ult, datetime.min.time())
        updates["proximo_pagamento"] = datetime.combine(proximo_vencimento(ult, merged), datetime.min.time())

    if "ultima_avaliacao" in updates and updates["ultima_avaliacao"]:
        ua = updates["ultima_avaliacao"]
        freq = updates.get("avaliacao_frequencia") or student.get("avaliacao_frequencia", 3)
        updates["ultima_avaliacao"] = datetime.combine(ua, datetime.min.time())
        updates["proxima_avaliacao"] = datetime.combine(add_months(ua, freq), datetime.min.time())
    elif "avaliacao_frequencia" in updates:
        ua_raw = student.get("ultima_avaliacao")
        if ua_raw:
            ua_date = ua_raw.date() if hasattr(ua_raw, "date") else ua_raw
            updates["proxima_avaliacao"] = datetime.combine(
                add_months(ua_date, updates["avaliacao_frequencia"]), datetime.min.time()
            )

    if updates:
        await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": updates})
    return await get_student(student_id)


async def avaliar_student(student_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    freq = student.get("avaliacao_frequencia", 3)
    today = date.today()
    proxima = add_months(today, freq)
    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {
            "ultima_avaliacao": datetime.combine(today, datetime.min.time()),
            "proxima_avaliacao": datetime.combine(proxima, datetime.min.time()),
        }},
    )
    return await get_student(student_id)


async def delete_student(student_id: str):
    db = get_db()
    result = await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"status": "inactive"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")


async def get_birthdays() -> dict:
    db = get_db()
    today = date.today()
    tomorrow = date.today().replace(day=today.day + 1) if today.day < 28 else None

    async def fetch_for_day(d: date) -> list:
        pipeline = [
            {"$match": {
                "status": "active",
                "birthday": {"$ne": None},
            }},
            {"$addFields": {
                "birth_month": {"$month": "$birthday"},
                "birth_day": {"$dayOfMonth": "$birthday"},
            }},
            {"$match": {"birth_month": d.month, "birth_day": d.day}},
        ]
        docs = await db.students.aggregate(pipeline).to_list(length=100)
        return [serialize_doc(s) for s in docs]

    result = {"today": await fetch_for_day(today)}
    if tomorrow:
        result["tomorrow"] = await fetch_for_day(tomorrow)
    else:
        result["tomorrow"] = []
    return result


async def get_birthdays_month(year: int, month: int) -> list:
    db = get_db()
    pipeline = [
        {"$match": {
            "status": "active",
            "birthday": {"$ne": None},
        }},
        {"$addFields": {
            "birth_month": {"$month": "$birthday"},
            "birth_day": {"$dayOfMonth": "$birthday"},
        }},
        {"$match": {"birth_month": month}},
        {"$sort": {"birth_day": 1}},
    ]
    docs = await db.students.aggregate(pipeline).to_list(length=100)
    result = []
    for s in docs:
        doc = serialize_doc(s)
        if s.get("birthday"):
            doc["age_completing"] = year - s["birthday"].year
        result.append(doc)
    return result


async def migrar_alunos_legados() -> int:
    """
    Alunos criados no modelo antigo (plan_id + preco_personalizado) ganham
    periodicidade mensal e `valor`. Roda no startup; sem alunos legados não faz nada.
    """
    db = get_db()
    legados = await db.students.find({"valor": {"$exists": False}}).to_list(length=1000)
    if not legados:
        return 0

    plans = {p["_id"]: p async for p in db.plans.find()}
    for s in legados:
        plan = plans.get(s.get("plan_id"))
        valor = s.get("preco_personalizado")
        if valor is None:
            valor = plan.get("price", 0) if plan else 0
        await db.students.update_one(
            {"_id": s["_id"]},
            {
                "$set": {"periodicidade": "mensal", "valor": float(valor)},
                "$unset": {"plan_id": "", "preco_personalizado": "", "email": ""},
            },
        )
    print(f"Migrados {len(legados)} alunos para periodicidade/valor", flush=True)
    return len(legados)

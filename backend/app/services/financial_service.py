import calendar
from datetime import datetime, timezone, date
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.financial import FinancialCreate, FinancialUpdate, RecurringCreate, RecurringUpdate
from app.models.common import serialize_doc


def _dt(d: date) -> datetime:
    return datetime.combine(d, datetime.min.time())


def _period(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _next_month(year: int, month: int) -> tuple[int, int]:
    return (year + 1, 1) if month == 12 else (year, month + 1)


def _add_months(d: date, n: int) -> date:
    y, m = d.year, d.month
    for _ in range(n):
        y, m = _next_month(y, m)
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def _day_in_month(year: int, month: int, day: int) -> date:
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


# ── Recorrentes ───────────────────────────────────────────────────────────

async def ensure_recurring(year: int, month: int) -> None:
    """
    Garante que toda recorrência ativa tem seu lançamento gerado em cada mês
    desde o início até `year/month` (limitado ao mês atual). Idempotente:
    o índice único (recurring_id, period) barra duplicatas.
    """
    db = get_db()
    today = date.today()
    # não gera meses futuros — o lançamento só existe quando o mês chega
    if (year, month) > (today.year, today.month):
        year, month = today.year, today.month

    async for rec in db.recurring_transactions.find({"active": True}):
        start = rec["start_date"]
        y, m = start.year, start.month
        end = rec.get("end_date")
        while (y, m) <= (year, month):
            if end and (y, m) > (end.year, end.month):
                break
            period = _period(y, m)
            exists = await db.financial_transactions.find_one(
                {"recurring_id": rec["_id"], "period": period}, {"_id": 1}
            )
            if not exists:
                await db.financial_transactions.insert_one({
                    "type": rec["type"],
                    "category": rec["category"],
                    "amount": rec["amount"],
                    "date": _dt(_day_in_month(y, m, rec["day_of_month"])),
                    "description": rec["description"],
                    "recurring_id": rec["_id"],
                    "period": period,
                    "created_at": datetime.now(timezone.utc),
                })
            y, m = _next_month(y, m)


async def list_recurring() -> list:
    db = get_db()
    docs = await db.recurring_transactions.find().sort([("active", -1), ("day_of_month", 1)]).to_list(length=200)
    return [serialize_doc(d) for d in docs]


async def create_recurring(data: RecurringCreate) -> dict:
    db = get_db()
    if data.amount <= 0:
        raise HTTPException(status_code=422, detail="Informe o valor")
    doc = {
        "type": data.type,
        "category": data.category,
        "amount": data.amount,
        "description": data.description,
        "day_of_month": data.day_of_month,
        "start_date": _dt(data.start_date.replace(day=1)),
        "end_date": _dt(data.end_date) if data.end_date else None,
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.recurring_transactions.insert_one(doc)
    doc["_id"] = result.inserted_id
    today = date.today()
    await ensure_recurring(today.year, today.month)
    return serialize_doc(doc)


async def update_recurring(rec_id: str, data: RecurringUpdate) -> dict:
    db = get_db()
    rec = await db.recurring_transactions.find_one({"_id": ObjectId(rec_id)})
    if not rec:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")

    updates = data.model_dump(exclude_none=True)
    if "end_date" in updates:
        updates["end_date"] = _dt(updates["end_date"])
    if updates:
        await db.recurring_transactions.update_one({"_id": ObjectId(rec_id)}, {"$set": updates})

    # mudança de valor/descrição/categoria vale a partir do mês atual em diante;
    # meses passados já lançados ficam como estavam
    campos_tx = {k: v for k, v in updates.items() if k in ("type", "category", "amount", "description")}
    if campos_tx:
        today = date.today()
        await db.financial_transactions.update_many(
            {"recurring_id": ObjectId(rec_id), "period": {"$gte": _period(today.year, today.month)}},
            {"$set": campos_tx},
        )
    if updates.get("active"):
        today = date.today()
        await ensure_recurring(today.year, today.month)

    doc = await db.recurring_transactions.find_one({"_id": ObjectId(rec_id)})
    return serialize_doc(doc)


async def delete_recurring(rec_id: str, apagar_lancamentos: bool = False):
    """Encerra a recorrência. Com apagar_lancamentos, remove também os já gerados."""
    db = get_db()
    result = await db.recurring_transactions.delete_one({"_id": ObjectId(rec_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")
    if apagar_lancamentos:
        await db.financial_transactions.delete_many({"recurring_id": ObjectId(rec_id)})
    else:
        # desvincula: os lançamentos viram avulsos e não somem se a regra for recriada
        await db.financial_transactions.update_many(
            {"recurring_id": ObjectId(rec_id)},
            {"$unset": {"recurring_id": "", "period": ""}},
        )


# ── Lançamentos ───────────────────────────────────────────────────────────

async def list_transactions(year: int, month: int) -> dict:
    db = get_db()
    await ensure_recurring(year, month)

    first = datetime(year, month, 1)
    last = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)

    docs = await db.financial_transactions.find({
        "date": {"$gte": first, "$lte": last},
    }).sort("date", -1).to_list(length=500)

    income = sum(d["amount"] for d in docs if d["type"] == "income")
    expense = sum(d["amount"] for d in docs if d["type"] == "expense")

    return {
        "transactions": [serialize_doc(d) for d in docs],
        "income": income,
        "expense": expense,
        "balance": income - expense,
    }


async def create_transaction(data: FinancialCreate) -> dict | list:
    db = get_db()
    if data.amount <= 0:
        raise HTTPException(status_code=422, detail="Informe o valor")
    now = datetime.now(timezone.utc)

    if data.parcelas <= 1:
        doc = {
            "type": data.type,
            "category": data.category,
            "amount": data.amount,
            "date": _dt(data.date),
            "description": data.description,
            "created_at": now,
        }
        result = await db.financial_transactions.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    # a prazo: total dividido em N parcelas mensais; centavos que sobram vão na última
    n = data.parcelas
    total_cents = round(data.amount * 100)
    base = total_cents // n
    group_id = ObjectId()
    docs = []
    for i in range(n):
        cents = base + (total_cents - base * n if i == n - 1 else 0)
        docs.append({
            "type": data.type,
            "category": data.category,
            "amount": cents / 100,
            "date": _dt(_add_months(data.date, i)),
            "description": f"{data.description} ({i + 1}/{n})",
            "installment_group_id": group_id,
            "parcela_num": i + 1,
            "parcela_total": n,
            "created_at": now,
        })
    result = await db.financial_transactions.insert_many(docs)
    for d, _id in zip(docs, result.inserted_ids):
        d["_id"] = _id
    return [serialize_doc(d) for d in docs]


async def update_transaction(tx_id: str, data: FinancialUpdate) -> dict:
    db = get_db()
    tx = await db.financial_transactions.find_one({"_id": ObjectId(tx_id)})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    updates = data.model_dump(exclude_none=True)
    if "date" in updates:
        updates["date"] = _dt(updates["date"])

    await db.financial_transactions.update_one({"_id": ObjectId(tx_id)}, {"$set": updates})
    doc = await db.financial_transactions.find_one({"_id": ObjectId(tx_id)})
    return serialize_doc(doc)


async def delete_transaction(tx_id: str, scope: str = "one"):
    """
    scope=one   → só este lançamento (uma parcela, ou um mês da recorrência —
                  o mês fica marcado como pulado pra não ser regenerado)
    scope=group → parcelamento inteiro, ou encerra a recorrência e apaga este mês
    """
    db = get_db()
    tx = await db.financial_transactions.find_one({"_id": ObjectId(tx_id)})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    if scope == "group" and tx.get("installment_group_id"):
        await db.financial_transactions.delete_many({"installment_group_id": tx["installment_group_id"]})
        return

    if tx.get("recurring_id"):
        if scope == "group":
            await db.recurring_transactions.update_one(
                {"_id": tx["recurring_id"]}, {"$set": {"active": False}}
            )
            await db.financial_transactions.delete_one({"_id": tx["_id"]})
        else:
            # mantém o vínculo com o período mas zera o lançamento: some da lista
            # e o ensure_recurring vê que o período já existe e não recria
            await db.financial_transactions.update_one(
                {"_id": tx["_id"]},
                {"$set": {"skipped": True, "amount": 0}, "$unset": {"date": ""}},
            )
        return

    await db.financial_transactions.delete_one({"_id": tx["_id"]})

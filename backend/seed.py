"""
Seed script — new payment model (proximo_pagamento on student).
Run from backend/: python seed.py

Credentials after seed:
  manha@teste.com / personal123
"""
import asyncio, calendar, random
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGODB_URL")
DB_NAME   = os.getenv("DATABASE_NAME", "personal_system")
pwd_ctx   = CryptContext(schemes=["bcrypt"], deprecated="auto")

TODAY = date.today()


def dt(d: date) -> datetime:
    return datetime.combine(d, datetime.min.time())


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def birthday(age: int, month_offset: int = 0) -> datetime:
    """Birthday exactly `age` years ago, in month TODAY.month + month_offset."""
    target = TODAY.replace(year=TODAY.year - age)
    if month_offset != 0:
        target = add_months(target, month_offset)
    try:
        return datetime(TODAY.year - age, target.month, target.day)
    except ValueError:
        return datetime(TODAY.year - age, target.month, 28)


# ── scenario definitions ────────────────────────────────────────────────────
# proximo_pagamento relative to TODAY
SCENARIOS = [
    # name,                training_days,         plan_idx, due_day, proximo_offset, age, bday_offset
    ("Ana Silva",          ["mon", "wed"],          0,       10,     -15,            28,  0),   # VENCIDA 15 dias · aniversário hoje
    ("Carlos Souza",       ["tue", "thu", "sat"],   1,       5,      -3,             32,  2),   # VENCIDA 3 dias
    ("Fernanda Lima",      ["mon", "wed", "fri"],   1,       15,     +1,             25,  10),  # VENCE AMANHÃ
    ("João Pereira",       ["mon", "tue", "wed",
                            "thu", "fri"],          2,       20,     +2,             35,  None), # VENCE EM 2 DIAS
    ("Mariana Costa",      ["mon", "wed"],          0,       10,     +3,             29,  None), # VENCE EM 3 DIAS
    ("Patricia Gomes",     ["tue", "thu"],          0,       1,      +14,            40,  15),  # em dia · aniversário este mês
    ("Lucas Martins",      ["mon", "wed", "fri"],   1,       5,      +21,            22,  None), # em dia
    ("Roberto Alves",      ["tue", "thu", "sat"],   2,       15,     +30,            38,  None), # em dia
    ("Camila Rocha",       ["mon", "wed", "fri"],   1,       10,     None,           27,  None), # nunca pagou
    ("Diego Santos",       ["mon", "tue", "wed",
                            "thu", "fri"],          2,       25,     +32,            33,  None), # pagou hoje
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    for col in ["users", "students", "plans", "payments", "attendances", "financial_transactions"]:
        await db[col].drop()
    print("Cleared collections")

    # User (único — o sistema não tem multitenant nem múltiplos personais)
    await db.users.insert_one({
        "name": "Personal Manhã",
        "email": "manha@teste.com",
        "password_hash": pwd_ctx.hash("personal123"),
        "role": "personal",
        "active": True,
        "created_at": datetime.now(timezone.utc),
    })
    await db.users.create_index("email", unique=True)
    await db.attendances.create_index([("student_id", 1), ("date", 1)], unique=True)
    print(f"User: manha@teste.com / personal123")

    # Plans
    plans_data = [
        {"name": "Mensal 2x", "price": 150.0},
        {"name": "Mensal 3x", "price": 200.0},
        {"name": "Mensal 5x", "price": 280.0},
    ]
    plan_ids = []
    for p in plans_data:
        pid = (await db.plans.insert_one({**p, "active": True})).inserted_id
        plan_ids.append(pid)
    print(f"Plans: {[p['name'] for p in plans_data]}")

    # Students
    day_map = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}
    student_ids = []

    for name, training_days, plan_idx, due_day, prox_offset, age, bday_offset in SCENARIOS:
        prox_date = (TODAY + timedelta(days=prox_offset)) if prox_offset is not None else None
        ult_date  = add_months(prox_date, -1) if prox_date else None
        bday      = birthday(age, bday_offset) if bday_offset is not None else birthday(age, 3)

        doc = {
            "name":                name,
            "phone":               f"119{random.randint(10000000,99999999)}",
            "email":               f"{name.split()[0].lower()}@email.com",
            "birthday":            bday,
            "training_days":       training_days,
            "plan_id":             plan_ids[plan_idx],
            "due_day":             due_day,
            "status":              "active",
            "notes":               "",
            "photo_url":           None,
            "ultimo_pagamento":    dt(ult_date) if ult_date else None,
            "proximo_pagamento":   dt(prox_date) if prox_date else None,
            "created_at":          datetime.now(timezone.utc),
        }
        sid = (await db.students.insert_one(doc)).inserted_id
        student_ids.append((sid, name, training_days, plan_ids[plan_idx], ult_date))

    print(f"Students created: {len(student_ids)}")

    # Payment history — 3 paid records per student who has paid
    for sid, name, _, plan_id, ult_date in student_ids:
        if ult_date is None:
            continue
        plan = await db.plans.find_one({"_id": plan_id})
        price = plan["price"]
        for i in range(3):
            paid_on = add_months(ult_date, -(i + 1) if i > 0 else 0) if i == 0 else add_months(ult_date, -i)
            await db.payments.insert_one({
                "student_id":     sid,
                "amount":         price,
                "due_date":       dt(paid_on),
                "status":         "paid",
                "paid_at":        dt(paid_on + timedelta(days=random.randint(0, 3))),
                "payment_method": random.choice(["pix", "dinheiro", "cartao"]),
                "notes":          "",
                "created_at":     datetime.now(timezone.utc),
            })

    print("Payment history created")

    # Attendances — last 30 days (~85% rate)
    for sid, name, training_days, _, _ in student_ids:
        training_set = set(training_days)
        for days_ago in range(30, 0, -1):
            d = TODAY - timedelta(days=days_ago)
            if day_map[d.weekday()] not in training_set:
                continue
            if random.random() < 0.85:
                try:
                    await db.attendances.insert_one({
                        "student_id": sid,
                        "date":       dt(d),
                        "created_at": datetime.now(timezone.utc),
                    })
                except Exception:
                    pass

    print("Attendances created")

    # Summary
    print("\n✅ Seed completo!")
    print("   Login: manha@teste.com / personal123\n")
    print("   Cenários:")
    for name, _, _, _, prox_offset, _, bday_offset in SCENARIOS:
        if prox_offset is None:
            status = "nunca pagou"
        elif prox_offset < 0:
            status = f"VENCIDA há {abs(prox_offset)} dias"
        elif prox_offset == 0:
            status = "VENCE HOJE"
        elif prox_offset <= 3:
            status = f"vence em {prox_offset} dia(s)"
        else:
            status = f"em dia (vence em {prox_offset} dias)"
        bday_note = " 🎂 aniversário" if bday_offset == 0 else (" 🎂 aniver. este mês" if bday_offset and bday_offset < 30 else "")
        print(f"   {name:<22} {status}{bday_note}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())

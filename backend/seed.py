"""
Seed script: creates tenant, users, plans, students, payments and attendances.
Run from backend/: python seed.py
Requires .env with MONGODB_URL set.
"""
import asyncio
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from dotenv import load_dotenv
import os
load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "personal_system")

TODAY = date.today()


def dt(d: date) -> datetime:
    return datetime.combine(d, datetime.min.time())


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Clear existing data
    for col in ["tenants", "users", "students", "plans", "payments", "attendances", "financial_transactions"]:
        await db[col].drop()
    print("Cleared existing collections")

    # Tenant
    tenant_doc = {"name": "Academia Teste", "created_at": datetime.now(timezone.utc)}
    tenant_id = (await db.tenants.insert_one(tenant_doc)).inserted_id
    print(f"Tenant created: {tenant_id}")

    # Users
    users = [
        {
            "tenant_id": tenant_id,
            "name": "Personal Manhã",
            "email": "manha@teste.com",
            "password_hash": pwd_context.hash("personal123"),
            "role": "personal",
            "shift": "morning",
            "active": True,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "tenant_id": tenant_id,
            "name": "Personal Tarde",
            "email": "tarde@teste.com",
            "password_hash": pwd_context.hash("personal123"),
            "role": "personal",
            "shift": "afternoon",
            "active": True,
            "created_at": datetime.now(timezone.utc),
        },
    ]
    user_ids = []
    for u in users:
        uid = (await db.users.insert_one(u)).inserted_id
        user_ids.append(uid)
        print(f"User created: {u['email']} ({uid})")

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.attendances.create_index([("student_id", 1), ("date", 1)], unique=True)

    # Plans
    plans_data = [
        {"name": "Mensal 2x", "price": 150.0, "frequency_per_week": 2},
        {"name": "Mensal 3x", "price": 200.0, "frequency_per_week": 3},
        {"name": "Mensal 5x", "price": 280.0, "frequency_per_week": 5},
    ]
    plan_ids = []
    for p in plans_data:
        doc = {**p, "tenant_id": tenant_id, "active": True}
        pid = (await db.plans.insert_one(doc)).inserted_id
        plan_ids.append(pid)
        print(f"Plan created: {p['name']}")

    day_combos = [
        ["mon", "wed", "fri"],
        ["tue", "thu", "sat"],
        ["mon", "tue", "wed", "thu", "fri"],
        ["mon", "wed"],
        ["tue", "thu"],
    ]

    # Students — 5 per personal
    student_names_manha = ["Ana Silva", "Carlos Souza", "Fernanda Lima", "João Pereira", "Mariana Costa"]
    student_names_tarde = ["Roberto Alves", "Patrícia Gomes", "Lucas Martins", "Camila Rocha", "Diego Santos"]

    # Birthday close to today for modal testing
    birthday_offsets = [0, 1, 15, 45, 90]  # days ago, so month+day falls near today

    def make_birthday(offset_days_ago: int) -> datetime:
        bd = TODAY - timedelta(days=offset_days_ago)
        # Put birthday some years back (age 20-40)
        years_back = random.randint(20, 40)
        return datetime(TODAY.year - years_back, bd.month, bd.day)

    student_ids_manha = []
    student_ids_tarde = []

    for i, name in enumerate(student_names_manha):
        plan = plan_ids[i % len(plan_ids)]
        days = day_combos[i % len(day_combos)]
        birthday = make_birthday(birthday_offsets[i])
        doc = {
            "tenant_id": tenant_id,
            "assigned_to": user_ids[0],
            "name": name,
            "phone": f"119{random.randint(10000000, 99999999)}",
            "email": f"{name.split()[0].lower()}@email.com",
            "birthday": birthday,
            "training_days": days,
            "plan_id": plan,
            "due_day": random.choice([5, 10, 15, 20]),
            "status": "active",
            "notes": "",
            "photo_url": None,
            "created_at": datetime.now(timezone.utc),
        }
        sid = (await db.students.insert_one(doc)).inserted_id
        student_ids_manha.append(sid)

    for i, name in enumerate(student_names_tarde):
        plan = plan_ids[i % len(plan_ids)]
        days = day_combos[i % len(day_combos)]
        birthday = make_birthday(birthday_offsets[i])
        doc = {
            "tenant_id": tenant_id,
            "assigned_to": user_ids[1],
            "name": name,
            "phone": f"119{random.randint(10000000, 99999999)}",
            "email": f"{name.split()[0].lower()}2@email.com",
            "birthday": birthday,
            "training_days": days,
            "plan_id": plan,
            "due_day": random.choice([5, 10, 15, 20]),
            "status": "active",
            "notes": "",
            "photo_url": None,
            "created_at": datetime.now(timezone.utc),
        }
        sid = (await db.students.insert_one(doc)).inserted_id
        student_ids_tarde.append(sid)

    print(f"Students created: {len(student_ids_manha)} manhã, {len(student_ids_tarde)} tarde")

    # Payments — last 3 months + next month
    all_students = list(zip(student_ids_manha, [user_ids[0]] * 5)) + list(zip(student_ids_tarde, [user_ids[1]] * 5))

    for sid, uid in all_students:
        student = await db.students.find_one({"_id": sid})
        plan = await db.plans.find_one({"_id": student["plan_id"]})
        due_day = student["due_day"]

        for month_offset in [-3, -2, -1, 0, 1]:
            target = date(TODAY.year, TODAY.month, 1)
            # simple month arithmetic
            m = TODAY.month + month_offset
            y = TODAY.year
            while m <= 0:
                m += 12
                y -= 1
            while m > 12:
                m -= 12
                y += 1
            import calendar
            max_day = calendar.monthrange(y, m)[1]
            actual_day = min(due_day, max_day)
            due = date(y, m, actual_day)

            if due < TODAY - timedelta(days=30):
                paid_at = due + timedelta(days=random.randint(0, 5))
                status = "paid"
                method = random.choice(["pix", "dinheiro", "cartao"])
            elif due < TODAY:
                # some paid, some overdue
                if random.random() > 0.3:
                    paid_at = due + timedelta(days=random.randint(0, 3))
                    status = "paid"
                    method = random.choice(["pix", "dinheiro"])
                else:
                    paid_at = None
                    status = "overdue"
                    method = None
            else:
                paid_at = None
                status = "pending"
                method = None

            doc = {
                "tenant_id": tenant_id,
                "student_id": sid,
                "amount": plan["price"],
                "due_date": dt(due),
                "paid_at": dt(paid_at) if paid_at else None,
                "payment_method": method,
                "status": status,
                "notes": "",
                "created_at": datetime.now(timezone.utc),
            }
            await db.payments.insert_one(doc)

    print("Payments created")

    # Attendances — last 30 days
    day_map = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}

    for sid, uid in all_students:
        student = await db.students.find_one({"_id": sid})
        training = set(student.get("training_days", []))

        for days_ago in range(30, 0, -1):
            d = TODAY - timedelta(days=days_ago)
            if day_map[d.weekday()] not in training:
                continue
            if random.random() < 0.85:  # 85% attendance rate
                try:
                    await db.attendances.insert_one({
                        "tenant_id": tenant_id,
                        "student_id": sid,
                        "user_id": uid,
                        "date": dt(d),
                        "created_at": datetime.now(timezone.utc),
                    })
                except Exception:
                    pass

    print("Attendances created")
    print("\n✅ Seed complete!")
    print("  manha@teste.com / personal123")
    print("  tarde@teste.com / personal123")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())

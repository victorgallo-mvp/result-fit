from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import sys

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    print(f"Connecting to MongoDB... DB={settings.database_name}", flush=True)
    try:
        client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=10000,
        )
        db = client[settings.database_name]
        await db.command("ping")
        print(f"✅ Connected to MongoDB: {settings.database_name}", flush=True)
        await ensure_indexes()
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}", flush=True)
        sys.exit(1)


async def disconnect_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB", flush=True)


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.students.create_index("status")
    await db.students.create_index("name")
    await db.attendances.create_index(
        [("student_id", 1), ("date", 1)], unique=True
    )
    await db.payments.create_index("status")
    await db.payments.create_index([("student_id", 1), ("due_date", -1)])
    await db.plans.create_index("active")
    await db.financial_transactions.create_index([("date", -1)])


def get_db():
    return db

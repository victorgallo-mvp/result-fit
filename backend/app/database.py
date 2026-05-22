from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    await db.command("ping")
    print(f"Connected to MongoDB: {settings.database_name}")
    await ensure_indexes()


async def disconnect_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.students.create_index([("tenant_id", 1), ("assigned_to", 1)])
    await db.students.create_index([("tenant_id", 1), ("status", 1)])
    await db.attendances.create_index(
        [("student_id", 1), ("date", 1)], unique=True
    )
    await db.payments.create_index([("tenant_id", 1), ("status", 1)])
    await db.payments.create_index([("student_id", 1), ("due_date", -1)])
    await db.plans.create_index([("tenant_id", 1), ("active", 1)])
    await db.financial_transactions.create_index([("tenant_id", 1), ("date", -1)])


def get_db():
    return db

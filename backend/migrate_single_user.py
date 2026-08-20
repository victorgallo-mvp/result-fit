"""
Migração: remove multitenant e múltiplos usuários do banco.

O que faz:
  - remove os campos tenant_id / assigned_to / user_id de todos os documentos
  - mantém um único usuário (o que tiver mais alunos, ou --keep <email>)
  - apaga os demais usuários e a collection `tenants`
  - remove os índices compostos antigos que começavam por tenant_id

Uso:
    python migrate_single_user.py                # dry-run: só mostra o que faria
    python migrate_single_user.py --apply        # aplica (faz backup JSON antes)
    python migrate_single_user.py --apply --keep manha@teste.com

O backup vai para backup_pre_migracao_<timestamp>.json no diretório atual.
"""
import asyncio
import argparse
import sys
from datetime import datetime, timezone

from bson.json_util import dumps
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "personal_system")

COLLECTIONS = [
    "tenants", "users", "students", "plans",
    "payments", "attendances", "financial_transactions",
]

# campo a remover -> collections onde ele aparece
FIELDS_TO_DROP = {
    "tenant_id": ["users", "students", "plans", "payments", "financial_transactions", "attendances"],
    "assigned_to": ["students"],
    "user_id": ["attendances", "financial_transactions"],
}


async def backup(db) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = f"backup_pre_migracao_{stamp}.json"
    data = {}
    for col in COLLECTIONS:
        data[col] = await db[col].find().to_list(length=100000)
    with open(path, "w") as f:
        f.write(dumps(data, indent=2))
    print(f"💾 Backup salvo em {path}")
    return path


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="aplica as mudanças")
    parser.add_argument("--keep", help="email do usuário que fica (default: o com mais alunos)")
    args = parser.parse_args()

    if not MONGO_URL:
        print("❌ MONGODB_URL não definido (.env ou variável de ambiente).")
        sys.exit(1)

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await db.command("ping")
    print(f"Conectado a {DB_NAME}\n")

    users = await db.users.find().to_list(length=100)
    if not users:
        print("❌ Nenhum usuário no banco.")
        sys.exit(1)

    counts = {}
    for u in users:
        counts[u["_id"]] = await db.students.count_documents({"assigned_to": u["_id"]})

    if args.keep:
        keeper = next((u for u in users if u["email"] == args.keep.lower()), None)
        if not keeper:
            print(f"❌ Usuário {args.keep} não encontrado.")
            sys.exit(1)
    else:
        keeper = max(users, key=lambda u: counts[u["_id"]])

    print("Usuários:")
    for u in users:
        marca = "  ← FICA" if u["_id"] == keeper["_id"] else "  ← será apagado"
        print(f"  {u['email']:<24} {u['name']:<18} {counts[u['_id']]} aluno(s){marca}")

    print("\nCampos a remover:")
    for field, cols in FIELDS_TO_DROP.items():
        for col in cols:
            n = await db[col].count_documents({field: {"$exists": True}})
            if n:
                print(f"  {col}.{field}: {n} doc(s)")

    n_tenants = await db.tenants.count_documents({})
    print(f"\nCollection `tenants`: {n_tenants} doc(s) — será removida")

    print("\nÍndices que serão removidos:")
    to_drop = []
    for col in ["students", "payments", "plans", "financial_transactions"]:
        async for idx in db[col].list_indexes():
            keys = list(idx["key"].keys())
            if any(k in ("tenant_id", "assigned_to", "user_id") for k in keys):
                to_drop.append((col, idx["name"]))
                print(f"  {col}: {idx['name']} {keys}")
    if not to_drop:
        print("  (nenhum)")

    if not args.apply:
        print("\n🔍 Dry-run. Nada foi alterado. Rode com --apply para executar.")
        client.close()
        return

    print()
    await backup(db)

    for field, cols in FIELDS_TO_DROP.items():
        for col in cols:
            res = await db[col].update_many(
                {field: {"$exists": True}}, {"$unset": {field: ""}}
            )
            if res.modified_count:
                print(f"✔ {col}.{field} removido de {res.modified_count} doc(s)")

    res = await db.users.delete_many({"_id": {"$ne": keeper["_id"]}})
    print(f"✔ {res.deleted_count} usuário(s) apagado(s) — ficou {keeper['email']}")

    await db.tenants.drop()
    print("✔ collection `tenants` removida")

    for col, name in to_drop:
        await db[col].drop_index(name)
        print(f"✔ índice {col}.{name} removido")

    total = await db.students.count_documents({})
    ativos = await db.students.count_documents({"status": "active"})
    print(f"\n✅ Migração concluída. {total} aluno(s) no total, {ativos} ativo(s) — todos numa base só.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
Zera os dados do app pra começar do zero.

Apaga alunos, presenças, pagamentos e transações do financeiro.
NÃO apaga o seu usuário (senão você perde o acesso) e, por padrão, não apaga
os planos — use --incluir-planos se quiser recriá-los também.

Uso:
    python reset_db.py                      # dry-run: só mostra o que apagaria
    python reset_db.py --apply              # apaga (faz backup JSON antes)
    python reset_db.py --apply --incluir-planos

O backup vai para backup_pre_reset_<timestamp>.json no diretório atual.
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

ALWAYS_WIPE = ["students", "attendances", "payments", "financial_transactions"]
PRESERVED = ["users", "plans"]


async def backup(db, collections) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = f"backup_pre_reset_{stamp}.json"
    data = {}
    for col in collections:
        data[col] = await db[col].find().to_list(length=100000)
    with open(path, "w") as f:
        f.write(dumps(data, indent=2))
    print(f"💾 Backup salvo em {path}")
    return path


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="apaga de verdade")
    parser.add_argument("--incluir-planos", action="store_true", help="apaga os planos também")
    args = parser.parse_args()

    if not MONGO_URL:
        print("❌ MONGODB_URL não definido (.env ou variável de ambiente).")
        sys.exit(1)

    to_wipe = list(ALWAYS_WIPE)
    if args.incluir_planos:
        to_wipe.append("plans")

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await db.command("ping")
    print(f"Conectado a {DB_NAME}\n")

    print("Será apagado:")
    total = 0
    for col in to_wipe:
        n = await db[col].count_documents({})
        total += n
        print(f"  {col:<24} {n} doc(s)")

    print("\nSerá preservado:")
    for col in PRESERVED:
        if col in to_wipe:
            continue
        n = await db[col].count_documents({})
        detalhe = ""
        if col == "users":
            emails = [u["email"] for u in await db.users.find({}, {"email": 1}).to_list(10)]
            detalhe = f"  ({', '.join(emails)})"
        elif col == "plans":
            nomes = [p["name"] for p in await db.plans.find({}, {"name": 1}).to_list(20)]
            detalhe = f"  ({', '.join(nomes)})"
        print(f"  {col:<24} {n} doc(s){detalhe}")

    if not args.apply:
        print(f"\n🔍 Dry-run: {total} documento(s) seriam apagados. Nada foi alterado.")
        print("   Rode com --apply para executar.")
        client.close()
        return

    print()
    await backup(db, to_wipe)

    for col in to_wipe:
        res = await db[col].delete_many({})
        print(f"✔ {col}: {res.deleted_count} doc(s) apagado(s)")

    print("\n✅ Banco zerado. Seu login continua o mesmo.")
    if "plans" in to_wipe:
        print("   Cadastre os planos antes do primeiro aluno — o cadastro exige um plano.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

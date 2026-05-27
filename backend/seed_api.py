"""
Seed via API HTTP — não precisa de MongoDB direto.
Uso:
  BASE_URL=https://xxx.railway.app EMAIL=seu@email.com PASSWORD=sua_senha python3 seed_api.py

Se BASE_URL não for passado, tenta http://localhost:8000
"""
import os, sys, requests
from datetime import date, timedelta
import calendar

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
EMAIL    = os.getenv("EMAIL", "manha@teste.com")
PASSWORD = os.getenv("PASSWORD", "personal123")

TODAY = date.today()


def offset(days: int) -> str:
    return (TODAY + timedelta(days=days)).isoformat()


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def birthday(age: int, month_offset: int = 3) -> str:
    base = add_months(TODAY, month_offset)
    try:
        return date(TODAY.year - age, base.month, base.day).isoformat()
    except ValueError:
        return date(TODAY.year - age, base.month, 28).isoformat()


def login() -> str:
    r = requests.post(f"{BASE_URL}/auth/login",
                      data={"username": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        print(f"❌ Login falhou ({r.status_code}): {r.text}")
        sys.exit(1)
    token = r.json()["access_token"]
    print(f"✅ Login ok — {EMAIL}")
    return token


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def ensure_plans(token: str) -> dict:
    """Return {name: id} map, creating plans if needed."""
    existing = requests.get(f"{BASE_URL}/plans", headers=headers(token)).json()
    plan_map = {p["name"]: p["id"] for p in existing}

    needed = [
        {"name": "Mensal 2x", "price": 150.0, "description": "2x por semana"},
        {"name": "Mensal 3x", "price": 200.0, "description": "3x por semana"},
        {"name": "Mensal 5x", "price": 280.0, "description": "5x por semana"},
    ]
    for p in needed:
        if p["name"] not in plan_map:
            r = requests.post(f"{BASE_URL}/plans", json=p, headers=headers(token))
            if r.status_code == 201:
                plan_map[p["name"]] = r.json()["id"]
                print(f"  Plano criado: {p['name']}")
            else:
                print(f"  ⚠️  Plano {p['name']}: {r.status_code} {r.text}")

    return plan_map


def create_student(token: str, data: dict) -> str | None:
    r = requests.post(f"{BASE_URL}/students", json=data, headers=headers(token))
    if r.status_code == 201:
        return r.json()["id"]
    print(f"  ⚠️  Aluno {data['name']}: {r.status_code} {r.text}")
    return None


def set_payment_dates(token: str, sid: str, ultimo: str, proximo: str):
    r = requests.put(f"{BASE_URL}/students/{sid}", json={
        "ultimo_pagamento": ultimo,
        "proximo_pagamento": proximo,
    }, headers=headers(token))
    if r.status_code != 200:
        print(f"  ⚠️  set_payment_dates: {r.status_code} {r.text}")


def main():
    print(f"🎯 Conectando em {BASE_URL}\n")
    token = login()

    print("\n📋 Planos...")
    plans = ensure_plans(token)
    p2x = plans.get("Mensal 2x")
    p3x = plans.get("Mensal 3x")
    p5x = plans.get("Mensal 5x")

    # name, training_days, plan_id, due_day, prox_offset (None=nunca), age, bday_month_offset
    SCENARIOS = [
        ("Ana Silva",       ["mon","wed"],                p2x, 10,  -15, 28,  0),  # VENCIDA 15d · aniversário hoje
        ("Carlos Souza",    ["tue","thu","sat"],          p3x,  5,   -3, 32,  1),  # VENCIDA 3d  · aniversário em 1 mês
        ("Fernanda Lima",   ["mon","wed","fri"],          p3x, 15,   +1, 25,  3),  # VENCE AMANHÃ
        ("João Pereira",    ["mon","tue","wed","thu","fri"], p5x, 20, +2, 35, 3),  # VENCE EM 2 DIAS
        ("Mariana Costa",   ["mon","wed"],                p2x, 10,   +3, 29,  3),  # VENCE EM 3 DIAS
        ("Patricia Gomes",  ["tue","thu"],                p2x,  1,  +14, 40,  0),  # em dia · aniversário hoje
        ("Lucas Martins",   ["mon","wed","fri"],          p3x,  5,  +21, 22,  3),  # em dia
        ("Roberto Alves",   ["tue","thu","sat"],          p5x, 15,  +30, 38,  3),  # em dia
        ("Camila Rocha",    ["mon","wed","fri"],          p3x, 10, None, 27,  3),  # nunca pagou
        ("Diego Santos",    ["mon","tue","wed","thu","fri"], p5x, 25, +32, 33, 3), # pagou hoje
    ]

    print("\n👥 Criando alunos...")
    for name, training_days, plan_id, due_day, prox_offset, age, bday_month in SCENARIOS:
        if not plan_id:
            print(f"  ⚠️  {name}: plano não encontrado, pulando")
            continue

        sid = create_student(token, {
            "name":          name,
            "phone":         f"11987654321",
            "email":         f"{name.split()[0].lower()}@teste.com",
            "birthday":      birthday(age, bday_month),
            "training_days": training_days,
            "plan_id":       plan_id,
            "due_day":       due_day,
            "notes":         "",
        })
        if not sid:
            continue

        if prox_offset is not None:
            prox = offset(prox_offset)
            ult  = add_months(TODAY + timedelta(days=prox_offset), -1).isoformat()
            set_payment_dates(token, sid, ult, prox)

        # status label
        if prox_offset is None:
            status = "nunca pagou"
        elif prox_offset < 0:
            status = f"VENCIDA há {abs(prox_offset)} dias"
        elif prox_offset == 0:
            status = "VENCE HOJE"
        elif prox_offset <= 3:
            status = f"vence em {prox_offset} dia(s)"
        else:
            status = f"em dia ({prox_offset} dias)"

        bday_note = " 🎂 aniversário hoje" if bday_month == 0 else ""
        print(f"  ✅ {name:<22} {status}{bday_note}")

    print("\n✅ Seed via API concluído!")


if __name__ == "__main__":
    main()

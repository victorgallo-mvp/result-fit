import calendar
from datetime import datetime, date
from app.database import get_db


async def get_avaliacoes() -> dict:
    db = get_db()
    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    last_day_dt = datetime.combine(
        date(today.year, today.month, calendar.monthrange(today.year, today.month)[1]),
        datetime.max.time(),
    )

    students = await db.students.find(
        {
            "status": "active",
            "proxima_avaliacao": {"$ne": None, "$lte": last_day_dt},
        },
        {"_id": 1, "name": 1, "ultima_avaliacao": 1, "proxima_avaliacao": 1, "avaliacao_frequencia": 1},
    ).sort("proxima_avaliacao", 1).to_list(length=500)

    vencidas, do_mes = [], []
    for s in students:
        pa = s.get("proxima_avaliacao")
        ua = s.get("ultima_avaliacao")
        item = {
            "id": str(s["_id"]),
            "name": s.get("name", ""),
            "ultima_avaliacao": ua.strftime("%Y-%m-%d") if ua else None,
            "proxima_avaliacao": pa.strftime("%Y-%m-%d") if pa else None,
            "avaliacao_frequencia": s.get("avaliacao_frequencia", 3),
        }
        if pa < today_dt:
            vencidas.append(item)
        else:
            do_mes.append(item)

    return {
        "vencidas": vencidas,
        "do_mes": do_mes,
        "total_vencidas": len(vencidas),
        "total_do_mes": len(do_mes),
    }

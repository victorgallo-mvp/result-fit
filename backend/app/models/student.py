from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date

Periodicidade = Literal["mensal", "trimestral", "semestral", "anual"]

# quantos meses cada periodicidade cobre — define o próximo vencimento
PERIODICIDADE_MESES: dict[str, int] = {
    "mensal": 1,
    "trimestral": 3,
    "semestral": 6,
    "anual": 12,
}

PERIODICIDADE_LABEL: dict[str, str] = {
    "mensal": "Mensal",
    "trimestral": "Trimestral",
    "semestral": "Semestral",
    "anual": "Anual",
}


class StudentCreate(BaseModel):
    name: str
    phone: str
    birthday: Optional[date] = None
    weekly_frequency: int = 3
    periodicidade: Periodicidade = "mensal"
    # valor cobrado por período (mês, trimestre, semestre ou ano)
    valor: float
    notes: str = ""
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None
    ultima_avaliacao: Optional[date] = None
    avaliacao_frequencia: int = 3


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[date] = None
    weekly_frequency: Optional[int] = None
    periodicidade: Optional[Periodicidade] = None
    valor: Optional[float] = None
    status: Optional[Literal["active", "inactive"]] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None
    ultima_avaliacao: Optional[date] = None
    avaliacao_frequencia: Optional[int] = None

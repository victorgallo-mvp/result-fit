from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from datetime import date


class StudentCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    birthday: Optional[date] = None
    weekly_frequency: int = 3
    plan_id: str
    # vazio = usa o preço do plano; preenchido = valor combinado só com este aluno
    preco_personalizado: Optional[float] = None
    notes: str = ""
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None
    ultima_avaliacao: Optional[date] = None
    avaliacao_frequencia: int = 3


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    birthday: Optional[date] = None
    weekly_frequency: Optional[int] = None
    plan_id: Optional[str] = None
    preco_personalizado: Optional[float] = None
    status: Optional[Literal["active", "inactive"]] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None
    ultima_avaliacao: Optional[date] = None
    avaliacao_frequencia: Optional[int] = None

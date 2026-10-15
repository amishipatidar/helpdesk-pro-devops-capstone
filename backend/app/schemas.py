from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Category = Literal["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "TECHNICAL", "BILLING"]
Priority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
Status = Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    requester: str = Field(default="Employee", min_length=1, max_length=120)
    category: Category = "TECHNICAL"
    priority: Priority = "MEDIUM"
    status: Status = "OPEN"


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    requester: str | None = Field(default=None, min_length=1, max_length=120)
    category: Category | None = None
    priority: Priority | None = None
    status: Status | None = None


class TicketOut(TicketCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatsOut(BaseModel):
    total: int
    open: int
    inProgress: int
    resolved: int
    critical: int

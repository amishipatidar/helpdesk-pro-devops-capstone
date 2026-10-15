from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .models import Ticket
from .schemas import Category, Priority, StatsOut, Status, TicketCreate, TicketOut, TicketUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist on startup if running with SQLite or local DB
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        # In production, Alembic handles migrations before the server starts
        pass
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "online",
    }


@app.get("/health")
def health():
    return {"status": "UP"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(select(func.count(Ticket.id)))
        return {"status": "READY", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unreachable: {str(exc)}",
        )


@app.get("/api/tickets", response_model=list[TicketOut])
def list_tickets(
    search: str | None = Query(default=None, description="Search by title, requester, or description"),
    status: Status | None = Query(default=None, description="Filter by status"),
    category: Category | None = Query(default=None, description="Filter by category"),
    priority: Priority | None = Query(default=None, description="Filter by priority"),
    db: Session = Depends(get_db),
):
    stmt = select(Ticket)

    if search:
        search_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Ticket.title.ilike(search_term),
                Ticket.requester.ilike(search_term),
                Ticket.description.ilike(search_term),
            )
        )

    if status:
        stmt = stmt.where(Ticket.status == status)

    if category:
        stmt = stmt.where(Ticket.category == category)

    if priority:
        stmt = stmt.where(Ticket.priority == priority)

    stmt = stmt.order_by(Ticket.id.desc())
    return list(db.scalars(stmt))


@app.get("/api/tickets/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    status_counts = dict(
        db.execute(select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)).all()
    )
    critical_count = db.scalar(
        select(func.count(Ticket.id)).where(Ticket.priority == "CRITICAL")
    ) or 0

    total = sum(status_counts.values())
    open_count = status_counts.get("OPEN", 0)
    in_progress = status_counts.get("IN_PROGRESS", 0)
    resolved = status_counts.get("RESOLVED", 0) + status_counts.get("CLOSED", 0)

    return StatsOut(
        total=total,
        open=open_count,
        inProgress=in_progress,
        resolved=resolved,
        critical=critical_count,
    )


@app.get("/api/tickets/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found",
        )
    return ticket


@app.post("/api/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@app.put("/api/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: int, payload: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ticket, key, value)

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/api/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found",
        )
    db.delete(ticket)
    db.commit()
    return None

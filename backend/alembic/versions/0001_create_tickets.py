"""create tickets table

Revision ID: 0001_create_tickets
Revises:
Create Date: 2026-10-14 19:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_create_tickets"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("requester", sa.String(length=120), nullable=False, server_default="Support User"),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="TECHNICAL"),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="MEDIUM"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_tickets_id"), "tickets", ["id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_tickets_id"), table_name="tickets")
    op.drop_table("tickets")

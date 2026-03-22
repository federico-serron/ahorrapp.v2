"""ensure user.is_premium exists and defaults to false

Revision ID: c4a8e1f2d9b6
Revises: b7e4c2a9f1d3
Create Date: 2026-03-22 21:05:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'c4a8e1f2d9b6'
down_revision = 'b7e4c2a9f1d3'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL-safe idempotent patch for environments with drifted user schema.
    op.execute(
        """
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE
        """
    )

    op.execute(
        """
        UPDATE "user"
        SET is_premium = FALSE
        WHERE is_premium IS NULL
        """
    )

    op.execute(
        """
        ALTER TABLE "user"
        ALTER COLUMN is_premium SET DEFAULT FALSE
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE "user"
        DROP COLUMN IF EXISTS is_premium
        """
    )

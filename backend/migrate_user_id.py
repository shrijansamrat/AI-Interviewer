
from sqlalchemy import text

from database import engine


with engine.begin() as connection:
    connection.execute(
        text(
            """
            ALTER TABLE interviews
            ADD COLUMN IF NOT EXISTS user_id INTEGER
            REFERENCES users(id)
            """
        )
    )

print("Interview user_id column added successfully.")
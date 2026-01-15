
from database import SessionLocal, engine
from sqlalchemy import text
import models

# Add class_id column to announcements if not exists
def migrate_announcements():
    db = SessionLocal()
    try:
        # Check if column exists (Postgres/SQLite syntax varies, using a basic add column catch)
        try:
             # Try adding - if it fails it likely exists
             with engine.connect() as conn:
                 conn.execute(text("ALTER TABLE announcements ADD COLUMN class_id INTEGER REFERENCES classes(id)"))
                 conn.commit()
                 print("✅ Added class_id column to announcements table.")
        except Exception as e:
             print(f"⚠️  Column might already exist or error: {e}")
             
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_announcements()

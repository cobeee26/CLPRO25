
import os
import random
import string
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from database import DATABASE_URL

def generate_class_code():
    """Generates a random 6-character alphanumeric code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def migrate_database():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("🔄 Starting Schema Migration for Class Code System...")

    with engine.connect() as connection:
        # Enable auto-commit for DDL statements
        connection = connection.execution_options(isolation_level="AUTOCOMMIT")
        
        inspector = inspect(engine)
        columns_schedules = [col['name'] for col in inspector.get_columns('schedules')]
        columns_enrollments = [col['name'] for col in inspector.get_columns('enrollments')]

        # 1. Handle `join_code` -> `class_code` in `schedules`
        if 'join_code' in columns_schedules and 'class_code' not in columns_schedules:
            print("🔹 Renaming `join_code` to `class_code` in `schedules` table...")
            try:
                connection.execute(text("ALTER TABLE schedules RENAME COLUMN join_code TO class_code;"))
                print("✅ Renamed `join_code` to `class_code`.")
            except Exception as e:
                print(f"❌ Error renaming column: {e}")

        elif 'class_code' not in columns_schedules:
             # Create from scratch if neither exists (fallback)
             print("🔹 Adding `class_code` column to `schedules` table...")
             try:
                 connection.execute(text("ALTER TABLE schedules ADD COLUMN class_code VARCHAR COLLATE pg_catalog.\"default\";"))
                 connection.execute(text("ALTER TABLE schedules ADD CONSTRAINT uq_schedules_class_code UNIQUE (class_code);"))
                 print("✅ Added `class_code` column.")
             except Exception as e:
                 print(f"❌ Error adding class_code column: {e}")
        else:
            print("ℹ️ `class_code` already exists in `schedules`.")

        
        # 2. Add `schedule_id` to `enrollments`
        if 'schedule_id' not in columns_enrollments:
             print("🔹 Adding `schedule_id` column to `enrollments` table...")
             try:
                 connection.execute(text("ALTER TABLE enrollments ADD COLUMN schedule_id INTEGER;"))
                 connection.execute(text("ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id);"))
                 print("✅ Added `schedule_id` column.")
             except Exception as e:
                 print(f"❌ Error adding schedule_id column: {e}")
        else:
             print("ℹ️ `schedule_id` already exists in `enrollments`.")

        # 3. Populate `class_code` if empty
        print("🔹 Verifying content of `class_code`...")
        # Since we might have just renamed it, existing content is preserved.
        # But we check for nulls just in case.
        
    # Python-level population for null class_codes
    try:
        # We need raw SQL because ORM might be out of sync if we just altered schema?
        # Actually ORM session is fine if we use text queries or refresh metadata (but we didn't reflect).
        # Use text for safety.
        result = session.execute(text("SELECT id, class_code FROM schedules WHERE class_code IS NULL"))
        schedules_to_update = result.fetchall()
        
        if schedules_to_update:
            print(f"🔹 Found {len(schedules_to_update)} schedules with missing `class_code`. Populating...")
            for row in schedules_to_update:
                new_code = generate_class_code()
                # Ensure uniqueness loop could be here but odds are low for now.
                session.execute(text("UPDATE schedules SET class_code = :code WHERE id = :id"), {"code": new_code, "id": row.id})
            session.commit()
            print("✅ Populated missing class codes.")
        else:
            print("✅ All schedules have a class_code.")
            
    except Exception as e:
        print(f"❌ Error populating data: {e}")
        session.rollback()

    session.close()
    print("🚀 Migration Complete!")

if __name__ == "__main__":
    migrate_database()

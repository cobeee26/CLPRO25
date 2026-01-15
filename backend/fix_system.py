import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from database import SessionLocal, engine
from models import User, UserRole
from sqlalchemy import text

def fix_system():
    db = SessionLocal()
    try:
        # 1. Fix Admin Role
        admin = db.query(User).filter(User.username == "admin@classtrack.edu").first()
        if admin:
            if admin.role != UserRole.ADMIN:
                print(f"⚠️ Admin user has role {admin.role}. Fixing to ADMIN...")
                admin.role = UserRole.ADMIN
                db.commit()
                print("✅ Admin role fixed.")
            else:
                print("✅ Admin role is already correct.")
        else:
            print("❌ Admin user not found.")

        # 2. Force Add Columns (Manual Check)
        with engine.connect() as conn:
            conn.execute(text("COMMIT")) # Ensure isolation level allows DDL
            
            # Check/Add schedules.join_code
            try:
                conn.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS join_code VARCHAR(50)"))
                conn.commit()
                print("✅ Verified/Added schedules.join_code")
            except Exception as e:
                print(f"⚠️ Error checking schedules.join_code: {e}")
                
            # Check/Add attendance.schedule_id
            try:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES schedules(id)"))
                conn.commit()
                print("✅ Verified/Added attendance.schedule_id")
            except Exception as e:
                print(f"⚠️ Error checking attendance.schedule_id: {e}")

    except Exception as e:
        print(f"❌ Error during fix: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_system()

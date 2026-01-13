from database import SessionLocal, engine
from models import Schedule
import random
import string
from sqlalchemy import text, inspect

def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def migrate():
    print("--- MIGRATING DATABASE: ADD join_code (FIXED) ---")
    
    # 1. Check if column exists using Inspector (Safe, no transaction abort)
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('schedules')]
    
    if 'join_code' in columns:
        print("Column 'join_code' already exists.")
    else:
        print("Column 'join_code' does not exist. Adding...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE schedules ADD COLUMN join_code VARCHAR"))
            conn.commit()
            print("Column added.")

    # 2. Populate existing rows
    db = SessionLocal()
    schedules = db.query(Schedule).all()
    print(f"Populating {len(schedules)} existing schedules...")
    
    existing_codes = set()
    
    # Pre-fetch existing codes if any
    try:
        # If column existed but had values
        pass 
    except:
        pass

    import time
    count = 0
    for s in schedules:
        if not s.join_code:
            code = generate_code()
            while code in existing_codes:
                code = generate_code()
            s.join_code = code
            existing_codes.add(code)
            count += 1
        else:
            existing_codes.add(s.join_code)
            
    if count > 0:
        db.commit()
        print(f"Populated {count} schedules.")
    else:
        print("No schedules needed population.")
    
    # 3. Add Constraints (Unique) using Inspector to check first
    # Or just try/except with new connection to ensure clean state
    
    try:
        with engine.connect() as conn:
             # Check constraints?
             # Just try adding it, if fails, catch it.
             conn.execute(text("ALTER TABLE schedules ADD CONSTRAINT uq_join_code UNIQUE (join_code)"))
             conn.commit()
             print("Unique constraint added.")
    except Exception as e:
        print(f"Constraint might already exist or error: {e}")

if __name__ == "__main__":
    migrate()

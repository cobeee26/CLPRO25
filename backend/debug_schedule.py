from database import SessionLocal
from models import User, Class, Schedule, UserRole
from datetime import datetime

db = SessionLocal()

def debug_schedule():
    # 1. Provide Context
    print("--- DEBUGGING SCHEDULE DATA ---")
    
    # 2. Find Teacher
    teacher_email = "teacher@classtrack.edu"
    # Note: User model has no email column in current schema view (Step 566), only username.
    # Assuming username might be the email or "teacher".
    # User mentioned "teacher@classtrack.edu". I'll try username "teacher" or search.
    
    # Let's list all teachers
    teachers = db.query(User).filter(User.role == UserRole.TEACHER).all()
    print(f"Found {len(teachers)} teachers:")
    target_teacher = None
    for t in teachers:
        print(f" - ID: {t.id}, Username: {t.username}, Name: {t.first_name} {t.last_name}")
        if t.username == "teacher" or "teacher" in t.username:
            target_teacher = t
            
    if not target_teacher:
        print("!! Could not find target teacher automatically. Using first teacher found.")
        if teachers:
            target_teacher = teachers[0]
        else:
            print("No teachers found.")
            return

    print(f"\nTarget Teacher: ID {target_teacher.id} ({target_teacher.username})")
    
    # 3. List Classes
    classes = db.query(Class).filter(Class.teacher_id == target_teacher.id).all()
    print(f"\nClasses assigned to teacher ({len(classes)}):")
    for c in classes:
        print(f" - ID: {c.id}, Code: {c.code}, Name: {c.name}")
        
    # 4. List Schedules
    schedules = db.query(Schedule).join(Class).filter(Class.teacher_id == target_teacher.id).all()
    print(f"\nSchedules for teacher ({len(schedules)}):")
    for s in schedules:
        print(f" - Class: {s.class_.name}, Start: {s.start_time}, End: {s.end_time}, Room: {s.room_number}")
        
    # 5. Check CRUD logic simulation
    print("\n--- SIMULATING CRUD QUERY for 'CNLPSY' ---")
    subject_query = "CNLPSY"
    query = db.query(Schedule).join(Class).filter(Class.teacher_id == target_teacher.id)
    query = query.filter(
        (Class.name.ilike(f"%{subject_query}%")) | 
        (Class.code.ilike(f"%{subject_query}%"))
    )
    results = query.all()
    print(f"Query Result Count: {len(results)}")
    for r in results:
        print(f" - MATCH: {r.class_.name} at {r.start_time}")

if __name__ == "__main__":
    debug_schedule()

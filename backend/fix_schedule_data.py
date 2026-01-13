from database import SessionLocal
from models import User, Class, Schedule
from datetime import datetime, timedelta

db = SessionLocal()

def fix_data():
    print("--- FIXING SCHEDULE DATA ---")
    
    # 1. Get Teacher
    teacher = db.query(User).filter(User.username == "teacher@classtrack.edu").first()
    if not teacher:
        print("Teacher not found!")
        return
    print(f"Teacher found: {teacher.id}")
    
    # 2. Get/Create Class
    # Check if 'CNLPSY' exists
    cls = db.query(Class).filter(Class.code == "CNLPSY").first()
    if not cls:
        print("Creating Class CNLPSY...")
        cls = Class(name="Clinical Psychology", code="CNLPSY", teacher_id=teacher.id)
        db.add(cls)
        db.commit()
        db.refresh(cls)
    else:
        print(f"Class found: {cls.name}. Updating teacher...")
        cls.teacher_id = teacher.id
        db.commit()
        
    print(f"Class ID: {cls.id} assigned to Teacher {teacher.id}")
    
    # 3. Create/Update Schedule
    # User said: "Saturday, 02:00 AM - 05:00 AM in Room 314"
    # Find next Saturday
    today = datetime.utcnow()
    # 0=Mon, 5=Sat
    days_ahead = 5 - today.weekday()
    if days_ahead <= 0: # Target day already happened this week
        days_ahead += 7
    next_saturday = today + timedelta(days=days_ahead)
    
    # Set time to 2:00 AM
    start_time = next_saturday.replace(hour=2, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=3) # 5:00 AM
    
    # Check if schedule exists
    sched = db.query(Schedule).filter(
        Schedule.class_id == cls.id,
        Schedule.start_time == start_time
    ).first()
    
    if not sched:
        print(f"Creating Schedule for {start_time}...")
        sched = Schedule(
            class_id=cls.id,
            start_time=start_time,
            end_time=end_time,
            room_number="Room 314",
            status="Occupied"
        )
        db.add(sched)
        db.commit()
        print("Schedule created.")
    else:
        print("Schedule already exists.")
        
    print("--- DATA FIX COMPLETE ---")

if __name__ == "__main__":
    fix_data()

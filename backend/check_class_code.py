from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Schedule
from database import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

schedules = db.query(Schedule).all()
print(f"Found {len(schedules)} schedules.")
for s in schedules:
    print(f"ID: {s.id}, ClassID: {s.class_id}, Start: {s.start_time}, Class Code: '{s.class_code}'")

db.close()

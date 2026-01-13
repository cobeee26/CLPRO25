from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

def check_user(email: str):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.username == email).first()
        if user:
            print(f"User Found: {user.username}")
            print(f"Role: {user.role.value}")
        else:
            print("User NOT found")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user("neney@classtrack.edu")

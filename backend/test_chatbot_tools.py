from database import SessionLocal
import crud
import models

db = SessionLocal()
try:
    print("Testing School Stats...")
    stats = crud.get_school_stats(db)
    print("Stats:", stats)

    print("\nTesting Vacant Rooms...")
    rooms = crud.get_vacant_rooms(db)
    print("Rooms:", rooms)

    print("\nTesting User Masterlist...")
    users = crud.get_user_masterlist(db)
    print(f"Users found: {len(users)}")
    if users:
        print("First user:", users[0])
        
finally:
    db.close()

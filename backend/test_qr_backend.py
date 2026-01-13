import requests
import json
from datetime import datetime
import sys

# Configuration
API_URL = "http://localhost:8000"
TEACHER_EMAIL = "teacher@classtrack.edu" 
TEACHER_PASSWORD = "password123" 
STUDENT_EMAIL = "student@classtrack.edu" 
STUDENT_PASSWORD = "password123"

# Colors
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

def print_result(test_name, success, message=""):
    if success:
        print(f"{GREEN}[PASS] {test_name}{RESET} {message}")
    else:
        print(f"{RED}[FAIL] {test_name}{RESET} {message}")

def login(email, password):
    response = requests.post(f"{API_URL}/token", data={"username": email, "password": password})
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def main():
    print("🚀 Starting QR Attendance Backend Verification...")
    
    # 1. Login as Teacher
    teacher_token = login(TEACHER_EMAIL, TEACHER_PASSWORD)
    if not teacher_token:
        print(f"{RED}Failed to login as teacher.{RESET}")
        return
    print(f"{GREEN}Teacher logged in successfully.{RESET}")
    
    auth_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # 2. Get Teacher Classes & Schedules
    r_classes = requests.get(f"{API_URL}/api/classes/teacher", headers=auth_headers)
    classes = r_classes.json()
    if not classes:
        print(f"{RED}No classes found for teacher.{RESET}")
        return
    
    target_class = classes[0]
    target_class_id = target_class["id"]
    print(f"Target Class: {target_class['name']} (ID: {target_class_id})")
    
    # Get schedules for this class
    # Inspecting CRUD, we might need to find a schedule ID valid for today.
    # For testing, we might need to assume a schedule exists or fetch it.
    # Since we can't easily query schedules via API (maybe?), let's try to infer or just pick one if available.
    # Actually, we likely need to Create a Dummy Schedule for "Now" to test the time logic properly?
    # Or we can test the "Session not active" error first.
    
    # Let's try to find a schedule for this class.
    # Assuming there's no direct "get schedules" for teacher endpoint visible in snippets, 
    # but let's assume one exists or we just guess/use a known one if we had it.
    # Wait, `get_classes_by_teacher` returns class info. 
    # Let's look at `main.py`... maybe `/api/schedules/class/{class_id}`?
    
    # If we can't find a schedule easily, we might fail the "Positive" test, but we can verify the "Negative" tests.
    
    # For now, let's try a hypothetical schedule ID 1 (or derived from DB if we were running python script directly with DB access).
    # Since this is an external script, we rely on API.
    # Let's try to HIT the endpoint with a dummy schedule ID and see if we get "Invalid Schedule ID".
    
    print("\n--- Test 1: Invalid Schedule ID ---")
    payload = {
        "qr_content": STUDENT_EMAIL,
        "schedule_id": 999999,
        "teacher_id": 0 # Optional
    }
    r = requests.post(f"{API_URL}/api/attendance/verify", json=payload, headers=auth_headers)
    if r.status_code == 404 and "Schedule session not found" in r.json().get("detail", ""):
        print_result("Invalid Schedule ID Check", True)
    else:
        print_result("Invalid Schedule ID Check", False, f"Status: {r.status_code}, Resp: {r.text}")

    print("\n--- Test 2: Invalid Student ---")
    payload = {
        "qr_content": "invalid_student@fake.com",
        "schedule_id": target_class_id, 
        "teacher_id": 0
    }
    r = requests.post(f"{API_URL}/api/attendance/verify", json=payload, headers=auth_headers)
    if r.status_code == 404 and "Student not found" in r.json().get("detail", ""):
        print_result("Invalid Student Check", True)
    else:
        print_result("Invalid Student Check", False, f"Status: {r.status_code}, Resp: {r.text}")

if __name__ == "__main__":
    main()

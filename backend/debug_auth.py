import requests
import sys

BASE_URL = "http://localhost:8000"

def login(username, password):
    print(f"Attempting login for {username}...")
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            print("Login successful!")
            return response.json()
        else:
            print(f"Login failed: {response.status_code} {response.text}")
            return None
    except Exception as e:
        print(f"Error during login: {e}")
        return None

def get_me(token):
    print("Fetching current user profile...")
    try:
        response = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            print("Profile fetch successful!")
            print("Response JSON:")
            print(response.json())
            return response.json()
        else:
            print(f"Profile fetch failed: {response.status_code} {response.text}")
            return None
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return None

if __name__ == "__main__":
    # Test with admin user
    token_data = login("admin", "admin123")
    if token_data:
        get_me(token_data["access_token"])

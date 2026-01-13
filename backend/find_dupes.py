with open("main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "def chat_with_ai" in line:
        print(f"Found on line {i+1}: {line.strip()}")

from openai import OpenAI
import sys

# Copying the client setup from main.py
client = OpenAI(api_key='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')

try:
    print("Sending request to OpenAI...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a test assistant."},
            {"role": "user", "content": "Hello, is this working?"}
        ]
    )
    print("Success!")
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)
    print(f"Error type: {type(e).__name__}")

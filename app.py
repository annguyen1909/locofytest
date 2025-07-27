
# Simple FastAPI server for UI element detection
import os
import json
import base64
from fastapi import FastAPI, File, UploadFile
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create FastAPI app and OpenAI client
app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    # Read the uploaded image
    image_data = await image.read()
    image_base64 = base64.b64encode(image_data).decode("utf-8")
    
    # Ask OpenAI to find UI elements
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Find UI elements in this image. Only detect: Button, Input, Radio, Dropdown. Return JSON array with format: [{'tag': 'Button', 'x1': 10, 'y1': 20, 'x2': 100, 'y2': 50}]"
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{image_base64}"}
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        # Get the response text
        ai_response = response.choices[0].message.content
        
        # Extract JSON from response
        boxes = []
        if ai_response:
            # Remove markdown if present
            json_text = ai_response
            if "```json" in ai_response:
                json_text = ai_response.split("```json")[1].split("```")[0]
            elif "```" in ai_response:
                json_text = ai_response.split("```")[1]
            
            # Parse the JSON
            try:
                boxes = json.loads(json_text.strip())
            except:
                boxes = []
        
        return {"boxes": boxes}
        
    except Exception as e:
        return {"boxes": [], "error": str(e)}

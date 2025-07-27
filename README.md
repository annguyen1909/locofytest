# UI Element Detection Tool

## Overview
A web-based tool for labeling UI elements in screenshots and evaluating AI model predictions. Built with Next.js (frontend) and FastAPI (backend).

## Features
- Upload UI screenshots
- Draw bounding boxes and assign tags (Button, Input, Radio, Dropdown)
- Save labeled results as JSON
- AI-powered detection using OpenAI GPT-4 Vision
- Evaluate AI predictions against ground truth

## Requirements
- Node.js 18+
- Python 3.9+
- OpenAI API Key

## Setup

1. **Clone the repository**
2. **Set up Python environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install Python dependencies**
   ```bash
   pip install fastapi uvicorn openai python-dotenv pillow python-multipart
   ```
4. **Install Node.js dependencies**
   ```bash
   npm install
   ```
5. **Add your OpenAI API key**
   ```bash
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
   ```

## Running the App

1. **Start the backend**
   ```bash
   python3 -m uvicorn app:app --reload
   ```
2. **Start the frontend** (in a new terminal)
   ```bash
   npm run dev
   ```
3. **Go to the labeling tool**
   [http://localhost:3000/labeler](http://localhost:3000/labeler)

## Usage

### Manual Labeling
- Upload an image
- Select element type
- Draw bounding boxes
- Save as JSON (at `ground_truth/`)

### AI Detection
- Upload an image
- Click "AI Auto-Detect"
- Download results as JSON (at `predictions/`)

### Evaluation
Compare AI predictions with ground truth:
```bash
python3 evaluate_tags.py --gt ground_truth/ --pred predictions/
```

## Project Structure
- `app.py` — FastAPI backend
- `evaluate_tags.py` — Evaluation script
- `src/app/labeler/page.tsx` — Frontend labeling interface
- `src/app/api/predict/route.ts` — API route for AI detection
- `ground_truth/` — Ground truth JSON files
- `predictions/` — AI prediction JSON files

## Supported Tags
- Button
- Input
- Radio
- Dropdown

## Note About Data
- The `ground_truth/` and `predictions/` folders already contain 100 JSON files each for demonstration and evaluation.
- If you want to test with your own images and results, simply delete all files in these folders and add your new data.



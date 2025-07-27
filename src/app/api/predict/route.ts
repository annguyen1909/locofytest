import { NextRequest, NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  // Get image from request
  const formData = await req.formData();
  const file = formData.get('image');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  // Forward image to Python backend
  const pythonFormData = new FormData();
  pythonFormData.append('image', file);

  const response = await fetch('http://localhost:8000/predict', {
    method: 'POST',
    body: pythonFormData,
  });

  const result = await response.json();
  // Return only boxes for frontend display
  return NextResponse.json({
    boxes: result.boxes || []
  });
}

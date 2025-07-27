'use client';
import React, { useRef, useState } from 'react';
import Image from 'next/image';

// Available UI element tags for labeling
const TAGS = ['Button', 'Input', 'Radio', 'Dropdown'];

// Fixed display dimensions for consistent image sizing
const DISPLAY_SIZE = {
  maxWidth: 800,
  maxHeight: 600
};

interface Box {
  tag: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function Labeler() {
  // Image and display state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [scaleRatio, setScaleRatio] = useState<number>(1);
  
  // Labeling state
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [drawing, setDrawing] = useState<{ x1: number; y1: number } | null>(null);
  const [currentTag, setCurrentTag] = useState<string>(TAGS[0]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Converts display coordinates to actual image coordinates
   */
  const displayToImageCoords = (x: number, y: number) => ({
    x: Math.round(x / scaleRatio),
    y: Math.round(y / scaleRatio)
  });

  /**
   * Handles image file upload and calculates appropriate display dimensions
   * Maintains aspect ratio while fitting within fixed maximum size
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageFile(file);
      setBoxes([]); // Clear existing boxes when new image is loaded
      
      // Calculate display dimensions while maintaining aspect ratio
      const img = new window.Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        // Calculate scale to fit within max dimensions
        const widthScale = DISPLAY_SIZE.maxWidth / naturalWidth;
        const heightScale = DISPLAY_SIZE.maxHeight / naturalHeight;
        const scale = Math.min(widthScale, heightScale, 1); // Don't upscale
        
        const displayWidth = Math.round(naturalWidth * scale);
        const displayHeight = Math.round(naturalHeight * scale);
        
        setDisplaySize({ width: displayWidth, height: displayHeight });
        setScaleRatio(scale);
      };
      img.src = url;
    }
  };

  /**
   * Handles mouse down event to start drawing a bounding box
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const imageCoords = displayToImageCoords(displayX, displayY);
    
    setDrawing({
      x1: imageCoords.x,
      y1: imageCoords.y,
    });
  };

  /**
   * Handles mouse move event to update cursor position and drawing preview
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  /**
   * Handles mouse up event to complete bounding box drawing
   */
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const imageCoords = displayToImageCoords(displayX, displayY);
    
    // Only create box if it has meaningful size
    const minSize = 5 / scaleRatio;
    if (Math.abs(imageCoords.x - drawing.x1) > minSize && Math.abs(imageCoords.y - drawing.y1) > minSize) {
      setBoxes([...boxes, { 
        ...drawing, 
        x2: imageCoords.x, 
        y2: imageCoords.y, 
        tag: currentTag
      }]);
    }
    setDrawing(null);
  };

  /**
   * Changes the current tag for new bounding boxes
   */
  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentTag(e.target.value);
  };

  /**
   * Resets all boxes and drawing state
   */
  const handleReset = () => {
    setBoxes([]);
    setDrawing(null);
    setMousePos(null);
  };

  /**
   * Downloads the current boxes as a JSON file
   */
  const handleSave = () => {
    // Reorder properties for each box
    const reorderedBoxes = boxes.map(box => ({
      tag: box.tag,
      x1: box.x1,
      y1: box.y1,
      x2: box.x2,
      y2: box.y2
    }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reorderedBoxes, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'labels.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  /**
   * Sends image to AI for automatic UI element detection
   */
  const handlePredict = async () => {
    if (!imageFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      // Use predicted boxes from AI backend
      const predictedBoxes: Box[] = result.boxes || [];
      // Reorder properties for each box
      const reorderedBoxes = predictedBoxes.map(box => ({
        tag: box.tag,
        x1: box.x1,
        y1: box.y1,
        x2: box.x2,
        y2: box.y2
      }));
      setBoxes(reorderedBoxes);
      // Auto-download prediction results
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reorderedBoxes, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', 'ai_predicted_labels.json');
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error('Prediction failed:', error);
      alert('AI prediction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Draws bounding boxes and mouse cursor on canvas
   * Handles coordinate scaling between image and display dimensions
   */
  React.useEffect(() => {
    if (!displaySize) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Helper function to convert image coordinates to display coordinates
    const imageToDisplayCoords = (x: number, y: number) => ({
      x: Math.round(x * scaleRatio),
      y: Math.round(y * scaleRatio)
    });
    
    // Draw existing boxes (scaled to display coordinates)
    boxes.forEach(box => {
      const displayCoords = {
        x1: imageToDisplayCoords(box.x1, box.y1).x,
        y1: imageToDisplayCoords(box.x1, box.y1).y,
        x2: imageToDisplayCoords(box.x2, box.y2).x,
        y2: imageToDisplayCoords(box.x2, box.y2).y,
      };
      
      // Blue color for all boxes
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        displayCoords.x1, 
        displayCoords.y1, 
        displayCoords.x2 - displayCoords.x1, 
        displayCoords.y2 - displayCoords.y1
      );
      
      // Draw tag label
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#3B82F6';
      ctx.fillText(box.tag, displayCoords.x1 + 4, displayCoords.y1 + 18);
    });
    
    // Draw current drawing box
    if (drawing && mousePos) {
      const displayStart = imageToDisplayCoords(drawing.x1, drawing.y1);
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Dashed line for preview
      ctx.strokeRect(
        displayStart.x, 
        displayStart.y, 
        mousePos.x - displayStart.x, 
        mousePos.y - displayStart.y
      );
      ctx.setLineDash([]); // Reset line dash
    }
    
    // Draw mouse cursor indicator
    if (mousePos) {
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.fill();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [boxes, drawing, mousePos, displaySize, scaleRatio]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-gradient-to-r from-blue-500 to-purple-600">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI UI Element Detector
            </h1>
          </div>
          <p className="text-gray-600 mt-2 text-lg">
            Upload an image and let AI detect UI elements or draw your own bounding boxes
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Your Image</h2>
              <p className="text-gray-600">Select an image file to start labeling UI elements</p>
            </div>
            
            <label className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Choose Image File
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Main Content */}
        {imageUrl && displaySize && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Image and Canvas Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Image Labeling</h3>
                </div>
                
                <div 
                  className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50"
                  style={{ width: displaySize.width, height: displaySize.height }}
                >
                  <Image
                    src={imageUrl}
                    alt="UI Design"
                    width={displaySize.width}
                    height={displaySize.height}
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      zIndex: 1,
                      objectFit: 'contain'
                    }}
                    unoptimized
                  />
                  <canvas
                    ref={canvasRef}
                    width={displaySize.width}
                    height={displaySize.height}
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      zIndex: 2,
                      cursor: 'crosshair'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setMousePos(null)}
                  />
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="space-y-6">
              {/* Tag Selection */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Element Type</h3>
                <select 
                  value={currentTag} 
                  onChange={handleTagChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-gray-700 font-medium"
                >
                  {TAGS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button 
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handlePredict}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI Processing...
                      </>
                    ) : (
                      <>
                        AI Auto-Detect
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                    onClick={handleSave}
                  >
                    Save Labels
                  </button>
                  
                  <button 
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                    onClick={handleReset}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Elements:</span>
                    <span className="font-bold text-gray-800">{boxes.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {boxes.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Detected Elements</h3>
            <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-auto">
              <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                {JSON.stringify(boxes, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

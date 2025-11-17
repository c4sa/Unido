import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Navigation
} from "lucide-react";

const FLOOR_MAP_IMAGE_URL = "/floor_map.png";

export default function FloorMap() {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleResetView = () => {
    // Reset zoom and position
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  };


  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 relative">
      {/* Zoom Controls - Fixed in bottom right corner */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          className="bg-white/90 hover:bg-white shadow-lg border-gray-300"
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          className="bg-white/90 hover:bg-white shadow-lg border-gray-300"
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetView}
          className="bg-white/90 hover:bg-white shadow-lg border-gray-300"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Reset View
        </Button>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden relative cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading floor map...</p>
            </div>
          </div>
        )}
        
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <img
            ref={imageRef}
            src={FLOOR_MAP_IMAGE_URL}
            alt="Floor Map"
            style={{
              display: imageLoaded ? 'block' : 'none',
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
            onLoad={() => {
              setImageLoaded(true);
              // Fit image to viewport while maintaining aspect ratio
              if (imageRef.current) {
                const img = imageRef.current;
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Calculate dimensions to fit within viewport (showing full image)
                // Try fitting to width first (for horizontal display)
                let fitWidth = viewportWidth;
                let fitHeight = fitWidth / aspectRatio;
                
                // If height exceeds viewport, fit to height instead
                if (fitHeight > viewportHeight) {
                  fitHeight = viewportHeight;
                  fitWidth = fitHeight * aspectRatio;
                }
                
                // Set dimensions to show full image
                img.style.width = `${fitWidth}px`;
                img.style.height = `${fitHeight}px`;
                img.style.maxWidth = `${fitWidth}px`;
                img.style.maxHeight = `${fitHeight}px`;
                img.style.objectFit = 'contain';
                
                // Reset position and zoom after image loads
                setPosition({ x: 0, y: 0 });
                setZoom(1);
              }
            }}
            onError={(e) => {
              console.error('Error loading floor map image');
              e.target.style.display = 'none';
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Zoom Level Indicator (optional, can be removed if not needed) */}
      <div className="absolute bottom-4 left-4 z-50">
        <div className="bg-white/90 px-3 py-1.5 rounded-md shadow-lg border border-gray-300">
          <span className="text-sm text-slate-600 font-medium">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

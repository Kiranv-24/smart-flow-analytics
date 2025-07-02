
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Square, AlertTriangle } from "lucide-react";

interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WebcamCaptureProps {
  onDetectionUpdate: (predictions: Detection[]) => void;
  onStatusChange: (isActive: boolean) => void;
}

const ROBOFLOW_API_KEY = "qDrma4OYH0YLt5Wh8iEp";
const MODEL_ENDPOINT = "toy-vehicle-detection-te7wp/3";

export const WebcamCapture = ({ onDetectionUpdate, onStatusChange }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<number | null>(null);

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 } // Optimized FPS for performance
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsStreaming(true);
      onStatusChange(true);
      setError("");
      
      // Start detection loop
      const interval = setInterval(performDetection, 200); // 5 FPS detection rate
      setDetectionInterval(interval);
      
    } catch (err) {
      setError("Failed to access webcam. Please ensure camera permissions are granted.");
      console.error("Webcam error:", err);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    
    setIsStreaming(false);
    onStatusChange(false);
  };

  const performDetection = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = imageData.split(',')[1];

    try {
      const response = await fetch(`https://detect.roboflow.com/${MODEL_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: base64Data
      });

      const result = await response.json();
      
      if (result.predictions) {
        onDetectionUpdate(result.predictions);
        drawDetections(ctx, result.predictions, video.videoWidth, video.videoHeight);
      }
    } catch (err) {
      console.error("Detection error:", err);
    }
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, predictions: Detection[], width: number, height: number) => {
    // Clear previous drawings
    ctx.clearRect(0, 0, width, height);
    
    // Redraw video frame
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    }

    // Draw bounding boxes and labels
    predictions.forEach((prediction) => {
      const { x, y, width: boxWidth, height: boxHeight, class: className, confidence } = prediction;
      
      // Calculate box coordinates (Roboflow returns center coordinates)
      const boxX = x - boxWidth / 2;
      const boxY = y - boxHeight / 2;
      
      // Draw bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw label background
      const label = `${className} ${Math.round(confidence * 100)}%`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(boxX, boxY - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#00ff00';
      ctx.fillText(label, boxX + 5, boxY - 5);
    });
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="bg-red-900/50 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-auto max-h-[400px] object-cover"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Click Start to begin detection</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        {!isStreaming ? (
          <Button onClick={startWebcam} className="bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4 mr-2" />
            Start Detection
          </Button>
        ) : (
          <Button onClick={stopWebcam} variant="destructive">
            <Square className="h-4 w-4 mr-2" />
            Stop Detection
          </Button>
        )}
      </div>
    </div>
  );
};

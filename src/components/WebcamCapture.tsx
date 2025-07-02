
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, AlertTriangle, Camera, Settings, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const API_BASE_URL = "http://localhost:8000";

export const WebcamCapture = ({ onDetectionUpdate, onStatusChange }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectionInterval, setDetectionInterval] = useState<NodeJS.Timeout | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  
  // Detection parameters
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [overlapThreshold, setOverlapThreshold] = useState(0.5);
  const [opacityThreshold, setOpacityThreshold] = useState(0.75);
  const [labelDisplayMode, setLabelDisplayMode] = useState("Draw Confidence");
  const [processingTime, setProcessingTime] = useState<number>(0);

  // Check API connection
  const checkApiConnection = async () => {
    setIsCheckingApi(true);
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        setApiConnected(true);
        setError("");
      } else {
        setApiConnected(false);
        setError("Backend API is not responding correctly");
      }
    } catch (err) {
      setApiConnected(false);
      setError("Cannot connect to backend API. Make sure the Python server is running on http://localhost:8000");
      console.error("API connection error:", err);
    } finally {
      setIsCheckingApi(false);
    }
  };

  const startWebcam = async () => {
    if (!apiConnected) {
      setError("Please ensure the backend API is running before starting detection");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
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
      const interval = setInterval(performDetection, 500); // Slower interval for testing
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
    if (!videoRef.current || !canvasRef.current || !apiConnected) return;

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

    try {
      const response = await fetch(`${API_BASE_URL}/detect_frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          confidence_threshold: confidenceThreshold,
          overlap_threshold: overlapThreshold
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.predictions) {
        onDetectionUpdate(result.predictions);
        setProcessingTime(result.processing_time || 0);
        drawDetections(ctx, result.predictions, video.videoWidth, video.videoHeight);
      } else {
        console.warn("Detection failed:", result.error);
      }
    } catch (err) {
      console.error("Detection error:", err);
      if (err instanceof TypeError && err.message.includes('NetworkError')) {
        setApiConnected(false);
        setError("Lost connection to backend API");
      }
    }
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, predictions: Detection[], width: number, height: number) => {
    // Clear previous drawings
    ctx.clearRect(0, 0, width, height);
    
    // Redraw video frame
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    }

    // Apply opacity for overlay
    ctx.globalAlpha = opacityThreshold;

    // Draw bounding boxes and labels
    predictions.forEach((prediction) => {
      const { x, y, width: boxWidth, height: boxHeight, class: className, confidence } = prediction;
      
      // Calculate box coordinates (Roboflow returns center coordinates)
      const boxX = x - boxWidth / 2;
      const boxY = y - boxHeight / 2;
      
      // Color coding for different vehicle types
      let color = '#00ff00'; // Default green
      if (className.toLowerCase().includes('emergency')) {
        color = '#ff0000'; // Red for emergency vehicles
      } else if (className.toLowerCase().includes('truck')) {
        color = '#ffff00'; // Yellow for trucks
      } else if (className.toLowerCase().includes('car')) {
        color = '#00ffff'; // Cyan for cars
      }
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // Draw label based on display mode
      let label = className;
      if (labelDisplayMode === "Draw Confidence") {
        label = `${className} ${Math.round(confidence * 100)}%`;
      }
      
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      
      // Draw label background
      ctx.fillStyle = `${color}CC`; // Semi-transparent
      ctx.fillRect(boxX, boxY - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(label, boxX + 5, boxY - 5);
    });

    // Reset opacity
    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    checkApiConnection();
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* API Connection Status */}
      <Alert className={`${apiConnected ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
        {apiConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <AlertDescription className="text-white flex items-center justify-between">
          <span>Backend API: {apiConnected ? 'Connected' : 'Disconnected'}</span>
          <Button 
            onClick={checkApiConnection} 
            disabled={isCheckingApi}
            size="sm"
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            {isCheckingApi ? 'Checking...' : 'Test Connection'}
          </Button>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="bg-red-900/50 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      )}

      {/* Detection Parameters Card */}
      <Card className="bg-black/40 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Detection Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">
              Confidence Threshold: {Math.round(confidenceThreshold * 100)}%
            </label>
            <Slider
              value={[confidenceThreshold]}
              onValueChange={(value) => setConfidenceThreshold(value[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-white text-sm mb-2 block">
              Overlap Threshold: {Math.round(overlapThreshold * 100)}%
            </label>
            <Slider
              value={[overlapThreshold]}
              onValueChange={(value) => setOverlapThreshold(value[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-white text-sm mb-2 block">
              Opacity Threshold: {Math.round(opacityThreshold * 100)}%
            </label>
            <Slider
              value={[opacityThreshold]}
              onValueChange={(value) => setOpacityThreshold(value[0])}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-white text-sm mb-2 block">Label Display Mode:</label>
            <Select value={labelDisplayMode} onValueChange={setLabelDisplayMode}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draw Confidence">Draw Confidence</SelectItem>
                <SelectItem value="Class Only">Class Only</SelectItem>
                <SelectItem value="Hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {processingTime > 0 && (
            <div className="text-purple-200 text-sm">
              Processing Time: {(processingTime * 1000).toFixed(1)}ms
            </div>
          )}
        </CardContent>
      </Card>
      
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
          <Button 
            onClick={startWebcam} 
            className="bg-green-600 hover:bg-green-700"
            disabled={!apiConnected}
          >
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

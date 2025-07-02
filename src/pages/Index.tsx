
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebcamCapture } from "@/components/WebcamCapture";
import { DetectionStats } from "@/components/DetectionStats";
import { ModelInfo } from "@/components/ModelInfo";
import { Camera, Activity, BarChart3, Settings } from "lucide-react";

const Index = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionData, setDetectionData] = useState<any[]>([]);
  const [totalDetections, setTotalDetections] = useState(0);

  const handleDetectionUpdate = (predictions: any[]) => {
    setDetectionData(predictions);
    setTotalDetections(prev => prev + predictions.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Vehicle Detection System</h1>
                <p className="text-purple-200 text-sm">Real-time Traffic Management & Analysis</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-600 text-white">
              <Activity className="h-4 w-4 mr-1" />
              {isDetecting ? "Active" : "Standby"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-black/40 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Live Detection Feed
                </CardTitle>
                <CardDescription className="text-purple-200">
                  Real-time vehicle detection and classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WebcamCapture
                  onDetectionUpdate={handleDetectionUpdate}
                  onStatusChange={setIsDetecting}
                />
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Model Information */}
            <ModelInfo />
            
            {/* Detection Statistics */}
            <DetectionStats 
              currentDetections={detectionData}
              totalDetections={totalDetections}
            />

            {/* Controls */}
            <Card className="bg-black/40 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setTotalDetections(0)}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Reset Statistics
                </Button>
                <div className="text-sm text-purple-200">
                  <p>FPS: Optimized for performance</p>
                  <p>Model: Roboflow 3.0 Object Detection</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

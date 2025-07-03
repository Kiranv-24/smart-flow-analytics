
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebcamCapture } from "./WebcamCapture";
import { Maximize, Minimize, Camera, Grid3X3, Monitor, Play, Square, AlertTriangle } from "lucide-react";

interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CameraData {
  id: number;
  name: string;
  isActive: boolean;
  detections: Detection[];
  trafficCount: number;
  hasEmergencyVehicle: boolean;
}

export const CameraGrid = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [fullscreenCamera, setFullscreenCamera] = useState<number | null>(null);
  const [globalDetectionActive, setGlobalDetectionActive] = useState(false);
  const [cameras, setCameras] = useState<CameraData[]>([
    { id: 1, name: 'Lane 1 - North', isActive: false, detections: [], trafficCount: 0, hasEmergencyVehicle: false },
    { id: 2, name: 'Lane 2 - South', isActive: false, detections: [], trafficCount: 0, hasEmergencyVehicle: false },
    { id: 3, name: 'Lane 3 - East', isActive: false, detections: [], trafficCount: 0, hasEmergencyVehicle: false },
    { id: 4, name: 'Lane 4 - West', isActive: false, detections: [], trafficCount: 0, hasEmergencyVehicle: false },
  ]);

  const handleDetectionUpdate = (cameraId: number, predictions: Detection[]) => {
    setCameras(prev => prev.map(camera => {
      if (camera.id === cameraId) {
        // Check for emergency vehicles
        const hasEmergency = predictions.some(detection => 
          detection.class.toLowerCase().includes('ambulance') ||
          detection.class.toLowerCase().includes('emergency') ||
          detection.class.toLowerCase().includes('fire') ||
          detection.class.toLowerCase().includes('police')
        );
        
        return { 
          ...camera, 
          detections: predictions,
          trafficCount: camera.trafficCount + predictions.length,
          hasEmergencyVehicle: hasEmergency
        };
      }
      return camera;
    }));
  };

  const handleStatusChange = (cameraId: number, isActive: boolean) => {
    setCameras(prev => prev.map(camera => 
      camera.id === cameraId ? { ...camera, isActive } : camera
    ));
  };

  const startAllCameras = () => {
    setGlobalDetectionActive(true);
  };

  const stopAllCameras = () => {
    setGlobalDetectionActive(false);
  };

  const getHighestTrafficCamera = () => {
    return cameras.reduce((prev, current) => 
      current.trafficCount > prev.trafficCount ? current : prev
    );
  };

  const getTrafficSignalColor = (camera: CameraData) => {
    // Check if any camera has emergency vehicle
    const hasAnyEmergency = cameras.some(cam => cam.hasEmergencyVehicle);
    
    if (hasAnyEmergency) {
      // Emergency override: green for emergency lane, red for others
      return camera.hasEmergencyVehicle ? 'border-green-500' : 'border-red-500';
    } else {
      // Normal traffic management: green for highest traffic, red for others
      const highestTrafficCamera = getHighestTrafficCamera();
      return camera.id === highestTrafficCamera.id ? 'border-green-500' : 'border-red-500';
    }
  };

  const getEmergencyLanes = () => {
    return cameras.filter(camera => camera.hasEmergencyVehicle);
  };

  const toggleFullscreen = (cameraId: number) => {
    if (fullscreenCamera === cameraId) {
      setFullscreenCamera(null);
      setViewMode('grid');
    } else {
      setFullscreenCamera(cameraId);
      setViewMode('single');
    }
  };

  const switchToCamera = (cameraId: number) => {
    setFullscreenCamera(cameraId);
    setViewMode('single');
  };

  const highestTrafficCamera = getHighestTrafficCamera();
  const emergencyLanes = getEmergencyLanes();

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="bg-black/40 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Traffic Management Control Panel
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => { setViewMode('grid'); setFullscreenCamera(null); }}
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Grid View
              </Button>
              {[1, 2, 3, 4].map(num => (
                <Button
                  key={num}
                  onClick={() => switchToCamera(num)}
                  variant={fullscreenCamera === num ? 'default' : 'outline'}
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Lane {num}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-purple-200 space-y-1">
              {emergencyLanes.length > 0 ? (
                <div className="flex items-center text-red-400">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span>EMERGENCY OVERRIDE ACTIVE - Lane(s): {emergencyLanes.map(lane => lane.name).join(', ')}</span>
                </div>
              ) : (
                <span>Normal Traffic Mode - Highest Traffic: {highestTrafficCamera.name} ({highestTrafficCamera.trafficCount} vehicles)</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-purple-600 text-white">
                Active: {cameras.filter(c => c.isActive).length}/4
              </Badge>
              {viewMode === 'grid' && (
                <div className="flex gap-2">
                  {!globalDetectionActive ? (
                    <Button 
                      onClick={startAllCameras}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start All Cameras
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopAllCameras}
                      variant="destructive"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop All Cameras
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traffic Signal Status */}
      <Card className="bg-black/40 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Traffic Signal Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {cameras.map((camera) => (
              <div key={camera.id} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${camera.hasEmergencyVehicle || (!emergencyLanes.length && camera.id === highestTrafficCamera.id) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-white text-xs">{camera.name}</span>
                {camera.hasEmergencyVehicle && <AlertTriangle className="h-3 w-3 text-red-400" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Camera Display */}
      {viewMode === 'single' && fullscreenCamera ? (
        <Card className={`bg-black/40 backdrop-blur-md border-4 ${getTrafficSignalColor(cameras.find(c => c.id === fullscreenCamera)!)}`}>
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                {cameras.find(c => c.id === fullscreenCamera)?.name} - Fullscreen
                {cameras.find(c => c.id === fullscreenCamera)?.hasEmergencyVehicle && (
                  <Badge className="ml-2 bg-red-600 text-white">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    EMERGENCY
                  </Badge>
                )}
              </div>
              <Button
                onClick={() => toggleFullscreen(fullscreenCamera)}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Minimize className="h-4 w-4 mr-1" />
                Minimize
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WebcamCapture
              globalDetectionActive={globalDetectionActive}
              onDetectionUpdate={(predictions) => handleDetectionUpdate(fullscreenCamera, predictions)}
              onStatusChange={(isActive) => handleStatusChange(fullscreenCamera, isActive)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cameras.map((camera) => (
            <Card key={camera.id} className={`bg-black/40 backdrop-blur-md border-4 ${getTrafficSignalColor(camera)}`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    {camera.name}
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 ${camera.isActive ? 'bg-green-600' : 'bg-gray-600'} text-white`}
                    >
                      {camera.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {camera.hasEmergencyVehicle && (
                      <Badge className="ml-1 bg-red-600 text-white">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        EMERGENCY
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => toggleFullscreen(camera.id)}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-1"
                    >
                      <Maximize className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <WebcamCapture
                  globalDetectionActive={globalDetectionActive}
                  onDetectionUpdate={(predictions) => handleDetectionUpdate(camera.id, predictions)}
                  onStatusChange={(isActive) => handleStatusChange(camera.id, isActive)}
                />
                <div className="mt-2 text-xs text-purple-200">
                  Vehicles: {camera.detections.length} | Total: {camera.trafficCount}
                  {camera.hasEmergencyVehicle && <span className="text-red-400 ml-2">⚠️ Emergency Vehicle Present</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

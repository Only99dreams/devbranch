import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Volume2, 
  VolumeX, 
  Maximize, 
  Play, 
  Pause, 
  Settings, 
  Minimize,
  SkipBack,
  SkipForward,
  ThumbsUp,
  Share2,
  MoreHorizontal,
  Users,
  Loader2
} from "lucide-react";
import { useStreamViewer } from "@/hooks/useLiveStream";

interface StreamPlayerProps {
  stream?: MediaStream | null;
  externalUrl?: string | null;
  isLive?: boolean;
  title?: string;
  viewerCount?: number;
  description?: string;
  channelName?: string;
  streamId?: string | null;
}

// Helper to convert YouTube URL to embed format
const getEmbedUrl = (url: string): string => {
  if (!url) return url;
  
  // YouTube watch URL
  const ytWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytWatchMatch) {
    return `https://www.youtube.com/embed/${ytWatchMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }
  
  // YouTube live URL
  const ytLiveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
  if (ytLiveMatch) {
    return `https://www.youtube.com/embed/${ytLiveMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }
  
  // Facebook video
  if (url.includes("facebook.com")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true`;
  }
  
  // Already an embed URL or other direct URL
  return url;
};

export function StreamPlayer({ 
  stream, 
  externalUrl, 
  isLive, 
  title, 
  viewerCount = 0,
  description,
  channelName = "Home of Super Stars",
  streamId
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use the viewer hook for WebRTC streams (when streamId is provided and no external URL)
  const { remoteStream, isConnected, isConnecting, connect } = useStreamViewer(
    (streamId && !externalUrl) ? streamId : null
  );

  // Auto-connect when streamId is available and it's a WebRTC stream
  useEffect(() => {
    if (streamId && !externalUrl && isLive) {
      connect();
    }
  }, [streamId, externalUrl, isLive, connect]);

  // Use remote stream from WebRTC or passed stream
  const activeStream = remoteStream || stream;

  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch(console.error);
    }
  }, [activeStream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol / 100;
      setIsMuted(vol === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const embedUrl = externalUrl ? getEmbedUrl(externalUrl) : null;

  return (
    <div className="space-y-4">
      {/* Video Player Container - YouTube Style */}
      <div 
        ref={containerRef}
        className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="aspect-video relative">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={title || "Live Stream"}
            />
          ) : activeStream ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain bg-black cursor-pointer"
                onClick={togglePlay}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
              {isLive && isMuted && (
                <div 
                  className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs cursor-pointer"
                  onClick={toggleMute}
                >
                  Tap to unmute
                </div>
              )}
              
              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="w-20 h-20 rounded-full bg-black/70 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white ml-1" fill="white" />
                  </div>
                </div>
              )}
              
              {/* YouTube-style Controls */}
              <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                {!isLive && duration > 0 && (
                  <div className="px-3 pb-1">
                    <div className="h-1 bg-white/30 rounded-full cursor-pointer group">
                      <div 
                        className="h-full bg-red-600 rounded-full relative"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Controls Bar */}
                <div className="px-3 py-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                  <div className="flex items-center gap-2">
                    {/* Left Controls */}
                    <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20 h-9 w-9">
                      {isPlaying ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5" fill="white" />}
                    </Button>
                    
                    {!isLive && (
                      <>
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-9 w-9">
                          <SkipBack className="w-5 h-5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-9 w-9">
                          <SkipForward className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    
                    {/* Volume */}
                    <div className="flex items-center gap-1 group">
                      <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20 h-9 w-9">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </Button>
                      <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-200">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={100}
                          step={1}
                          onValueChange={handleVolumeChange}
                          className="w-20"
                        />
                      </div>
                    </div>
                    
                    {/* Time Display */}
                    {!isLive && duration > 0 && (
                      <span className="text-white text-sm ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    )}
                    
                    {/* Live Badge */}
                    {isLive && (
                      <Badge className="bg-red-600 text-white border-0 ml-2">
                        <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
                        LIVE
                      </Badge>
                    )}
                    
                    <div className="flex-1" />
                    
                    {/* Right Controls */}
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-9 w-9">
                      <Settings className="w-5 h-5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20 h-9 w-9">
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : isConnecting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center text-white">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-accent" />
                <p className="text-xl font-medium">Connecting to stream...</p>
                <p className="text-sm text-gray-400 mt-1">Please wait while we establish the connection</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center text-white px-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-10 h-10" />
                </div>
                <p className="text-lg md:text-xl font-medium">No stream available</p>
                <p className="text-sm text-gray-400 mt-1">Waiting for broadcast to start...</p>
              </div>
            </div>
          )}

          {/* Top Gradient & Live indicator for external streams */}
          {embedUrl && isLive && (
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <div className="flex items-center gap-3">
                <Badge className="bg-red-600 text-white border-0">
                  <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
                  LIVE
                </Badge>
                {viewerCount > 0 && (
                  <span className="flex items-center gap-1 text-white text-sm">
                    <Users className="w-4 h-4" />
                    {viewerCount.toLocaleString()} watching
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Info Section - YouTube Style */}
      <div className="space-y-3 px-1">
        {/* Title */}
        <h1 className="text-lg md:text-xl font-semibold text-foreground line-clamp-2">
          {title || "Live Stream"}
        </h1>
        
        {/* Channel Info & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shrink-0">
              {channelName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{channelName}</p>
              {viewerCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {viewerCount.toLocaleString()} {isLive ? "watching now" : "views"}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Button variant="outline" size="sm" className="rounded-full shrink-0 h-9">
              <ThumbsUp className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Like</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full shrink-0 h-9">
              <Share2 className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Description */}
        {description && (
          <Card className="bg-muted/50">
            <div className="p-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {description}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Mic, MicOff, Video, VideoOff, Hand, PhoneOff, Users, 
  MessageSquare, Send, MoreVertical, X
} from "lucide-react";
import { usePrayerRoom } from "@/hooks/usePrayerSession";

interface PrayerRoomProps {
  sessionId: string;
  onLeave: () => void;
}

export function PrayerRoom({ sessionId, onLeave }: PrayerRoomProps) {
  const {
    session,
    participants,
    localStream,
    remoteStreams,
    isConnected,
    isMuted,
    isVideoOn,
    handRaised,
    myProfile,
    myParticipation,
    joinSession,
    leaveSession,
    toggleMute,
    toggleVideo,
    raiseHand,
  } = usePrayerRoom(sessionId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewVideoOn, setPreviewVideoOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string; user: string; message: string; timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio level detection for speaking indicator
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioContext;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setIsSpeaking(average > 25);
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();
    } catch (e) {
      console.error("Audio analyser error:", e);
    }
  }, []);

  // Preview setup
  useEffect(() => {
    if (showPreview && !isConnected) {
      setupPreview();
    }
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [showPreview, isConnected]);

  const setupPreview = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Media devices not supported");
        return;
      }
      
      // Try to get both audio and video
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        });
      } catch (bothErr) {
        console.warn("Could not get both audio and video for preview, trying separately:", bothErr);
        
        // Try individually
        let audioStream: MediaStream | null = null;
        let videoStream: MediaStream | null = null;
        
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.warn("No audio for preview:", e);
        }
        
        try {
          videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
          });
        } catch (e) {
          console.warn("No video for preview:", e);
        }
        
        if (!audioStream && !videoStream) {
          console.error("Could not access any media devices");
          return;
        }
        
        stream = new MediaStream();
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
        if (videoStream) {
          videoStream.getVideoTracks().forEach(track => stream.addTrack(track));
        }
        
        // Update state based on what's available
        if (!videoStream) {
          setPreviewVideoOn(false);
        }
        if (!audioStream) {
          setPreviewMuted(true);
        }
      }
      
      console.log("Preview stream ready:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      setPreviewStream(stream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
      }
    } catch (error: any) {
      console.error("Preview error:", error);
    }
  };

  const togglePreviewMute = () => {
    if (previewStream) {
      const newMuted = !previewMuted;
      // When muted, track.enabled should be false
      previewStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
        console.log(`Preview audio track: enabled=${track.enabled}`);
      });
      setPreviewMuted(newMuted);
    }
  };

  const togglePreviewVideo = () => {
    if (previewStream) {
      const newVideoOn = !previewVideoOn;
      previewStream.getVideoTracks().forEach(track => {
        track.enabled = newVideoOn;
        console.log(`Preview video track: enabled=${track.enabled}`);
      });
      setPreviewVideoOn(newVideoOn);
    }
  };

  const handleJoinNow = async () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
    }
    setShowPreview(false);
    await joinSession(!previewMuted, previewVideoOn);
  };

  // Assign local stream to video element whenever stream or video state changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
      console.log("Local video assigned:", {
        hasAudio: localStream.getAudioTracks().length > 0,
        hasVideo: localStream.getVideoTracks().length > 0,
        videoEnabled: localStream.getVideoTracks()[0]?.enabled,
        audioEnabled: localStream.getAudioTracks()[0]?.enabled
      });
    }
  }, [localStream, isVideoOn]);

  // Setup audio analyser for speaking detection
  useEffect(() => {
    if (localStream && localStream.getAudioTracks().length > 0) {
      setupAudioAnalyser(localStream);
    }
  }, [localStream, setupAudioAnalyser]);

  const handleLeave = async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    await leaveSession();
    onLeave();
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      user: myProfile?.full_name || "You",
      message: chatInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
  };

  // Calculate grid layout based on participant count
  const getGridClass = (count: number) => {
    // Mobile view is preserved (default classes). Desktop (md+) classes added for better sizing.
    if (count === 1) return 'grid-cols-1 md:max-w-3xl';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 md:max-w-5xl';
    if (count <= 4) return 'grid-cols-2 md:max-w-5xl';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 md:max-w-6xl';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:max-w-7xl';
  };

  // Preview screen before joining
  if (!isConnected && showPreview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-center mb-4 md:mb-6">
          <h3 className="text-xl md:text-2xl font-serif font-semibold mb-2">Ready to join?</h3>
          <p className="text-muted-foreground text-sm md:text-base">"{session?.title}"</p>
        </div>

        {/* Preview Video */}
        <div className="relative w-full max-w-lg aspect-video bg-muted rounded-2xl overflow-hidden shadow-lg">
          {previewVideoOn && previewStream && previewStream.getVideoTracks().length > 0 ? (
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <Avatar className="w-20 h-20 md:w-28 md:h-28">
                <AvatarFallback className="bg-accent/20 text-accent text-2xl md:text-4xl">
                  {myProfile?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          
          {/* Preview Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3">
            <Button
              variant={previewMuted ? "destructive" : "secondary"}
              size="default"
              className="rounded-full w-12 h-12 md:w-14 md:h-14 shadow-lg"
              onClick={togglePreviewMute}
            >
              {previewMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              variant={previewVideoOn ? "secondary" : "destructive"}
              size="default"
              className="rounded-full w-12 h-12 md:w-14 md:h-14 shadow-lg"
              onClick={togglePreviewVideo}
            >
              {previewVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <Button 
          onClick={handleJoinNow} 
          size="lg"
          className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90 px-8"
        >
          Join now
        </Button>
        
        <p className="text-xs md:text-sm text-muted-foreground text-center mt-4 max-w-sm">
          Check your camera and microphone before joining
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  const totalParticipants = participants.length + 1;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-background">
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="destructive" className="text-xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
            LIVE
          </Badge>
          <h2 className="text-sm md:text-lg font-semibold truncate">{session?.title}</h2>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            className={`relative px-2 md:px-3 ${showParticipants ? "bg-accent/10" : ""}`}
          >
            <Users className="w-4 h-4" />
            <span className="ml-1 text-xs">{totalParticipants}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
            className={`px-2 md:px-3 ${showChat ? "bg-accent/10" : ""}`}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Video Grid */}
        <div className={`flex-1 p-2 md:p-4 overflow-y-auto transition-all min-h-0 ${(showChat || showParticipants) ? 'hidden md:flex md:mr-80' : ''}`}>
          <div className={`grid gap-2 md:gap-3 w-full h-full auto-rows-fr place-items-stretch ${getGridClass(totalParticipants)}`}>
            {/* Local Video */}
            <div className={`relative rounded-xl overflow-hidden bg-gray-900 min-h-[120px] md:min-h-[220px] h-full ${isSpeaking && !isMuted ? 'speaking-ring' : ''}`}>
              {/* Always render video element, control visibility with CSS */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover object-center ${isVideoOn && localStream ? 'block' : 'hidden'}`}
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Show avatar when video is off */}
              {(!isVideoOn || !localStream) && (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Avatar className="w-16 h-16 md:w-24 md:h-24">
                    <AvatarFallback className="bg-accent/30 text-accent text-xl md:text-3xl">
                      {myProfile?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              
              {/* Speaking indicator */}
              {isSpeaking && !isMuted && (
                <div className="speaking-indicator">
                  <div className="sound-wave">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="hidden sm:inline">Speaking</span>
                </div>
              )}

              {/* Hand raised indicator */}
              {handRaised && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1.5 md:p-2 animate-bounce shadow-lg">
                  <Hand className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              )}

              {/* Name tag */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
                  <span className="text-white text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-[200px]">
                    {myProfile?.full_name || "You"}
                  </span>
                  {isMuted ? (
                    <MicOff className="w-3 h-3 text-red-400 shrink-0" />
                  ) : (
                    <Mic className="w-3 h-3 text-green-400 shrink-0" />
                  )}
                </div>
              </div>
            </div>

            {/* Remote Participants */}
            {participants.map((participant) => (
              <ParticipantVideo
                key={participant.id}
                participant={participant}
                stream={remoteStreams.get(participant.user_id)}
              />
            ))}
          </div>
        </div>

        {/* Sidebar - Chat or Participants */}
        {(showChat || showParticipants) && (
          <div className="absolute inset-0 md:relative md:inset-auto md:w-80 bg-card border-l flex flex-col z-10">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold text-sm">
                {showChat ? 'In-call messages' : 'Participants'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowChat(false); setShowParticipants(false); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {showChat ? (
              <>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                        <p className="text-xs text-muted-foreground">Send a message to everyone</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">{msg.user}</span>
                            <span className="text-xs text-muted-foreground">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Send a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={sendMessage} className="shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {/* Self */}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/5">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-accent/20 text-accent">
                        {myProfile?.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{myProfile?.full_name || "You"} (You)</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {handRaised && <Hand className="w-4 h-4 text-yellow-500" />}
                      {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-green-400" />}
                    </div>
                  </div>
                  
                  {/* Other participants */}
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={p.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-sm">
                          {p.profile?.full_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.profile?.full_name || "Anonymous"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.hand_raised && <Hand className="w-4 h-4 text-yellow-500" />}
                        {p.is_muted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-green-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar - Google Meet Style */}
      <div className="border-t bg-card px-2 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {/* Time - hidden on mobile */}
          <div className="hidden md:flex items-center text-sm text-muted-foreground min-w-[80px]">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-2 md:gap-3 flex-1">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="default"
              className="rounded-full w-11 h-11 md:w-14 md:h-14"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              variant={isVideoOn ? "secondary" : "destructive"}
              size="default"
              className="rounded-full w-11 h-11 md:w-14 md:h-14"
              onClick={toggleVideo}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={handRaised ? "default" : "outline"}
              size="default"
              className={`rounded-full w-11 h-11 md:w-14 md:h-14 ${handRaised ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" : ""}`}
              onClick={raiseHand}
            >
              <Hand className="w-5 h-5" />
            </Button>

            <div className="hidden md:block h-8 w-px bg-border mx-1" />

            <Button
              variant="destructive"
              size="default"
              className="rounded-full px-4 md:px-6 h-11 md:h-14"
              onClick={handleLeave}
            >
              <PhoneOff className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Leave</span>
            </Button>
          </div>

          {/* More options - hidden on mobile */}
          <div className="hidden md:flex items-center min-w-[80px] justify-end">
            <Button variant="ghost" size="sm" className="rounded-full w-10 h-10">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ParticipantVideoProps {
  participant: any;
  stream?: MediaStream;
}

function ParticipantVideo({ participant, stream }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
    
    // Set up speaking detection for remote participant
    if (stream && stream.getAudioTracks().length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioContext = new AudioCtx();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          audioContextRef.current = audioContext;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const checkAudioLevel = () => {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setIsSpeaking(average > 25);
            animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
          };
          checkAudioLevel();
        }
      } catch (e) {
        console.error("Audio analyser error:", e);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stream]);

  // Check if video should be shown based on database state
  const shouldShowVideo = participant.can_video && stream && stream.getVideoTracks().length > 0;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-[#3c4043] w-full h-full min-h-[150px] ${isSpeaking && !participant.is_muted ? 'speaking-ring' : ''}`}>
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover object-center ${shouldShowVideo ? 'block' : 'hidden'}`}
      />
      
      {!shouldShowVideo && (
        <div className="w-full h-full flex items-center justify-center bg-[#3c4043]">
          <Avatar className="w-16 h-16 md:w-24 md:h-24">
            <AvatarImage src={participant.profile?.avatar_url} />
            <AvatarFallback className="bg-accent/30 text-accent text-xl md:text-3xl">
              {participant.profile?.full_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Speaking indicator */}
      {isSpeaking && !participant.is_muted && (
        <div className="speaking-indicator">
          <div className="sound-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="hidden sm:inline">Speaking</span>
        </div>
      )}

      {/* Hand raised indicator */}
      {participant.hand_raised && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1.5 md:p-2 animate-bounce shadow-lg">
          <Hand className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      )}

      {/* Name tag */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
          <span className="text-white text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-[200px]">
            {participant.profile?.full_name || "Anonymous"}
          </span>
          {participant.is_muted ? (
            <MicOff className="w-3 h-3 text-red-400 shrink-0" />
          ) : (
            <Mic className="w-3 h-3 text-green-400 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

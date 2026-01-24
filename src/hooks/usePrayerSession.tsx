import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import "webrtc-adapter";

type PrayerSession = Tables<"prayer_sessions">;
type PrayerParticipant = Tables<"prayer_participants">;

interface ParticipantWithProfile extends PrayerParticipant {
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function usePrayerSessions() {
  const [sessions, setSessions] = useState<PrayerSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel("prayer_sessions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_sessions" },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("prayer_sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Error fetching prayer sessions:", error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const liveSessions = sessions.filter((s) => s.status === "active");
  const scheduledSessions = sessions.filter((s) => s.status === "scheduled");

  return { sessions, liveSessions, scheduledSessions, loading, refetch: fetchSessions };
}

export function usePrayerRoom(sessionId: string | null) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [session, setSession] = useState<PrayerSession | null>(null);
  const [myParticipation, setMyParticipation] = useState<PrayerParticipant | null>(null);
  const [myProfile, setMyProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Refs to avoid stale closures in event listeners
  const localStreamRef = useRef<MediaStream | null>(null);
  const isConnectedRef = useRef(false);
  const userRef = useRef(user);

  // Sync refs with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch my profile
  useEffect(() => {
    if (!user) return;
    
    const fetchMyProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setMyProfile(data);
      } else {
        // If no profile, use email as fallback
        setMyProfile({ full_name: user.email?.split("@")[0] || "User", avatar_url: null });
      }
    };
    
    fetchMyProfile();
  }, [user]);

  // Fetch session and participants
  useEffect(() => {
    if (!sessionId) return;

    fetchSessionData();
    subscribeToParticipants();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    if (!sessionId) return;

    const { data: sessionData } = await supabase
      .from("prayer_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionData) {
      setSession(sessionData);
    }

    await fetchParticipants();
  };

  const fetchParticipants = async (): Promise<ParticipantWithProfile[]> => {
    if (!sessionId) return [];

    const { data } = await supabase
      .from("prayer_participants")
      .select("*")
      .eq("session_id", sessionId)
      .is("left_at", null);

    if (data) {
      // Fetch profiles for participants
      const userIds = data.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const participantsWithProfiles = data.map((p) => ({
        ...p,
        profile: profiles?.find((pr) => pr.user_id === p.user_id),
      }));

      setParticipants(participantsWithProfiles);

      if (user) {
        const myPart = data.find((p) => p.user_id === user.id);
        setMyParticipation(myPart || null);
      }

      return participantsWithProfiles;
    }

    return [];
  };

  const subscribeToParticipants = () => {
    if (!sessionId) return;

    channelRef.current = supabase
      .channel(`prayer_room_${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_participants", filter: `session_id=eq.${sessionId}` },
        async (payload: any) => {
          console.log("Participant change:", payload);
          await fetchParticipants();
          
          // When a new participant joins, we wait for their "ready" signal instead of connecting immediately on INSERT
          // This prevents connection attempts before they are fully set up
          if (payload.eventType === "INSERT" && isConnectedRef.current && localStreamRef.current) {
            console.log("New participant inserted:", payload.new.user_id);
          }
        }
      )
      .on("broadcast", { event: "webrtc-signal" }, handleWebRTCSignal)
      .on("broadcast", { event: "hand-raised" }, (payload: any) => {
        const { userId, raised } = payload.payload || {};
        if (userId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === userId ? { ...p, hand_raised: !!raised } : p
            )
          );
        }
      })
      .on("broadcast", { event: "participant-ready" }, async (payload: any) => {
        // When a new participant announces they are ready, connect to them
        const { userId } = payload.payload;
        if (userId !== userRef.current?.id && isConnectedRef.current && localStreamRef.current) {
          console.log("Participant ready, initiating connection:", userId);
          initiateConnection(userId, localStreamRef.current);
        }
      })
      .subscribe();
  };

  const handleWebRTCSignal = async (payload: any) => {
    const { type, from, to, signal } = payload.payload;
    // Only process signals meant for us or broadcast signals
    if (from === user?.id) return;
    if (to && to !== user?.id) return; // Ignore signals not meant for us

    console.log(`WebRTC signal received: type=${type}, from=${from}`);

    try {
      let pc = peerConnections.current.get(from);
      
      if (type === "offer") {
        // Create new connection if we don't have one
        if (!pc) {
          pc = createPeerConnection(from, localStreamRef.current);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        
        // Process queued ICE candidates
        const queue = iceCandidatesQueue.current.get(from);
        if (queue && queue.length > 0) {
          console.log(`Processing ${queue.length} queued ICE candidates from ${from}`);
          for (const candidate of queue) {
            try {
              await pc.addIceCandidate(candidate);
            } catch (error) {
              console.error("Failed to add queued ICE candidate:", error);
            }
          }
          iceCandidatesQueue.current.delete(from);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcastSignal("answer", from, answer);
        console.log(`Sent answer to ${from}`);
      } else if (type === "answer") {
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log(`Set remote answer from ${from}`);
        }
      } else if (type === "ice-candidate") {
        const candidate = new RTCIceCandidate(signal);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
          console.log(`Added ICE candidate from ${from}`);
        } else {
          console.log(`Queuing ICE candidate from ${from} - no remote description yet`);
          const queue = iceCandidatesQueue.current.get(from) || [];
          queue.push(candidate);
          iceCandidatesQueue.current.set(from, queue);
        }
      }
    } catch (error) {
      console.error(`Error handling WebRTC signal from ${from}:`, error);
    }
  };

  const createPeerConnection = (peerId: string, stream?: MediaStream | null): RTCPeerConnection => {
    // Close existing connection if any
    const existingPc = peerConnections.current.get(peerId);
    if (existingPc) {
      existingPc.close();
      peerConnections.current.delete(peerId);
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        // Add TURN servers for better connectivity
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      ],
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerId}`);
        broadcastSignal("ice-candidate", peerId, event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        // Try to reconnect
        console.log(`Connection with ${peerId} ${pc.iceConnectionState}, may need reconnection`);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
    };

    pc.ontrack = (event) => {
      console.log("Received remote track from", peerId, event.track.kind, "enabled:", event.track.enabled);
      
      // Handle multiple streams and track updates
      event.streams.forEach((remoteStream) => {
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          return newMap;
        });
      });
      
      // Listen for track state changes
      event.track.onmute = () => {
        console.log(`Track ${event.track.kind} from ${peerId} muted`);
      };
      event.track.onunmute = () => {
        console.log(`Track ${event.track.kind} from ${peerId} unmuted`);
      };
    };

    // Use provided stream or fall back to localStream state
    const activeStream = stream || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer connection for ${peerId}, enabled: ${track.enabled}`);
        try {
          pc.addTrack(track, activeStream);
        } catch (error) {
          console.error(`Failed to add ${track.kind} track to peer connection:`, error);
        }
      });
    } else {
      console.warn("No active stream available for peer connection");
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  };

  const broadcastSignal = (type: string, to: string, signal: any) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "webrtc-signal",
      payload: { type, from: userRef.current?.id, to, signal },
    });
  };

  const joinSession = async (withAudio: boolean, withVideo: boolean) => {
    if (!sessionId || !user) {
      toast({ title: "Error", description: "You must be logged in to join", variant: "destructive" });
      return;
    }

    try {
      // WebRTC requires secure context (HTTPS) on mobile browsers
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        throw new Error("Secure connection required. Please use HTTPS (or localhost) to allow camera/mic access.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support media devices. Please use a modern browser.");
      }

      // Always request both audio and video so we have tracks to enable/disable later
      // This ensures toggleMute and toggleVideo work properly
      let stream: MediaStream;
      
      try {
        // Try to get both audio and video
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
      } catch (bothErr) {
        console.warn("Failed to get both audio and video, trying separately:", bothErr);
        
        // Try audio only
        let audioStream: MediaStream | null = null;
        let videoStream: MediaStream | null = null;
        
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
          });
        } catch (audioErr) {
          console.warn("No audio available:", audioErr);
        }
        
        try {
          videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
          });
        } catch (videoErr) {
          console.warn("No video available:", videoErr);
        }
        
        if (!audioStream && !videoStream) {
          throw new Error("Could not access camera or microphone. Please check your device permissions.");
        }
        
        // Combine available tracks into one stream
        stream = new MediaStream();
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
        if (videoStream) {
          videoStream.getVideoTracks().forEach(track => stream.addTrack(track));
        }
      }

      // Set initial enabled state based on user preference
      stream.getAudioTracks().forEach((track) => {
        track.enabled = withAudio;
        console.log(`Audio track ${track.label}: enabled=${track.enabled}`);
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = withVideo;
        console.log(`Video track ${track.label}: enabled=${track.enabled}`);
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsMuted(!withAudio);
      setIsVideoOn(withVideo);

      // Join in database (upsert to handle rejoining)
      const { data, error } = await supabase
        .from("prayer_participants")
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          can_speak: true, // Default to true for now unless there's a specific moderation feature
          can_video: withVideo,
          is_muted: !withAudio,
          left_at: null, // Clear left_at so they're active again
        }, {
          onConflict: "session_id,user_id"
        })
        .select()
        .single();

      if (error) throw error;

      setMyParticipation(data);
      setIsConnected(true);
      isConnectedRef.current = true;

      // We don't initiate connections proactively to existing participants to avoid glare (double connections).
      // Instead, we broadcast "participant-ready" and let existing participants initiate connections to us.
      
      // Announce that we're ready so other participants can connect to us
      // Give a bit more time for the stream to be fully initialized
      setTimeout(() => {
        console.log("Broadcasting participant-ready signal");
        channelRef.current?.send({
          type: "broadcast",
          event: "participant-ready",
          payload: { userId: user.id },
        });

        setTimeout(() => {
          if (isConnectedRef.current && localStreamRef.current) {
            void (async () => {
              const currentParticipants = await fetchParticipants();
              currentParticipants.forEach((participant) => {
                if (participant.user_id !== user.id && !peerConnections.current.has(participant.user_id)) {
                  console.log("Initiating connection to existing participant:", participant.user_id);
                  initiateConnection(participant.user_id, localStreamRef.current);
                }
              });
            })();
          }
        }, 1500);
      }, 1000);

      toast({ title: "Joined", description: "You've joined the prayer session" });
    } catch (error: any) {
      console.error("Error joining session:", error);
      let errorMessage = error.message;
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Permission denied. Please allow camera/mic in your browser settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "No camera or microphone found. Plug one in and try again.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Camera/mic is busy in another app. Close it and retry.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Your device can't satisfy the requested quality. Lower video quality and retry.";
      }
      
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const initiateConnection = async (peerId: string, stream?: MediaStream | null) => {
    const pc = createPeerConnection(peerId, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    broadcastSignal("offer", peerId, offer);
  };

  const leaveSession = async () => {
    if (!myParticipation) return;

    // Clean up WebRTC
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    localStream?.getTracks().forEach((track) => track.stop());

    // Update database
    await supabase
      .from("prayer_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("id", myParticipation.id);

    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsConnected(false);
    setMyParticipation(null);
  };

  const toggleMute = async () => {
    if (!localStream) {
      console.warn("Cannot toggle mute: no local stream");
      return;
    }
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      toast({ title: "No microphone", description: "No microphone is available", variant: "destructive" });
      return;
    }

    const newMuted = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !newMuted;
      console.log(`Audio track ${track.label}: enabled=${track.enabled}`);
    });
    setIsMuted(newMuted);

    if (myParticipation) {
      await supabase
        .from("prayer_participants")
        .update({ is_muted: newMuted })
        .eq("id", myParticipation.id);
    }
  };

  const toggleVideo = async () => {
    if (!localStream) {
      console.warn("Cannot toggle video: no local stream");
      return;
    }
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      toast({ title: "No camera", description: "No camera is available", variant: "destructive" });
      return;
    }

    const newVideoOn = !isVideoOn;
    videoTracks.forEach((track) => {
      track.enabled = newVideoOn;
      console.log(`Video track ${track.label}: enabled=${track.enabled}`);
    });
    setIsVideoOn(newVideoOn);

    if (myParticipation) {
      await supabase
        .from("prayer_participants")
        .update({ can_video: newVideoOn })
        .eq("id", myParticipation.id);
    }
  };

  const raiseHand = async () => {
    const newHandRaised = !handRaised;
    setHandRaised(newHandRaised);
    setParticipants((prev) =>
      prev.map((p) =>
        p.user_id === user?.id ? { ...p, hand_raised: newHandRaised } : p
      )
    );
    
    // Update database so other participants can see
    if (myParticipation) {
      await supabase
        .from("prayer_participants")
        .update({ hand_raised: newHandRaised })
        .eq("id", myParticipation.id);
    }
    
    // Also broadcast for immediate notification
    channelRef.current?.send({
      type: "broadcast",
      event: "hand-raised",
      payload: { userId: user?.id, raised: newHandRaised },
    });
  };

  return {
    session,
    participants,
    myParticipation,
    myProfile,
    localStream,
    remoteStreams,
    isConnected,
    isMuted,
    isVideoOn,
    handRaised,
    joinSession,
    leaveSession,
    toggleMute,
    toggleVideo,
    raiseHand,
  };
}

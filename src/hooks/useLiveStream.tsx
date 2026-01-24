import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import "webrtc-adapter";

// Fallback UUID for older mobile browsers that lack crypto.randomUUID
const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(1))[0] : Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
];

interface StreamState {
  isStreaming: boolean;
  isRecording: boolean;
  streamId: string | null;
  streamKey: string | null;
  viewerCount: number;
  externalStreamUrl: string | null;
}

export function useLiveStream() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    isRecording: false,
    streamId: null,
    streamKey: null,
    viewerCount: 0,
    externalStreamUrl: null,
  });
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Handle WebRTC signaling for broadcaster
  const handleViewerSignal = useCallback(async (payload: any) => {
    const { type, from, signal } = payload.payload;
    if (!localStreamRef.current) return;
    
    console.log(`Broadcaster received ${type} signal from viewer ${from}`);
    
    let pc = peerConnectionsRef.current.get(from);
    
    if (type === "viewer-join") {
      // New viewer wants to connect
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
      peerConnectionsRef.current.set(from, pc);
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channelRef.current?.send({
            type: "broadcast",
            event: "stream-signal",
            payload: { type: "ice-candidate", from: user?.id, to: from, signal: event.candidate }
          });
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log(`Broadcaster connection state with ${from}: ${pc?.connectionState}`);
        if (pc?.connectionState === "disconnected" || pc?.connectionState === "failed") {
          peerConnectionsRef.current.delete(from);
          pc?.close();
          updateViewerCount();
        }
      };
      
      // Add local stream tracks
      localStreamRef.current.getTracks().forEach(track => {
        pc!.addTrack(track, localStreamRef.current!);
      });
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current?.send({
        type: "broadcast",
        event: "stream-signal",
        payload: { type: "offer", from: user?.id, to: from, signal: offer }
      });
      
      updateViewerCount();
    } else if (type === "answer" && pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const queued = pendingCandidatesRef.current.get(from);
      if (queued && queued.length) {
        for (const c of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current.delete(from);
      }
    } else if (type === "ice-candidate" && pc) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(signal));
      } else {
        const arr = pendingCandidatesRef.current.get(from) || [];
        arr.push(signal);
        pendingCandidatesRef.current.set(from, arr);
      }
    }
  }, [user]);

  const updateViewerCount = useCallback(() => {
    setState(prev => ({ ...prev, viewerCount: peerConnectionsRef.current.size }));
  }, []);

  const startStream = useCallback(async (title: string, description?: string, externalUrl?: string) => {
    try {
      const generatedStreamKey = generateId();
      let stream: MediaStream | null = null;

      // Only get user media if not using external source
      if (!externalUrl) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        localStreamRef.current = stream;
      }

      // Create stream record in database
      const { data: streamData, error } = await supabase
        .from("live_streams")
        .insert({
          title,
          description,
          status: "live",
          started_at: new Date().toISOString(),
          stream_key: generatedStreamKey,
          external_stream_url: externalUrl || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Set up signaling channel for WebRTC (only for camera streams)
      if (!externalUrl && stream) {
        channelRef.current = supabase
          .channel(`live-stream-${streamData.id}`)
          .on("broadcast", { event: "viewer-signal" }, handleViewerSignal)
          .subscribe();
      }

      setState(prev => ({
        ...prev,
        isStreaming: true,
        streamId: streamData.id,
        streamKey: generatedStreamKey,
        externalStreamUrl: externalUrl || null,
      }));

      toast({
        title: "Stream Started",
        description: externalUrl ? "External stream is now live!" : "You are now live!",
      });

      return { stream, streamId: streamData.id };
    } catch (error: any) {
      console.error("Error starting stream:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start stream. Check camera/microphone permissions.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast, user, handleViewerSignal]);

  const stopStream = useCallback(async (saveRecording: boolean = false) => {
    try {
      // Clean up signaling channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Stop all peer connections
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();

      // Stop recording if active
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }

      // Update stream status in database
      if (state.streamId) {
        await supabase
          .from("live_streams")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            recording_status: saveRecording ? "saved" : "discarded",
          })
          .eq("id", state.streamId);
      }

      setState({
        isStreaming: false,
        isRecording: false,
        streamId: null,
        streamKey: null,
        viewerCount: 0,
        externalStreamUrl: null,
      });

      toast({
        title: "Stream Ended",
        description: saveRecording ? "Recording saved." : "Stream ended without saving.",
      });
    } catch (error) {
      console.error("Error stopping stream:", error);
      toast({
        title: "Error",
        description: "Failed to stop stream properly.",
        variant: "destructive",
      });
    }
  }, [state.streamId, state.isRecording, toast]);

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(localStreamRef.current, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      setState(prev => ({ ...prev, isRecording: true }));

      toast({
        title: "Recording Started",
        description: "Stream is now being recorded.",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Failed to start recording.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setState(prev => ({ ...prev, isRecording: false }));

      toast({
        title: "Recording Stopped",
        description: "Recording has been saved.",
      });
    }
  }, [toast]);

  const getRecordedBlob = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return null;
    return new Blob(recordedChunksRef.current, { type: "video/webm" });
  }, []);

  // Subscribe to realtime updates for viewer count
  useEffect(() => {
    if (!state.streamId) return;

    const channel = supabase
      .channel(`stream-${state.streamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
          filter: `id=eq.${state.streamId}`,
        },
        (payload) => {
          console.log("Stream update:", payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.streamId]);

  return {
    ...state,
    localStream: localStreamRef.current,
    startStream,
    stopStream,
    startRecording,
    stopRecording,
    getRecordedBlob,
  };
}

// Hook for viewers to watch a live stream
export function useStreamViewer(streamId: string | null) {
  const { user } = useAuth();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const viewerId = useRef<string>(generateId());
  const pendingViewerCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const viewerRecordKeyRef = useRef<{ stream_id: string; user_id: string | null; anon_id: string | null } | null>(null);

  const handleBroadcasterSignal = useCallback(async (payload: any) => {
    const { type, from, to, signal } = payload.payload;
    
    // Only process signals meant for us
    if (to && to !== viewerId.current) return;
    
    console.log(`Viewer received ${type} signal from broadcaster`);
    
    let pc = peerConnectionRef.current;
    
    if (type === "offer") {
      // Broadcaster is sending offer
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
        peerConnectionRef.current = pc;
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channelRef.current?.send({
              type: "broadcast",
              event: "viewer-signal",
              payload: { type: "ice-candidate", from: viewerId.current, to: from, signal: event.candidate }
            });
          }
        };
        
        pc.ontrack = (event) => {
          console.log("Viewer received track:", event.track.kind);
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
          setIsConnecting(false);
        };
        
        pc.onconnectionstatechange = () => {
          console.log(`Viewer connection state: ${pc?.connectionState}`);
          if (pc?.connectionState === "connected") {
            setIsConnected(true);
            setIsConnecting(false);
          } else if (pc?.connectionState === "disconnected" || pc?.connectionState === "failed") {
            setIsConnected(false);
            setRemoteStream(null);
          }
        };
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      channelRef.current?.send({
        type: "broadcast",
        event: "viewer-signal",
        payload: { type: "answer", from: viewerId.current, to: from, signal: answer }
      });
      if (pendingViewerCandidatesRef.current.length) {
        for (const c of pendingViewerCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingViewerCandidatesRef.current = [];
      }
    } else if (type === "ice-candidate" && pc) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(signal));
      } else {
        pendingViewerCandidatesRef.current.push(signal);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!streamId || isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    // Set up signaling channel
    channelRef.current = supabase
      .channel(`live-stream-${streamId}`)
      .on("broadcast", { event: "stream-signal" }, handleBroadcasterSignal)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce to broadcaster that we want to join
          channelRef.current?.send({
            type: "broadcast",
            event: "viewer-signal",
            payload: { type: "viewer-join", from: viewerId.current }
          });
          // Track viewer presence in DB
          viewerRecordKeyRef.current = { stream_id: streamId, user_id: user?.id || null, anon_id: user?.id ? null : viewerId.current };
          supabase
            .from("live_viewers")
            .upsert({
              stream_id: streamId,
              user_id: user?.id || null,
              anon_id: user?.id ? null : viewerId.current,
              joined_at: new Date().toISOString(),
              left_at: null,
            }, { onConflict: "stream_id,user_id,anon_id" })
            .then(() => {});
        }
      });
  }, [streamId, isConnecting, isConnected, handleBroadcasterSignal]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
    
    // Mark viewer left
    const key = viewerRecordKeyRef.current;
    if (key) {
      supabase
        .from("live_viewers")
        .upsert({
          stream_id: key.stream_id,
          user_id: key.user_id,
          anon_id: key.anon_id,
          left_at: new Date().toISOString(),
        }, { onConflict: "stream_id,user_id,anon_id" })
        .then(() => {});
      viewerRecordKeyRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    remoteStream,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };
}

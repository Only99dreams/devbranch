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
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Public TURN servers (may have usage limits)
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:turn.anyfirewall.com:443?transport=tcp", username: "webrtc", credential: "webrtc" },
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

  const stateRef = useRef<StreamState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getRecordedBlob = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return null;
    return new Blob(recordedChunksRef.current, { type: "video/webm" });
  }, []);

  const handleViewerSignal = useCallback(async (payload: any) => {
    const { type, from, to, signal } = payload.payload;

    console.log(`Broadcaster received ${type} signal from viewer ${from}`);

    if (type === "viewer-join") {
      // New viewer wants to join - only create connection if we have a local stream
      // Use stateRef to get latest state (avoids stale closures)
      const currentState = stateRef.current;
      if (localStreamRef.current && currentState.isStreaming && !currentState.externalStreamUrl) {
        console.log(`Creating peer connection for viewer ${from}`);
        await createPeerConnection(from);
      } else {
        console.log(`Cannot create peer connection: streaming=${currentState.isStreaming}, hasStream=${!!localStreamRef.current}, externalUrl=${currentState.externalStreamUrl}`);
      }
    } else if (type === "answer" && peerConnectionsRef.current.has(from)) {
      // Viewer sent answer to our offer
      console.log(`Received answer from viewer ${from}`);
      const pc = peerConnectionsRef.current.get(from)!;
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (type === "ice-candidate" && peerConnectionsRef.current.has(from)) {
      // Viewer sent ICE candidate
      console.log(`Received ICE candidate from viewer ${from}`);
      const pc = peerConnectionsRef.current.get(from)!;
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(signal));
      }
    }
  }, []);

  const createPeerConnection = useCallback(async (viewerId: string) => {
    if (peerConnectionsRef.current.has(viewerId)) {
      return; // Already have connection for this viewer
    }

    console.log(`Creating peer connection for viewer ${viewerId}`);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
    peerConnectionsRef.current.set(viewerId, pc);

    // Add local stream tracks to peer connection if available
    if (localStreamRef.current) {
      console.log(`Adding ${localStreamRef.current.getTracks().length} tracks to peer connection`);
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Broadcaster sending ICE candidate to ${viewerId}`);
        channelRef.current?.send({
          type: "broadcast",
          event: "stream-signal",
          payload: { type: "ice-candidate", from: stateRef.current.streamKey, to: viewerId, signal: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Broadcaster connection state with ${viewerId}: ${pc.connectionState}`);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Clean up failed connection
        pc.close();
        peerConnectionsRef.current.delete(viewerId);
      }
    };

    // Only create and send offer if we have tracks
    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      console.log(`Creating offer for viewer ${viewerId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log(`Sending offer to viewer ${viewerId}`);
      channelRef.current?.send({
        type: "broadcast",
        event: "stream-signal",
        payload: { type: "offer", from: stateRef.current.streamKey, to: viewerId, signal: offer }
      });
    } else {
      console.log(`No tracks available for offer creation`);
    }
  }, []);

  const setupSignaling = useCallback((streamId?: string) => {
    // Use stateRef.current for latest streamId if not provided
    const targetStreamId = streamId || stateRef.current.streamId;
    // Use stateRef.current for latest streamKey
    const currentStreamKey = stateRef.current.streamKey;

    if (!targetStreamId || !currentStreamKey) {
      console.log(`Cannot setup signaling: streamId=${targetStreamId}, streamKey=${currentStreamKey}`);
      return;
    }

    console.log(`Setting up signaling for stream ${targetStreamId}`);
    
    // Listen for new viewers joining via database changes
    const viewersChannel = supabase
      .channel(`live-viewers-${targetStreamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_viewers",
          filter: `stream_id=eq.${targetStreamId}`,
        },
        (payload) => {
          console.log(`Broadcaster detected new viewer:`, payload.new);
          const viewer = payload.new as any;
          // Only create connection if we have a local stream and viewer is joining now
          const currentState = stateRef.current;
          if (localStreamRef.current && currentState.isStreaming && !currentState.externalStreamUrl) {
            console.log(`Creating peer connection for viewer ${viewer.anon_id || viewer.user_id}`);
            createPeerConnection(viewer.anon_id || viewer.user_id);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Broadcaster viewers channel status: ${status}`);
      });

    // Also set up broadcast channel for WebRTC signaling
    channelRef.current = supabase
      .channel(`live-stream-${targetStreamId}`)
      .on("broadcast", { event: "viewer-signal" }, handleViewerSignal)
      .subscribe((status) => {
        console.log(`Broadcaster signaling channel status: ${status}`);
      });

    // Store viewers channel for cleanup
    (channelRef as any).viewersChannel = viewersChannel;
  }, [handleViewerSignal]);

  const cleanupSignaling = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clean up viewers channel
    if ((channelRef as any).viewersChannel) {
      supabase.removeChannel((channelRef as any).viewersChannel);
      (channelRef as any).viewersChannel = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
  }, []);

  const startStream = useCallback(async (title: string, description?: string, externalUrl?: string) => {
    try {
      console.log(`Broadcaster starting stream with title: ${title}, externalUrl: ${externalUrl}`);
      const generatedStreamKey = generateId();
      let stream: MediaStream | null = null;

      // Only get user media if not using external source
      if (!externalUrl) {
        console.log(`Broadcaster getting user media`);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        localStreamRef.current = stream;
        console.log(`Broadcaster got media stream with ${stream.getTracks().length} tracks`);
      }

      // Create stream record in database
      console.log(`Broadcaster creating stream record`);
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

      if (error) {
        console.error(`Broadcaster failed to create stream record:`, error);
        throw error;
      }

      console.log(`Broadcaster created stream with ID: ${streamData.id}`);

      setState(prev => ({
        ...prev,
        isStreaming: true,
        streamId: streamData.id,
        streamKey: generatedStreamKey,
        externalStreamUrl: externalUrl || null,
      }));

      // Set up WebRTC signaling for viewers (only for camera streams, not external)
      if (!externalUrl) {
        console.log(`Broadcaster setting up signaling for camera stream`);
        setupSignaling(streamData.id);
      } else {
        console.log(`Broadcaster skipping signaling for external stream`);
      }

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
  }, [toast, user]);

  const stopStream = useCallback(async (saveRecording: boolean = false) => {
    try {
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

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

      // Clean up WebRTC signaling
      cleanupSignaling();

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

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setState(prev => ({ ...prev, isRecording: false }));

      // Upload recorded video to storage
      const recordedBlob = getRecordedBlob();
      if (recordedBlob && state.streamId) {
        try {
          const fileName = `recording-${state.streamId}-${Date.now()}.webm`;
          const filePath = `recordings/${fileName}`;

          // Try to upload first
          let { error: uploadError } = await supabase.storage
            .from("recordings")
            .upload(filePath, recordedBlob);

          // If bucket doesn't exist, create it and retry
          if (uploadError && uploadError.message?.includes("not found")) {
            console.log("Recordings bucket not found, creating it...");
            const { error: createBucketError } = await supabase.storage.createBucket("recordings", {
              public: true,
              allowedMimeTypes: ["video/webm", "video/mp4", "video/avi"],
              fileSizeLimit: 100000000, // 100MB
            });

            if (createBucketError) {
              console.error("Failed to create recordings bucket:", createBucketError);
              throw createBucketError;
            }

            // Retry upload
            const retryResult = await supabase.storage
              .from("recordings")
              .upload(filePath, recordedBlob);
            uploadError = retryResult.error;
          }

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("recordings")
            .getPublicUrl(filePath);

          // Update stream with recording URL
          const { error: updateError } = await supabase
            .from("live_streams")
            .update({
              recording_url: urlData.publicUrl,
              recording_status: "saved",
            })
            .eq("id", state.streamId);

          if (updateError) throw updateError;

          toast({
            title: "Recording Saved",
            description: "Your livestream recording has been saved successfully.",
          });
        } catch (error) {
          console.error("Error saving recording:", error);
          toast({
            title: "Recording Error",
            description: "Failed to save recording. The video may still be available locally.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Recording Stopped",
          description: "Recording stopped but no video data was captured.",
        });
      }
    }
  }, [toast, getRecordedBlob, state.streamId]);

  // Update peer connections when local stream changes
  useEffect(() => {
    if (localStreamRef.current && state.isStreaming && !state.externalStreamUrl) {
      peerConnectionsRef.current.forEach(async (pc, viewerId) => {
        const hasTracks = pc.getSenders().length > 0;

        if (!hasTracks) {
          // Add tracks for the first time
          localStreamRef.current!.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
          });

          // Create and send offer now that we have tracks
          if (!pc.localDescription) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channelRef.current?.send({
              type: "broadcast",
              event: "stream-signal",
              payload: { type: "offer", from: state.streamKey, to: viewerId, signal: offer }
            });
          }
        } else {
          // Replace tracks (for when stream changes)
          pc.getSenders().forEach(sender => {
            pc.removeTrack(sender);
          });
          localStreamRef.current!.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
          });
        }
      });
    }
  }, [state.isStreaming, state.externalStreamUrl, state.streamKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      cleanupSignaling();
    };
  }, [cleanupSignaling]);

  return {
    ...state,
    localStream: localStreamRef.current,
    startStream,
    stopStream,
    startRecording,
    stopRecording,
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false); // Use ref to avoid stale closures

  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleBroadcasterSignal = useCallback(async (payload: any) => {
    const { type, from, to, signal } = payload.payload;
    
    // Only process signals meant for us
    if (to && to !== viewerId.current) {
      console.log(`Ignoring signal for ${to}, we are ${viewerId.current}`);
      return;
    }
    
    console.log(`Viewer received ${type} signal from broadcaster`);
    
    let pc = peerConnectionRef.current;
    
    if (type === "offer") {
      // Clear retry interval once we get an offer
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }

      // Broadcaster is sending offer
      console.log(`Received offer from broadcaster ${from}`);
      if (!pc) {
        console.log(`Creating peer connection for viewer`);
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
        peerConnectionRef.current = pc;
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`Viewer sending ICE candidate`);
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
          isConnectingRef.current = false;
          // Clear timeout on successful connection
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
        };
        
        pc.onconnectionstatechange = () => {
          console.log(`Viewer connection state: ${pc?.connectionState}`);
          if (pc?.connectionState === "connected") {
            setIsConnected(true);
            setIsConnecting(false);
            isConnectingRef.current = false;
          } else if (pc?.connectionState === "disconnected" || pc?.connectionState === "failed") {
            setIsConnected(false);
            setRemoteStream(null);
            setIsConnecting(false);
            isConnectingRef.current = false;
          }
        };
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      console.log(`Set remote description, creating answer`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log(`Sending answer to broadcaster`);
      channelRef.current?.send({
        type: "broadcast",
        event: "viewer-signal",
        payload: { type: "answer", from: viewerId.current, to: from, signal: answer }
      });
      if (pendingViewerCandidatesRef.current.length) {
        console.log(`Processing ${pendingViewerCandidatesRef.current.length} pending ICE candidates`);
        for (const c of pendingViewerCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingViewerCandidatesRef.current = [];
      }
    } else if (type === "ice-candidate") {
      if (pc && pc.remoteDescription) {
        console.log(`Processing ICE candidate from broadcaster`);
        await pc.addIceCandidate(new RTCIceCandidate(signal));
      } else {
        console.log(`Buffering ICE candidate from broadcaster (pc=${!!pc}, hasRemoteDesc=${!!pc?.remoteDescription})`);
        pendingViewerCandidatesRef.current.push(signal);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!streamId || isConnectingRef.current || isConnected) {
      console.log(`Cannot connect: streamId=${streamId}, isConnecting=${isConnectingRef.current}, isConnected=${isConnected}`);
      return;
    }

    console.log(`Viewer connecting to stream ${streamId}`);
    setIsConnecting(true);
    isConnectingRef.current = true;

    // Set up signaling channel
    channelRef.current = supabase
      .channel(`live-stream-${streamId}`)
      .on("broadcast", { event: "stream-signal" }, handleBroadcasterSignal)
      .subscribe((status) => {
        console.log(`Viewer channel status: ${status}`);
        if (status === "SUBSCRIBED") {
          console.log(`Viewer sending viewer-join for stream ${streamId}`);
          
          const sendJoinSignal = () => {
            console.log(`Sending viewer-join signal (retry)`);
            channelRef.current?.send({
              type: "broadcast",
              event: "viewer-signal",
              payload: { type: "viewer-join", from: viewerId.current }
            });
          };

          // Send immediately
          sendJoinSignal();

          // And retry every 2 seconds until we get an offer or timeout
          if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = setInterval(sendJoinSignal, 2000);

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

          // Set a timeout to give up if connection doesn't establish
          connectionTimeoutRef.current = setTimeout(() => {
            console.log("Connection timeout - giving up");
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current);
              retryIntervalRef.current = null;
            }
            setIsConnecting(false);
            isConnectingRef.current = false;
            setIsConnected(false); // Also reset connected state
            // Clean up peer connection
            if (peerConnectionRef.current) {
              peerConnectionRef.current.close();
              peerConnectionRef.current = null;
            }
            setRemoteStream(null);
          }, 45000); // 45 second timeout
        }
      });
  }, [streamId, handleBroadcasterSignal, user?.id]);

  const disconnect = useCallback(() => {
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }

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
    isConnectingRef.current = false;
    
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

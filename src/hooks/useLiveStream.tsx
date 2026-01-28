import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);

  const startStream = useCallback(async (title: string, description?: string, externalUrl?: string) => {
    try {
      const generatedStreamKey = crypto.randomUUID();
      let stream: MediaStream | null = null;

      // Only get user media if not using external source
      if (!externalUrl) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
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
        })
        .select()
        .single();

      if (error) throw error;

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

      return { stream: stream!, streamId: streamData.id };
    } catch (error: any) {
      console.error("Error starting stream:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start stream. Check camera/microphone permissions.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const stopStream = useCallback(async (saveRecording: boolean = false) => {
    try {
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

    // Subscribe to stream updates and WebRTC signaling on the same channel
    channelRef.current = supabase
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
      .on("broadcast", { event: "webrtc-signal" }, async (payload: any) => {
        // Broadcaster will handle incoming offers/ice from viewers here
        try {
          const p = payload.payload || {};
          const { type, from, signal } = p;
          if (!type || !from) return;

          // Only broadcaster (the stream starter) handles incoming offers
          if (state.isStreaming) {
            if (type === "offer") {
              console.log("Received offer from viewer", from);
              // Create peer connection for this viewer
              const pc = new RTCPeerConnection();

              // Add local tracks
              if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
              }

              pc.onicecandidate = (ev) => {
                if (ev.candidate) {
                  channelRef.current?.send({
                    type: "broadcast",
                    event: "webrtc-signal",
                    payload: { type: "ice", from: state.streamId, to: from, signal: ev.candidate },
                  });
                }
              };

              // Create remote stream placeholder (if viewer expects remote audio for two-way)
              const remoteStream = new MediaStream();
              pc.ontrack = (e) => {
                e.streams.forEach((s) => s.getTracks().forEach((t) => remoteStream.addTrack(t)));
              };

              peerConnectionsRef.current.set(from, pc);

              await pc.setRemoteDescription(new RTCSessionDescription(signal));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              // Send answer back to viewer
              channelRef.current?.send({
                type: "broadcast",
                event: "webrtc-signal",
                payload: { type: "answer", from: state.streamId, to: from, signal: answer },
              });
            } else if (type === "ice") {
              const pc = peerConnectionsRef.current.get(p.from);
              if (pc && p.signal) {
                try {
                  await pc.addIceCandidate(p.signal);
                } catch (err) {
                  console.warn("Failed to add ICE candidate on broadcaster:", err);
                }
              }
            }
          }
        } catch (err) {
          console.error("Signaling handler error:", err);
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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

// Viewer hook used by consumers to receive a remote WebRTC stream.
// This is a lightweight implementation that exposes the API expected
// by `StreamPlayer`. It can be replaced with a full signalling
// implementation later.
export function useStreamViewer(streamId: string | null) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRefViewer = useRef<any>(null);
  const clientIdRef = useRef<string>(typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));

  const handleSignal = useCallback(async (payload: any) => {
    const p = payload.payload || {};
    const { type, from, to, signal } = p;
    if (!type) return;

    // Ignore signals not addressed to us (when a 'to' is provided)
    if (to && to !== clientIdRef.current && to !== streamId) return;

    if (type === "answer") {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        setIsConnected(true);
      } catch (err) {
        console.error("Error setting remote description (answer):", err);
      }
    } else if (type === "ice") {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(signal);
      } catch (err) {
        console.warn("Failed to add ICE candidate (viewer):", err);
      }
    }
  }, [streamId]);

  const connect = useCallback(async () => {
    if (!streamId) return;
    setIsConnecting(true);
    try {
      // Subscribe to signaling channel for this stream
      channelRefViewer.current = supabase
        .channel(`stream-${streamId}`)
        .on("broadcast", { event: "webrtc-signal" }, handleSignal)
        .subscribe();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const remote = new MediaStream();
      setRemoteStream(remote);

      pc.ontrack = (e) => {
        e.streams.forEach((s) => s.getTracks().forEach((t) => remote.addTrack(t)));
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          channelRefViewer.current?.send({
            type: "broadcast",
            event: "webrtc-signal",
            payload: { type: "ice", from: clientIdRef.current, to: streamId, signal: ev.candidate },
          });
        }
      };

      // Viewer initiates the offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to broadcaster
      channelRefViewer.current?.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: { type: "offer", from: clientIdRef.current, to: streamId, signal: offer },
      });

      setIsConnecting(false);
    } catch (err) {
      console.error("useStreamViewer connect error:", err);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [streamId, handleSignal]);

  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
        pcRef.current = null;
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((t) => t.stop());
        setRemoteStream(null);
      }
      if (channelRefViewer.current) {
        supabase.removeChannel(channelRefViewer.current);
        channelRefViewer.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { remoteStream, isConnected, isConnecting, connect };
}
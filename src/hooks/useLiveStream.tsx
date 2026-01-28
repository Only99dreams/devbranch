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

// Viewer hook used by consumers to receive a remote WebRTC stream.
// This is a lightweight implementation that exposes the API expected
// by `StreamPlayer`. It can be replaced with a full signalling
// implementation later.
export function useStreamViewer(streamId: string | null) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!streamId) return;
    setIsConnecting(true);
    try {
      // Placeholder: implement real signalling/SDP exchange here.
      // For now, simulate a short connection delay.
      await new Promise((res) => setTimeout(res, 300));
      setIsConnected(true);
    } catch (err) {
      console.error("useStreamViewer connect error:", err);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [streamId]);

  useEffect(() => {
    return () => {
      // Clean up any attached tracks if we had a remote stream.
      if (remoteStream) {
        remoteStream.getTracks().forEach((t) => t.stop());
        setRemoteStream(null);
      }
      setIsConnected(false);
      setIsConnecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { remoteStream, isConnected, isConnecting, connect };
}
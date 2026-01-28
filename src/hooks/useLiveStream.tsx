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
  const queuedIceMapRef = useRef<Map<string, any[]>>(new Map());

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

  // Helper to build a Blob from recorded chunks
  const getRecordedBlob = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return null;
    return new Blob(recordedChunksRef.current, { type: "video/webm" });
  }, []);

  // Upload a recorded Blob to Supabase storage and update the live_streams record
  const uploadRecordingBlob = useCallback(async (streamId: string, blob: Blob) => {
    try {
      const fileName = `recordings/${streamId}_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      const publicUrl = (urlData as any)?.publicUrl || null;

      if (publicUrl) {
        await supabase
          .from("live_streams")
          .update({ recording_url: publicUrl, recording_status: "saved" })
          .eq("id", streamId);
      }

      return publicUrl;
    } catch (err) {
      console.error("Failed to upload recording:", err);
      throw err;
    }
  }, []);

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

      // Stop recording if active. If saveRecording is requested, wait for
      // recorder to finish and upload the resulting blob, otherwise just stop.
      if (mediaRecorderRef.current && state.isRecording) {
        if (saveRecording && state.streamId) {
          const mr = mediaRecorderRef.current;

          await new Promise<void>((resolve) => {
            const prev = mr.onstop;
            mr.onstop = () => {
              if (prev) try { (prev as any)(); } catch {}
              resolve();
            };
            try {
              mr.stop();
            } catch (e) {
              console.warn("Error stopping MediaRecorder during stopStream:", e);
              resolve();
            }
          });

          // upload blob if available
          const blob = getRecordedBlob();
          if (blob) {
            try {
              await uploadRecordingBlob(state.streamId, blob);
              recordedChunksRef.current = [];
            } catch (err) {
              console.error("Failed to upload recording on stream end:", err);
            }
          }
        } else {
          try { mediaRecorderRef.current.stop(); } catch {}
        }
        mediaRecorderRef.current = null;
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
  }, [state.streamId, state.isRecording, toast, getRecordedBlob, uploadRecordingBlob]);

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

      // Keep a handler for onstop; callers will await this event when finalizing uploads
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, recorded chunks:", recordedChunksRef.current.length);
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

  // Async stopRecording: wait for recorder to finish, then upload and update DB
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    const mr = mediaRecorderRef.current;

    // Await the onstop event
    await new Promise<void>((resolve) => {
      const prev = mr.onstop;
      mr.onstop = () => {
        if (prev) try { (prev as any)(); } catch {}
        resolve();
      };
      try {
        mr.stop();
      } catch (e) {
        console.warn("Error stopping MediaRecorder:", e);
        resolve();
      }
    });

    mediaRecorderRef.current = null;
    setState(prev => ({ ...prev, isRecording: false }));

    toast({ title: "Recording Stopped", description: "Recording has been saved." });

    if (state.streamId) {
      const blob = getRecordedBlob();
      if (blob) {
        try {
          await uploadRecordingBlob(state.streamId, blob);
          recordedChunksRef.current = [];
        } catch (err) {
          toast({ title: "Error", description: "Failed to upload recording.", variant: "destructive" });
        }
      }
    }
  }, [getRecordedBlob, state.streamId, toast, uploadRecordingBlob]);

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

              // Flush any queued ICE candidates for this viewer
              const queued = queuedIceMapRef.current.get(from) || [];
              for (const c of queued) {
                try {
                  await pc.addIceCandidate(c);
                } catch (err) {
                  console.warn("Failed to add queued ICE to broadcaster PC:", err);
                }
              }
              queuedIceMapRef.current.delete(from);

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
              } else if (p.signal) {
                // Queue ICE until peer connection is created
                const arr = queuedIceMapRef.current.get(p.from) || [];
                arr.push(p.signal);
                queuedIceMapRef.current.set(p.from, arr);
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
  const queuedIceRef = useRef<any[]>([]);

  const handleSignal = useCallback(async (payload: any) => {
    const p = payload.payload || {};
    const { type, from, to, signal } = p;
    if (!type) return;

    // Ignore signals not addressed to us (when a 'to' is provided)
    if (to && to !== clientIdRef.current && to !== streamId) return;

    if (type === "answer") {
      if (!pcRef.current) return;
      try {
        // Only set remote description when we are in the expected state
        // (we created the local offer). If we are not in 'have-local-offer',
        // setting the remote answer will throw InvalidStateError; handle gracefully.
        const state = pcRef.current.signalingState;
        if (state === "have-local-offer" || state === "have-local-pranswer") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          // flush queued ICE candidates
          while (queuedIceRef.current.length > 0) {
            const c = queuedIceRef.current.shift();
            try {
              await pcRef.current.addIceCandidate(c);
            } catch (err) {
              console.warn("Failed to add queued ICE candidate:", err);
            }
          }
          setIsConnected(true);
        } else {
          console.warn("Received answer but signalingState is", state, "; ignoring to avoid InvalidStateError");
        }
      } catch (err: any) {
        if (err && err.name === "InvalidStateError") {
          console.warn("Ignored InvalidStateError when applying remote answer", err);
        } else {
          console.error("Error setting remote description (answer):", err);
        }
      }
    } else if (type === "ice") {
      if (!pcRef.current) {
        // Queue ICE until peer connection exists
        queuedIceRef.current.push(signal);
        return;
      }
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

      // Add recvonly transceivers so the SDP contains appropriate m-lines for receiving
      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (e) {
        // Some browsers may not support addTransceiver; it's optional
        // Proceed without it if unavailable.
      }

      // Viewer initiates the offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to broadcaster
      channelRefViewer.current?.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: { type: "offer", from: clientIdRef.current, to: streamId, signal: offer },
      });

      // If any ICE candidates were received early, try to add them after local description
      if (queuedIceRef.current.length > 0) {
        // Do not add yet — we wait for remote answer to be applied. Keep queued.
      }

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
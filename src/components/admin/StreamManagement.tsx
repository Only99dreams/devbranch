import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Play, 
  Square, 
  Radio, 
  Save, 
  Trash2, 
  Plus, 
  Link as LinkIcon, 
  Eye,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Circle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useLiveStream } from "@/hooks/useLiveStream";
import type { Tables, Enums } from "@/integrations/supabase/types";

type LiveStream = Tables<"live_streams">;
type StreamStatus = Enums<"stream_status">;
type RecordingStatus = Enums<"recording_status">;
type StreamSource = "camera" | "external";

export function StreamManagement() {
  const { user } = useAuth();
  const {
    isStreaming,
    isRecording,
    localStream,
    streamKey,
    externalStreamUrl,
    startStream: startLiveStream,
    stopStream: stopLiveStream,
    startRecording,
    stopRecording,
  } = useLiveStream();

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [newStream, setNewStream] = useState({ title: "", description: "", externalUrl: "" });
  
  // Go Live form state
  const [liveTitle, setLiveTitle] = useState("");
  const [liveDescription, setLiveDescription] = useState("");
  const [streamSource, setStreamSource] = useState<StreamSource>("camera");
  const [externalUrl, setExternalUrl] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // Saved recordings state
  const [savedRecordings, setSavedRecordings] = useState<LiveStream[]>([]);
  const [showEditRecordingDialog, setShowEditRecordingDialog] = useState(false);
  const [editingRecording, setEditingRecording] = useState<LiveStream | null>(null);
  const [editRecordingUrl, setEditRecordingUrl] = useState("");

  useEffect(() => {
    fetchStreams();
    fetchSavedRecordings();

    const channel = supabase
      .channel("streams_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        fetchStreams();
        fetchSavedRecordings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Preview video stream
  useEffect(() => {
    if (videoPreviewRef.current && previewStream) {
      videoPreviewRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Cleanup preview stream when dialog closes
  useEffect(() => {
    if (!showGoLiveDialog && previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
  }, [showGoLiveDialog]);

  // Show video preview in the live section
  useEffect(() => {
    if (isStreaming && localStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = localStream;
    }
  }, [isStreaming, localStream]);

  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setPreviewStream(stream);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
    } catch (error) {
      console.error("Failed to get media:", error);
      toast({ 
        title: "Camera Error", 
        description: "Could not access camera/microphone. Check permissions.", 
        variant: "destructive" 
      });
    }
  };

  const togglePreviewVideo = () => {
    if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const togglePreviewAudio = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const handleOpenGoLive = () => {
    setShowGoLiveDialog(true);
    if (streamSource === "camera") {
      startCameraPreview();
    }
  };

  const handleGoLive = async () => {
    if (!liveTitle.trim()) {
      toast({ title: "Error", description: "Please enter a stream title", variant: "destructive" });
      return;
    }
    if (streamSource === "external" && !externalUrl.trim()) {
      toast({ title: "Error", description: "Please enter an external stream URL", variant: "destructive" });
      return;
    }

    setIsStarting(true);
    try {
      // Stop preview stream first
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }

      await startLiveStream(
        liveTitle, 
        liveDescription, 
        streamSource === "external" ? externalUrl : undefined
      );
      
      setShowGoLiveDialog(false);
      setLiveTitle("");
      setLiveDescription("");
      setExternalUrl("");
    } catch (error) {
      console.error("Failed to start stream:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopLive = async (saveRecording: boolean) => {
    await stopLiveStream(saveRecording);
    setShowStopDialog(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const fetchStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch streams", variant: "destructive" });
    } else {
      setStreams(data || []);
    }
    setLoading(false);
  };

  const fetchSavedRecordings = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select("*")
      .eq("status", "ended")
      .eq("recording_status", "saved")
      .order("ended_at", { ascending: false });

    if (!error && data) {
      setSavedRecordings(data);
    }
  };

  const deleteRecording = async (recording: LiveStream) => {
    const { error } = await supabase
      .from("live_streams")
      .update({ recording_status: "discarded" as RecordingStatus, recording_url: null })
      .eq("id", recording.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete recording", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Recording has been removed" });
    }
  };

  const openEditRecordingDialog = (recording: LiveStream) => {
    setEditingRecording(recording);
    setEditRecordingUrl(recording.recording_url || "");
    setShowEditRecordingDialog(true);
  };

  const updateRecordingUrl = async () => {
    if (!editingRecording) return;

    const { error } = await supabase
      .from("live_streams")
      .update({ recording_url: editRecordingUrl || null })
      .eq("id", editingRecording.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update recording", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Recording URL has been updated" });
      setShowEditRecordingDialog(false);
      setEditingRecording(null);
      setEditRecordingUrl("");
    }
  };

  const createStream = async () => {
    if (!newStream.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("live_streams").insert({
      title: newStream.title,
      description: newStream.description,
      external_stream_url: newStream.externalUrl || null,
      created_by: user?.id,
      status: "scheduled" as StreamStatus,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create stream", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Stream created" });
      setShowCreateDialog(false);
      setNewStream({ title: "", description: "", externalUrl: "" });
    }
  };

  const startStream = async (stream: LiveStream) => {
    const { error } = await supabase
      .from("live_streams")
      .update({
        status: "live" as StreamStatus,
        started_at: new Date().toISOString(),
      })
      .eq("id", stream.id);

    if (error) {
      toast({ title: "Error", description: "Failed to start stream", variant: "destructive" });
    } else {
      toast({ title: "Live!", description: "Stream is now live" });
    }
  };

  const stopStream = async (stream: LiveStream) => {
    const { error } = await supabase
      .from("live_streams")
      .update({
        status: "ended" as StreamStatus,
        ended_at: new Date().toISOString(),
      })
      .eq("id", stream.id);

    if (error) {
      toast({ title: "Error", description: "Failed to stop stream", variant: "destructive" });
    } else {
      toast({ title: "Ended", description: "Stream has ended" });
    }
  };

  const updateRecordingStatus = async (stream: LiveStream, status: RecordingStatus) => {
    const { error } = await supabase
      .from("live_streams")
      .update({ recording_status: status })
      .eq("id", stream.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update recording", variant: "destructive" });
    } else {
      toast({
        title: status === "saved" ? "Saved" : "Discarded",
        description: status === "saved" ? "Recording saved" : "Recording discarded",
      });
    }
  };

  const saveRecordingWithUrl = async () => {
    if (!selectedStream) return;

    const { error } = await supabase
      .from("live_streams")
      .update({ 
        recording_status: "saved" as RecordingStatus,
        recording_url: recordingUrl || null
      })
      .eq("id", selectedStream.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save recording", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Recording saved successfully" });
      setShowSaveDialog(false);
      setSelectedStream(null);
      setRecordingUrl("");
    }
  };

  const openSaveDialog = (stream: LiveStream) => {
    setSelectedStream(stream);
    setRecordingUrl(stream.recording_url || "");
    setShowSaveDialog(true);
  };

  const getStatusBadge = (status: StreamStatus) => {
    switch (status) {
      case "live":
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <span className="w-2 h-2 rounded-full bg-destructive mr-1.5 animate-pulse" />
            LIVE
          </Badge>
        );
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "ended":
        return <Badge variant="outline">Ended</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Go Live Section */}
      {isStreaming ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              You Are Live!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Preview */}
            {localStream && !externalStreamUrl && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {externalStreamUrl && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Streaming from external source
                </p>
              </div>
            )}

            {/* Stream Key */}
            {streamKey && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Stream Key (for OBS/other tools):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded truncate">{streamKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(streamKey, "Stream Key")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex flex-wrap gap-2">
              {!isRecording ? (
                <Button variant="outline" onClick={startRecording} className="flex-1">
                  <Circle className="w-4 h-4 mr-2 text-destructive" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={stopRecording} 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              )}
            </div>

            {/* End Stream Button */}
            <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Square className="w-4 h-4 mr-2" />
                  End Stream
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>End Live Stream</DialogTitle>
                  <DialogDescription>
                    What would you like to do with this stream recording?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => handleStopLive(false)} className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Discard Recording
                  </Button>
                  <Button onClick={() => handleStopLive(true)} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Recording
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-accent" />
              Go Live
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Start a live stream using your camera or an external streaming source
            </p>
            <Button onClick={handleOpenGoLive} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Video className="w-4 h-4 mr-2" />
              Start Streaming
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stream Management Table */}
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Stream Management</CardTitle>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          New Stream
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading streams...</div>
        ) : streams.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Streams Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first stream to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Recording</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{stream.title}</p>
                      {stream.description && (
                        <p className="text-sm text-muted-foreground">{stream.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(stream.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {stream.started_at
                      ? format(new Date(stream.started_at), "MMM d, h:mm a")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {stream.recording_status === "saved" ? (
                      <Badge variant="default">Saved</Badge>
                    ) : stream.recording_status === "discarded" ? (
                      <Badge variant="outline">Discarded</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {stream.status === "scheduled" && (
                        <Button size="sm" onClick={() => startStream(stream)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {stream.status === "live" && (
                        <Button size="sm" variant="destructive" onClick={() => stopStream(stream)}>
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      )}
                      {stream.status === "ended" && stream.recording_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSaveDialog(stream)}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateRecordingStatus(stream, "discarded")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {stream.status === "ended" && stream.recording_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a href={stream.recording_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

      {/* Saved Recordings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Saved Recordings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {savedRecordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No saved recordings yet</p>
              <p className="text-sm">Recordings will appear here after you save them</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRecordings.map((recording) => (
                <Card key={recording.id} className="overflow-hidden border-border/50">
                  <div className="aspect-video bg-muted relative">
                    {recording.recording_url ? (
                      recording.recording_url.includes("youtube.com") || recording.recording_url.includes("youtu.be") ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/20">
                          <div className="text-center">
                            <Play className="w-10 h-10 mx-auto text-red-500 mb-2" />
                            <Badge className="bg-red-600">YouTube</Badge>
                          </div>
                        </div>
                      ) : (
                        <video
                          src={recording.recording_url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <Play className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-black/70">Recording</Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold line-clamp-1">{recording.title}</h4>
                      {recording.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{recording.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {recording.ended_at && format(new Date(recording.ended_at), "MMM d, yyyy h:mm a")}
                    </div>
                    <div className="flex gap-2">
                      {recording.recording_url && (
                        <Button size="sm" variant="outline" asChild className="flex-1">
                          <a href={recording.recording_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-3 h-3 mr-1" />
                            Watch
                          </a>
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openEditRecordingDialog(recording)}
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Edit URL
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteRecording(recording)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Stream Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Stream</DialogTitle>
            <DialogDescription>Set up a new live stream for your community</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Sunday Service"
                value={newStream.title}
                onChange={(e) => setNewStream((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Join us for worship..."
                value={newStream.description}
                onChange={(e) => setNewStream((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">External Stream URL (Optional)</label>
              <Input
                placeholder="https://youtube.com/embed/... or stream URL"
                value={newStream.externalUrl}
                onChange={(e) => setNewStream((prev) => ({ ...prev, externalUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use camera, or provide YouTube/Facebook Live embed URL
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createStream} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Create Stream
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Recording Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Recording</DialogTitle>
            <DialogDescription>
              Add a recording URL so viewers can watch this stream later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="recording-url">Recording URL (Optional)</Label>
              <div className="flex items-center gap-2 mt-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="recording-url"
                  placeholder="https://youtube.com/watch?v=... or video URL"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the URL where this stream recording can be watched (YouTube, Vimeo, etc.)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveRecordingWithUrl} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Save className="w-4 h-4 mr-2" />
              Save Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Go Live Dialog */}
      <Dialog open={showGoLiveDialog} onOpenChange={(open) => {
        if (!open && previewStream) {
          previewStream.getTracks().forEach(track => track.stop());
          setPreviewStream(null);
        }
        setShowGoLiveDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-accent" />
              Go Live
            </DialogTitle>
            <DialogDescription>
              Configure your live stream settings and go live
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Stream Source Selection */}
            <div className="space-y-3">
              <Label>Stream Source</Label>
              <RadioGroup 
                value={streamSource} 
                onValueChange={(v) => {
                  setStreamSource(v as StreamSource);
                  if (v === "camera" && !previewStream) {
                    startCameraPreview();
                  } else if (v === "external" && previewStream) {
                    previewStream.getTracks().forEach(track => track.stop());
                    setPreviewStream(null);
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="camera" id="source-camera" />
                  <Label htmlFor="source-camera" className="font-normal cursor-pointer flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Camera & Microphone
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="external" id="source-external" />
                  <Label htmlFor="source-external" className="font-normal cursor-pointer flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    External Stream (YouTube, Facebook, etc.)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Camera Preview */}
            {streamSource === "camera" && (
              <div className="space-y-3">
                <Label>Camera Preview</Label>
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {previewStream ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <VideoOff className="w-12 h-12 mx-auto mb-2" />
                        <p>Camera not available</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={startCameraPreview}
                        >
                          Retry Camera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Preview Controls */}
                {previewStream && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant={isVideoEnabled ? "outline" : "destructive"}
                      onClick={togglePreviewVideo}
                    >
                      {isVideoEnabled ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                      {isVideoEnabled ? "Camera On" : "Camera Off"}
                    </Button>
                    <Button
                      size="sm"
                      variant={isAudioEnabled ? "outline" : "destructive"}
                      onClick={togglePreviewAudio}
                    >
                      {isAudioEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                      {isAudioEnabled ? "Mic On" : "Mic Off"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* External URL Input */}
            {streamSource === "external" && (
              <div className="space-y-2">
                <Label htmlFor="external-url">External Stream URL</Label>
                <Input
                  id="external-url"
                  placeholder="https://youtube.com/embed/... or live stream URL"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the embed URL from YouTube Live, Facebook Live, or other streaming platforms
                </p>
              </div>
            )}

            {/* Stream Details */}
            <div className="space-y-2">
              <Label htmlFor="live-title">Stream Title *</Label>
              <Input
                id="live-title"
                placeholder="Sunday Service - January 2026"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="live-description">Description (optional)</Label>
              <Textarea
                id="live-description"
                placeholder="Join us for this special broadcast..."
                value={liveDescription}
                onChange={(e) => setLiveDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoLiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGoLive}
              disabled={!liveTitle.trim() || isStarting || (streamSource === "external" && !externalUrl.trim())}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Radio className="w-4 h-4 mr-2" />
              {isStarting ? "Going Live..." : "Go Live"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Recording URL Dialog */}
      <Dialog open={showEditRecordingDialog} onOpenChange={setShowEditRecordingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recording URL</DialogTitle>
            <DialogDescription>
              Update the URL where this recording can be watched
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-recording-url">Recording URL</Label>
              <div className="flex items-center gap-2 mt-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-recording-url"
                  placeholder="https://youtube.com/watch?v=... or video URL"
                  value={editRecordingUrl}
                  onChange={(e) => setEditRecordingUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter the URL where this stream recording can be watched (YouTube, Vimeo, etc.)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRecordingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateRecordingUrl} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Save className="w-4 h-4 mr-2" />
              Update URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

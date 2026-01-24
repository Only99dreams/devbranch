import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Radio, Square, Circle, Save, Trash2, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type StreamSource = "camera" | "external";

interface StreamControlsProps {
  isStreaming: boolean;
  isRecording: boolean;
  streamKey?: string;
  onStartStream: (title: string, description?: string, externalUrl?: string) => Promise<{ stream: MediaStream | null; streamId: string } | void>;
  onStopStream: (saveRecording: boolean) => Promise<void>;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function StreamControls({
  isStreaming,
  isRecording,
  streamKey,
  onStartStream,
  onStopStream,
  onStartRecording,
  onStopRecording,
}: StreamControlsProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamSource, setStreamSource] = useState<StreamSource>("camera");
  const [externalUrl, setExternalUrl] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);

  const handleStartStream = async () => {
    if (!title.trim()) return;
    if (streamSource === "external" && !externalUrl.trim()) {
      toast({ title: "Error", description: "Please enter an external stream URL", variant: "destructive" });
      return;
    }
    setIsStarting(true);
    try {
      await onStartStream(title, description, streamSource === "external" ? externalUrl : undefined);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopStream = async (saveRecording: boolean) => {
    await onStopStream(saveRecording);
    setShowStopDialog(false);
    setTitle("");
    setDescription("");
    setExternalUrl("");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  if (!isStreaming) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-serif">Start Live Stream</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Stream Title</Label>
            <Input
              id="title"
              placeholder="e.g., Sunday Service - January 5th"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the stream..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Stream Source Selection */}
          <div className="space-y-3">
            <Label>Stream Source</Label>
            <RadioGroup value={streamSource} onValueChange={(v) => setStreamSource(v as StreamSource)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="camera" id="camera" />
                <Label htmlFor="camera" className="font-normal cursor-pointer">
                  Camera & Microphone
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="font-normal cursor-pointer">
                  External Stream (YouTube, Facebook, etc.)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {streamSource === "external" && (
            <div className="space-y-2">
              <Label htmlFor="externalUrl">External Stream URL</Label>
              <Input
                id="externalUrl"
                placeholder="https://youtube.com/embed/... or embed URL"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the embed URL from YouTube Live, Facebook Live, or other streaming platforms
              </p>
            </div>
          )}

          <Button
            onClick={handleStartStream}
            disabled={!title.trim() || isStarting || (streamSource === "external" && !externalUrl.trim())}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Radio className="w-4 h-4 mr-2" />
            {isStarting ? "Starting..." : "Go Live"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          Live Now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stream Key Info for External Tools */}
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

        <div className="flex flex-wrap gap-2">
          {!isRecording ? (
            <Button
              variant="outline"
              onClick={onStartRecording}
              className="flex-1"
            >
              <Circle className="w-4 h-4 mr-2 text-destructive" />
              Start Recording
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onStopRecording}
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

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
              <Button
                variant="outline"
                onClick={() => handleStopStream(false)}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Discard Recording
              </Button>
              <Button
                onClick={() => handleStopStream(true)}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Recording
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

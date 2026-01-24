import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Eye, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  view_count?: number;
}

const Recordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  useEffect(() => {
    fetchRecordings();
    const channel = supabase
      .channel("recordings-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => fetchRecordings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecordings = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select("id, title, description, recording_url, started_at, ended_at")
      .eq("status", "ended")
      .eq("recording_status", "saved")
      .order("ended_at", { ascending: false });

    if (!error && data) {
      setRecordings(data as Recording[]);
    }
    setLoading(false);
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.max(1, Math.round(diff / 60000));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${minutes}m`;
  };

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // YouTube watch URL
    const ytWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytWatchMatch) {
      return `https://www.youtube.com/embed/${ytWatchMatch[1]}`;
    }
    
    // YouTube embed URL
    if (url.includes("youtube.com/embed/")) {
      return url;
    }
    
    return null;
  };

  const isYouTubeUrl = (url: string): boolean => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  };

  return (
    <Layout>
      <section className="py-12 md:py-16">
        <div className="container space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold">Recorded Streams</h1>
              <p className="text-muted-foreground">Replay past live streams anytime.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : recordings.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                No recordings available yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordings.map((rec) => (
                <Card key={rec.id} className="overflow-hidden border-border/50 hover:shadow-card transition-shadow">
                  <div className="relative aspect-video bg-muted">
                    {rec.recording_url && isYouTubeUrl(rec.recording_url) ? (
                      <div 
                        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 cursor-pointer group"
                        onClick={() => setSelectedRecording(rec)}
                      >
                        <div className="text-center">
                          <Play className="w-12 h-12 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-xs text-muted-foreground mt-2 block">Click to play</span>
                        </div>
                      </div>
                    ) : rec.recording_url ? (
                      <video
                        src={rec.recording_url}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <Play className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-black/70">Replay</Badge>
                    {rec.recording_url && isYouTubeUrl(rec.recording_url) && (
                      <Badge className="absolute top-2 right-2 bg-red-600">YouTube</Badge>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2">{rec.title}</h3>
                    {rec.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{rec.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rec.started_at ? format(new Date(rec.started_at), "MMM d, yyyy") : ""}
                      </span>
                      {rec.view_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {rec.view_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(rec.started_at, rec.ended_at)}
                      </span>
                      {rec.recording_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecording(rec)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Watch
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Video Player Dialog */}
          <Dialog open={!!selectedRecording} onOpenChange={(open) => !open && setSelectedRecording(null)}>
            <DialogContent className="max-w-4xl p-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>{selectedRecording?.title}</DialogTitle>
              </DialogHeader>
              <div className="aspect-video bg-black">
                {selectedRecording?.recording_url && isYouTubeUrl(selectedRecording.recording_url) ? (
                  <iframe
                    src={getEmbedUrl(selectedRecording.recording_url) || selectedRecording.recording_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : selectedRecording?.recording_url ? (
                  <video
                    src={selectedRecording.recording_url}
                    className="w-full h-full"
                    controls
                    autoPlay
                  />
                ) : null}
              </div>
              {selectedRecording?.description && (
                <p className="p-4 pt-2 text-sm text-muted-foreground">{selectedRecording.description}</p>
              )}
              {selectedRecording?.recording_url && (
                <div className="p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedRecording.recording_url!, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open in New Tab
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </Layout>
  );
};

export default Recordings;

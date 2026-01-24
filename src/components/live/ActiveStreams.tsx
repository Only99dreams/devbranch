import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Users, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  started_at: string | null;
  created_at: string;
  external_stream_url: string | null;
}

interface ActiveStreamsProps {
  onJoinStream?: (streamId: string) => void;
}

export function ActiveStreams({ onJoinStream }: ActiveStreamsProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreams();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("active-streams")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select("id, title, description, status, started_at, created_at, external_stream_url")
      .eq("status", "live")
      .order("started_at", { ascending: false });

    if (!error && data) {
      setStreams(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (streams.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <Radio className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Live Streams</h3>
          <p className="text-muted-foreground">
            There are no active streams right now. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
        Live Now
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {streams.map((stream) => (
          <Card key={stream.id} className="border-border/50 hover:border-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-serif">{stream.title}</CardTitle>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  LIVE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stream.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {stream.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {stream.started_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Started {formatDistanceToNow(new Date(stream.started_at), { addSuffix: true })}
                  </span>
                )}
                {stream.external_stream_url && (
                  <span className="flex items-center gap-1 text-accent">
                    <ExternalLink className="w-4 h-4" />
                    External
                  </span>
                )}
              </div>

              <Button
                onClick={() => onJoinStream?.(stream.id)}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Radio className="w-4 h-4 mr-2" />
                Watch Stream
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

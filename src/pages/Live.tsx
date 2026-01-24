import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Play, Calendar, Clock, Eye, LogIn, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StreamPlayer } from "@/components/live/StreamPlayer";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  started_at: string | null;
  created_by?: string | null;
  external_stream_url: string | null;
}

interface ScheduledStream {
  id: string;
  title: string;
  scheduled_at: string | null;
  description: string | null;
}

interface PastStream {
  id: string;
  title: string;
  ended_at: string | null;
  started_at: string | null;
  recording_url: string | null;
  description: string | null;
  view_count?: number;
  created_by?: string | null;
}

const Live = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [upcomingStreams, setUpcomingStreams] = useState<ScheduledStream[]>([]);
  const [pastStreams, setPastStreams] = useState<PastStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string }>>({});

  useEffect(() => {
    fetchStreams();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("live-streams-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => fetchStreams()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStreams = async () => {
    const [liveRes, scheduledRes, pastRes] = await Promise.all([
      supabase
        .from("live_streams")
        .select("id, title, description, status, started_at, external_stream_url, created_by")
        .eq("status", "live")
        .order("started_at", { ascending: false }),
      supabase
        .from("live_streams")
        .select("id, title, scheduled_at, description")
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("live_streams")
        .select("id, title, ended_at, started_at, recording_url, description, created_by")
        .eq("status", "ended")
        .eq("recording_status", "saved")
        .order("ended_at", { ascending: false })
        .limit(8),
    ]);

    if (liveRes.data) {
      setLiveStreams(liveRes.data);
      // Auto-select first live stream
      if (liveRes.data.length > 0 && !selectedStream) {
        setSelectedStream(liveRes.data[0]);
      }
      const creatorIds = Array.from(new Set(liveRes.data.map(s => s.created_by).filter(Boolean))) as string[];
      if (creatorIds.length > 0) {
        const { data: liveProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);
        if (liveProfiles) {
          setProfiles(prev => {
            const next = { ...prev };
            liveProfiles.forEach(p => { next[p.user_id] = { full_name: p.full_name }; });
            return next;
          });
        }
      }
    }
    if (scheduledRes.data) setUpcomingStreams(scheduledRes.data);
    if (pastRes.data) setPastStreams(pastRes.data);
    if (pastRes.data) {
      const pastCreatorIds = Array.from(new Set(pastRes.data.map(s => s.created_by).filter(Boolean))) as string[];
      if (pastCreatorIds.length > 0) {
        const { data: pastProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", pastCreatorIds);
        if (pastProfiles) {
          setProfiles(prev => {
            const next = { ...prev };
            pastProfiles.forEach(p => { next[p.user_id] = { full_name: p.full_name }; });
            return next;
          });
        }
      }
    }
    setLoading(false);
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "N/A";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleWatchStream = (stream: LiveStream) => {
    setSelectedStream(stream);
    // Scroll to player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchRecording = (recording: PastStream) => {
    if (recording.recording_url) {
      // Open recording in player
      setSelectedStream({
        id: recording.id,
        title: recording.title,
        description: recording.description,
        status: "ended",
        started_at: recording.started_at,
        external_stream_url: recording.recording_url,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Layout>
      {/* Main Content - YouTube-like Layout */}
      <section className="py-6 md:py-8">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Video Player */}
            <div className="lg:col-span-2">
              {selectedStream ? (
                <StreamPlayer
                  streamId={selectedStream.id}
                  externalUrl={selectedStream.external_stream_url}
                  isLive={selectedStream.status === "live"}
                  title={selectedStream.title}
                  description={selectedStream.description || undefined}
                  viewerCount={0}
                  channelName={selectedStream.created_by ? (profiles[selectedStream.created_by]?.full_name || "Channel") : "Channel"}
                />
              ) : loading ? (
                <Skeleton className="aspect-video w-full rounded-xl" />
              ) : liveStreams.length > 0 ? (
                <StreamPlayer
                  streamId={liveStreams[0].id}
                  externalUrl={liveStreams[0].external_stream_url}
                  isLive={true}
                  title={liveStreams[0].title}
                  description={liveStreams[0].description || undefined}
                  channelName={liveStreams[0].created_by ? (profiles[liveStreams[0].created_by]?.full_name || "Channel") : "Channel"}
                />
              ) : (
                <Card className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden">
                  <CardContent className="h-full flex flex-col items-center justify-center text-white p-4">
                    <Radio className="w-12 h-12 md:w-16 md:h-16 mb-3 md:mb-4 opacity-50" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2 text-center">No Live Stream</h3>
                    <p className="text-gray-400 text-center text-sm md:text-base max-w-md px-4">
                      There are no active live streams right now. Check back during our scheduled service times or browse recordings below.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Sign in prompt for guests */}
              {!user && (
                <Card className="mt-4 border-accent/30 bg-accent/5">
                  <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <LogIn className="w-5 h-5 text-accent hidden sm:block" />
                      <div>
                        <p className="font-medium text-sm md:text-base">Want to interact with the stream?</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Sign in to like, comment, and participate in live chat</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate("/auth")} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
                      Sign In
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Live & Upcoming */}
            <div className="space-y-6">
              {/* Live Now Section */}
              {liveStreams.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    Live Now
                  </h3>
                  <div className="space-y-3">
                    {liveStreams.map((stream) => (
                      <Card 
                        key={stream.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedStream?.id === stream.id ? 'ring-2 ring-accent' : 'border-border/50'}`}
                        onClick={() => handleWatchStream(stream)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <div className="w-40 h-24 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0">
                              <Play className="w-8 h-8 text-red-500" />
                              <Badge className="absolute bottom-1 right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5">
                                LIVE
                              </Badge>
                            </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">{stream.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {stream.created_by ? (profiles[stream.created_by]?.full_name || "Channel") : "Channel"}
                            </p>
                            {stream.started_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Started {formatDistanceToNow(new Date(stream.started_at), { addSuffix: true })}
                              </p>
                            )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Streams */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upcoming
                </h3>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : upcomingStreams.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                      No upcoming streams scheduled
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {upcomingStreams.slice(0, 3).map((stream) => (
                      <Card key={stream.id} className="border-border/50 hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm mb-1 line-clamp-1">{stream.title}</h4>
                          {stream.scheduled_at && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(stream.scheduled_at), "EEE, MMM d")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(stream.scheduled_at), "h:mm a")}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Past Recordings - YouTube Grid Style */}
          <div className="mt-12">
            <h2 className="text-2xl font-serif font-semibold mb-6">Recordings</h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : pastStreams.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No recordings available yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pastStreams.map((stream) => (
                  <Card 
                    key={stream.id} 
                    className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all border-border/50"
                    onClick={() => handleWatchRecording(stream)}
                  >
                    <div className="relative aspect-video bg-muted">
                      {stream.recording_url ? (
                        stream.recording_url.includes("youtube.com") || stream.recording_url.includes("youtu.be") ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/20">
                            <Play className="w-12 h-12 text-red-500 group-hover:scale-110 transition-transform" />
                          </div>
                        ) : (
                          <video
                            src={stream.recording_url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <Play className="w-12 h-12 text-muted-foreground group-hover:scale-110 transition-transform" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                      <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">
                        {formatDuration(stream.started_at, stream.ended_at)}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                        {stream.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {stream.created_by ? (profiles[stream.created_by]?.full_name || "Channel") : "Channel"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {stream.ended_at && (
                          <span>{formatDistanceToNow(new Date(stream.ended_at), { addSuffix: true })}</span>
                        )}
                        {stream.view_count !== undefined && stream.view_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {stream.view_count.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Live;

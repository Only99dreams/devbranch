import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, Users, Mic, MicOff, Video, VideoOff, Calendar, Clock, Shield } from "lucide-react";
import { usePrayerSessions } from "@/hooks/usePrayerSession";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { PrayerRoom } from "@/components/prayer/PrayerRoom";
import { SessionCard } from "@/components/prayer/SessionCard";
import { PrayerRequestForm } from "@/components/prayer/PrayerRequestForm";
import { JoinRequestStatus } from "@/components/prayer/JoinRequestStatus";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type PrayerSession = Tables<"prayer_sessions">;

const Prayer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveSessions, scheduledSessions, loading } = usePrayerSessions();
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PrayerSession | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showPrayerRequestForm, setShowPrayerRequestForm] = useState(false);

  // Join request hook for the selected session
  const { myRequest, submitRequest, refetch: refetchRequest } = useJoinRequests(selectedSession?.id);

  useEffect(() => {
    fetchParticipantCounts();
  }, [liveSessions, scheduledSessions]);

  const fetchParticipantCounts = useCallback(async () => {
    const allSessions = [...liveSessions, ...scheduledSessions];
    const counts: Record<string, number> = {};
    
    for (const session of allSessions) {
      const { count } = await supabase
        .from("prayer_participants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session.id)
        .is("left_at", null);
      counts[session.id] = count || 0;
    }
    
    setParticipantCounts(counts);
  }, [liveSessions, scheduledSessions]);

  const handleJoinSession = (session: PrayerSession) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedSession(session);
    setShowJoinDialog(true);
  };

  const handleSubmitJoinRequest = async () => {
    setIsSubmittingRequest(true);
    await submitRequest();
    setIsSubmittingRequest(false);
    refetchRequest();
  };

  const handleConfirmJoin = () => {
    // Check if session requires permission and user is not approved
    if (selectedSession?.requires_permission && myRequest?.status !== "approved") {
      // Don't allow joining if not approved
      return;
    }
    setShowJoinDialog(false);
    setInRoom(true);
  };

  const handleLeaveRoom = () => {
    setInRoom(false);
    setSelectedSession(null);
  };

  // Determine if user can join directly or needs approval
  const canJoinDirectly = selectedSession && (
    !selectedSession.requires_permission || 
    myRequest?.status === "approved"
  );

  if (inRoom && selectedSession) {
    return (
      <Layout>
        <div className="container py-8">
          <PrayerRoom sessionId={selectedSession.id} onLeave={handleLeaveRoom} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        </div>
        <div className="container relative z-10 text-center">
          <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground mb-4">
            <Heart className="w-3 h-3 mr-1" />
            Prayer Ministry
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-4">
            Join in Prayer
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Connect with believers worldwide in powerful prayer sessions. Speak, listen, or simply be present as we lift our voices together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={() => liveSessions[0] && handleJoinSession(liveSessions[0])}>
              <Heart className="w-5 h-5" />
              Join Live Prayer
            </Button>
            <Button variant="hero-outline" size="lg" onClick={() => setShowPrayerRequestForm(true)}>
              Submit Prayer Request
            </Button>
          </div>
        </div>
      </section>

      {/* Live Sessions */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <h2 className="text-2xl font-serif font-semibold">Live Sessions Now</h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
          ) : liveSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {liveSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isLive
                  participantCount={participantCounts[session.id] || 0}
                  onJoin={handleJoinSession}
                />
              ))}
            </div>
          ) : (
            <Card className="mb-12">
              <CardContent className="p-8 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-serif font-semibold mb-2">No Live Sessions</h3>
                <p className="text-muted-foreground">Check back during scheduled prayer times or view upcoming sessions below.</p>
              </CardContent>
            </Card>
          )}

          {/* Scheduled Sessions */}
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-semibold mb-2">Scheduled Sessions</h2>
            <p className="text-muted-foreground">Upcoming prayer gatherings you can join</p>
          </div>

          {scheduledSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  participantCount={participantCounts[session.id] || 0}
                  onJoin={handleJoinSession}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-serif font-semibold mb-2">No Scheduled Sessions</h3>
                <p className="text-muted-foreground">Check back later for upcoming prayer sessions.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Join Prayer Session</DialogTitle>
            <DialogDescription>
              {selectedSession?.requires_permission && !canJoinDirectly
                ? `This session requires permission from the session creator.`
                : `Choose how you'd like to participate in "${selectedSession?.title}"`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Show permission status if required */}
            {selectedSession?.requires_permission && (
              <div className="mb-4">
                <Badge variant="outline" className="mb-3">
                  <Shield className="w-3 h-3 mr-1" />
                  Permission Required
                </Badge>
                <JoinRequestStatus
                  request={myRequest}
                  sessionTitle={selectedSession.title}
                  onSubmitRequest={handleSubmitJoinRequest}
                  isSubmitting={isSubmittingRequest}
                />
              </div>
            )}

            {/* Only show join options if user can join directly */}
            {canJoinDirectly && (
              <>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant={audioEnabled ? "gold" : "outline"}
                    size="lg"
                    className="flex-1"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                  >
                    {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    {audioEnabled ? "Mic On" : "Mic Off"}
                  </Button>
                  <Button
                    variant={videoEnabled ? "gold" : "outline"}
                    size="lg"
                    className="flex-1"
                    onClick={() => setVideoEnabled(!videoEnabled)}
                  >
                    {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    {videoEnabled ? "Video On" : "Video Off"}
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>You can change these settings during the session</p>
                </div>

                <div className="space-y-2">
                  <Button variant="gold" className="w-full" size="lg" onClick={handleConfirmJoin}>
                    <Heart className="w-5 h-5" />
                    Join Now
                  </Button>
                </div>
              </>
            )}

            <Button variant="outline" className="w-full" onClick={() => setShowJoinDialog(false)}>
              {canJoinDirectly ? "Cancel" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prayer Request Form */}
      <PrayerRequestForm
        open={showPrayerRequestForm}
        onOpenChange={setShowPrayerRequestForm}
      />
    </Layout>
  );
};

export default Prayer;
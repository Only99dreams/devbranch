import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Heart, Play, Square, Users, Plus, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, Enums } from "@/integrations/supabase/types";

type PrayerSession = Tables<"prayer_sessions">;
type SessionStatus = Enums<"prayer_session_status">;

export function PrayerSessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PrayerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    max_participants: 100,
  });

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel("prayer_sessions_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_sessions" }, fetchSessions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("prayer_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch sessions", variant: "destructive" });
    } else {
      setSessions(data || []);
      // Fetch participant counts
      if (data) {
        const counts: Record<string, number> = {};
        for (const session of data) {
          const { count } = await supabase
            .from("prayer_participants")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id)
            .is("left_at", null);
          counts[session.id] = count || 0;
        }
        setParticipantCounts(counts);
      }
    }
    setLoading(false);
  };

  const createSession = async () => {
    if (!newSession.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("prayer_sessions").insert({
      title: newSession.title,
      description: newSession.description,
      scheduled_at: newSession.scheduled_at || null,
      max_participants: newSession.max_participants,
      created_by: user?.id,
      status: "scheduled" as SessionStatus,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Prayer session created" });
      setShowCreateDialog(false);
      setNewSession({ title: "", description: "", scheduled_at: "", max_participants: 100 });
    }
  };

  const startSession = async (session: PrayerSession) => {
    const { error } = await supabase
      .from("prayer_sessions")
      .update({
        status: "active" as SessionStatus,
        started_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (error) {
      toast({ title: "Error", description: "Failed to start session", variant: "destructive" });
    } else {
      toast({ title: "Started", description: "Prayer session is now active" });
    }
  };

  const endSession = async (session: PrayerSession) => {
    const { error } = await supabase
      .from("prayer_sessions")
      .update({
        status: "ended" as SessionStatus,
        ended_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (error) {
      toast({ title: "Error", description: "Failed to end session", variant: "destructive" });
    } else {
      toast({ title: "Ended", description: "Prayer session has ended" });
    }
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <span className="w-2 h-2 rounded-full bg-destructive mr-1.5 animate-pulse" />
            Active
          </Badge>
        );
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "ended":
        return <Badge variant="outline">Ended</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prayer Session Management</CardTitle>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Prayer Sessions</h3>
            <p className="text-muted-foreground mb-4">Create your first prayer session</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{session.title}</p>
                      {session.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{session.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.scheduled_at
                      ? format(new Date(session.scheduled_at), "MMM d, h:mm a")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{participantCounts[session.id] || 0}</span>
                      <span className="text-muted-foreground">/ {session.max_participants}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {session.status === "scheduled" && (
                        <Button size="sm" onClick={() => startSession(session)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {session.status === "active" && (
                        <Button size="sm" variant="destructive" onClick={() => endSession(session)}>
                          <Square className="w-4 h-4 mr-1" />
                          End
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

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Prayer Session</DialogTitle>
            <DialogDescription>Schedule a new prayer gathering</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Morning Devotion"
                value={newSession.title}
                onChange={(e) => setNewSession((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Join us for a time of prayer..."
                value={newSession.description}
                onChange={(e) => setNewSession((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Scheduled Time</label>
                <Input
                  type="datetime-local"
                  value={newSession.scheduled_at}
                  onChange={(e) => setNewSession((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Participants</label>
                <Input
                  type="number"
                  value={newSession.max_participants}
                  onChange={(e) => setNewSession((prev) => ({ ...prev, max_participants: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createSession} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Create Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

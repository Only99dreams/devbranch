import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Tables, Enums } from "@/integrations/supabase/types";

type JoinRequest = Tables<"prayer_join_requests">;
type JoinRequestStatus = Enums<"join_request_status">;

interface JoinRequestWithProfile extends JoinRequest {
  profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

export function useJoinRequests(sessionId?: string) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequestWithProfile[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    fetchRequests();
    subscribeToRequests();
  }, [sessionId, user]);

  const fetchRequests = async () => {
    if (!sessionId) return;

    try {
      // Fetch all pending requests for this session (for session creators)
      const { data: requestsData, error } = await supabase
        .from("prayer_join_requests")
        .select("*")
        .eq("session_id", sessionId)
        .order("requested_at", { ascending: true });

      if (error) {
        console.error("Join requests feature not available:", error.message);
        setLoading(false);
        return;
      }

      if (requestsData && requestsData.length > 0) {
        // Fetch profiles for the requests
        const userIds = requestsData.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, email")
          .in("user_id", userIds);

        const requestsWithProfiles = requestsData.map((r) => ({
          ...r,
          profile: profiles?.find((p) => p.user_id === r.user_id),
        }));

        setRequests(requestsWithProfiles);

        // Check if current user has a request
        if (user) {
          const userRequest = requestsData.find((r) => r.user_id === user.id);
          setMyRequest(userRequest || null);
        }
      } else {
        setRequests([]);
        setMyRequest(null);
      }
    } catch (error) {
      console.error("Error fetching join requests:", error);
    }

    setLoading(false);
  };

  const subscribeToRequests = () => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`join_requests_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prayer_join_requests",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const submitRequest = async () => {
    if (!sessionId || !user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return false;
    }

    const { data, error } = await supabase
      .from("prayer_join_requests")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        status: "pending" as JoinRequestStatus,
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate key constraint violation
      if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("unique")) {
        toast({ title: "Already Requested", description: "You've already submitted a request for this session" });
        // Refetch to get the existing request
        await fetchRequests();
      } else {
        console.error("Error submitting join request:", error);
        toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
      }
      return false;
    }

    setMyRequest(data);
    toast({ title: "Request Submitted", description: "Your request to join has been sent to the session creator" });
    return true;
  };

  const approveRequest = async (requestId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("prayer_join_requests")
      .update({
        status: "approved" as JoinRequestStatus,
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: "Failed to approve request", variant: "destructive" });
      return false;
    }

    toast({ title: "Approved", description: "Join request approved" });
    return true;
  };

  const denyRequest = async (requestId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("prayer_join_requests")
      .update({
        status: "denied" as JoinRequestStatus,
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: "Failed to deny request", variant: "destructive" });
      return false;
    }

    toast({ title: "Denied", description: "Join request denied" });
    return true;
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const deniedRequests = requests.filter((r) => r.status === "denied");

  return {
    requests,
    myRequest,
    pendingRequests,
    approvedRequests,
    deniedRequests,
    loading,
    submitRequest,
    approveRequest,
    denyRequest,
    refetch: fetchRequests,
  };
}

// Hook for admin to see all pending requests across sessions
export function useAllPendingJoinRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<(JoinRequestWithProfile & { session?: Tables<"prayer_sessions"> })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchAllRequests();
    subscribeToAllRequests();
  }, [user]);

  const fetchAllRequests = async () => {
    if (!user) return;

    try {
      // Get sessions created by this user
      const { data: sessions } = await supabase
        .from("prayer_sessions")
        .select("*")
        .eq("created_by", user.id);

      if (!sessions || sessions.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map((s) => s.id);

      // Get pending requests for those sessions
      const { data: requestsData, error } = await supabase
        .from("prayer_join_requests")
        .select("*")
        .in("session_id", sessionIds)
        .eq("status", "pending")
        .order("requested_at", { ascending: true });

      if (error) {
        console.error("Error fetching join requests:", error);
        setLoading(false);
        return;
      }

      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, email")
          .in("user_id", userIds);

        const requestsWithDetails = requestsData.map((r) => ({
          ...r,
          profile: profiles?.find((p) => p.user_id === r.user_id),
          session: sessions.find((s) => s.id === r.session_id),
        }));

        setRequests(requestsWithDetails);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error:", error);
    }

    setLoading(false);
  };

  const subscribeToAllRequests = () => {
    const channel = supabase
      .channel("all_join_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_join_requests" },
        () => fetchAllRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    requests,
    loading,
    refetch: fetchAllRequests,
  };
}
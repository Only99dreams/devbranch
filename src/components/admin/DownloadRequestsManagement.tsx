import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Download, FileText, Video, Music } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";

type DownloadRequestStatus = Enums<"download_request_status">;

interface DownloadRequestWithDetails {
  id: string;
  created_at: string;
  status: DownloadRequestStatus;
  request_reason: string | null;
  user_id: string;
  media_id: string;
  user_profile?: { full_name: string; email: string };
  media?: { title: string; media_type: string };
}

export function DownloadRequestsManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DownloadRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("download_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch requests", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch related data
    const requestsWithDetails = await Promise.all(
      (data || []).map(async (request) => {
        const [profileRes, mediaRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("user_id", request.user_id).single(),
          supabase.from("media_content").select("title, media_type").eq("id", request.media_id).single(),
        ]);

        return {
          ...request,
          user_profile: profileRes.data || undefined,
          media: mediaRes.data || undefined,
        };
      })
    );

    setRequests(requestsWithDetails);
    setLoading(false);
  };

  const updateRequestStatus = async (id: string, status: DownloadRequestStatus) => {
    const { error } = await supabase
      .from("download_requests")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
    } else {
      toast({
        title: status === "approved" ? "Approved" : "Denied",
        description: `Download request ${status}`,
      });
      fetchRequests();
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: DownloadRequestStatus) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-accent/10 text-accent">Approved</Badge>;
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Download Requests</h3>
            <p className="text-muted-foreground">Requests will appear here when users request media downloads</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Media</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.media && getMediaIcon(request.media.media_type)}
                      <span className="font-medium">{request.media?.title || "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.user_profile?.full_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{request.user_profile?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.request_reason || "No reason provided"}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateRequestStatus(request.id, "approved")}
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRequestStatus(request.id, "denied")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

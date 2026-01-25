import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Clock, UserPlus, Inbox } from "lucide-react";
import { useAllPendingJoinRequests, useJoinRequests } from "@/hooks/useJoinRequests";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";

type JoinRequestStatus = Enums<"join_request_status">;

export function JoinRequestsManagement() {
  const { user } = useAuth();
  const { requests, loading, refetch } = useAllPendingJoinRequests();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setProcessing(requestId);

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
    } else {
      toast({ title: "Approved", description: "User can now join the session" });
      refetch();
    }
    setProcessing(null);
  };

  const handleDeny = async (requestId: string) => {
    if (!user) return;
    setProcessing(requestId);

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
    } else {
      toast({ title: "Denied", description: "Request has been denied" });
      refetch();
    }
    setProcessing(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading requests...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Join Requests
          {requests.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {requests.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground text-sm">
              When users request to join your permission-required sessions, they'll appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={request.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-accent/20 text-accent">
                            {request.profile?.full_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {request.profile?.full_name || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.profile?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{request.session?.title || "Unknown Session"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.requested_at), "MMM d, h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeny(request.id)}
                          disabled={processing === request.id}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-accent text-accent-foreground hover:bg-accent/90"
                          onClick={() => handleApprove(request.id)}
                          disabled={processing === request.id}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
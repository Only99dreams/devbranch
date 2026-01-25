import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Send } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type JoinRequest = Tables<"prayer_join_requests">;

interface JoinRequestStatusProps {
  request: JoinRequest | null;
  sessionTitle?: string;
  onSubmitRequest: () => Promise<boolean> | Promise<void>;
  isSubmitting?: boolean;
}

export function JoinRequestStatus({
  request,
  sessionTitle,
  onSubmitRequest,
  isSubmitting = false,
}: JoinRequestStatusProps) {
  if (!request) {
    // No request yet - show option to submit
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-6 h-6 text-accent" />
          </div>
          <h3 className="font-serif font-semibold text-lg mb-2">Permission Required</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            This session requires permission to join. Submit a request and the session creator will review it.
          </p>
          <Button
            onClick={onSubmitRequest}
            disabled={isSubmitting}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? "Submitting..." : "Request to Join"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show request status
  return (
    <Card
      className={
        request.status === "approved"
          ? "border-accent/30 bg-accent/5"
          : request.status === "denied"
          ? "border-destructive/30 bg-destructive/5"
          : "border-muted bg-muted/30"
      }
    >
      <CardContent className="py-6 text-center">
        {request.status === "pending" && (
          <>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-muted-foreground animate-pulse" />
            </div>
            <Badge variant="secondary" className="mb-3">
              Pending Review
            </Badge>
            <h3 className="font-serif font-semibold text-lg mb-2">Request Submitted</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your request to join "{sessionTitle}" is being reviewed. You'll be notified when it's approved.
            </p>
          </>
        )}

        {request.status === "approved" && (
          <>
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
            <Badge variant="secondary" className="mb-3 bg-accent/20 text-accent">
              Approved
            </Badge>
            <h3 className="font-serif font-semibold text-lg mb-2">You're Approved!</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your request has been approved. You can now join the session.
            </p>
          </>
        )}

        {request.status === "denied" && (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <Badge variant="secondary" className="mb-3 bg-destructive/20 text-destructive">
              Denied
            </Badge>
            <h3 className="font-serif font-semibold text-lg mb-2">Request Denied</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Unfortunately, your request to join this session was not approved.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
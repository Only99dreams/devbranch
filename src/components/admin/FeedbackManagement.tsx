import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, MessageSquare, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Feedback = Tables<"feedback">;
type FeedbackType = Enums<"feedback_type">;

export function FeedbackManagement() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch feedback", variant: "destructive" });
    } else {
      setFeedback(data || []);
    }
    setLoading(false);
  };

  const markAsReviewed = async (id: string) => {
    const { error } = await supabase
      .from("feedback")
      .update({
        is_reviewed: true,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Marked as Reviewed" });
      fetchFeedback();
      setSelectedFeedback(null);
    }
  };

  const getTypeBadge = (type: FeedbackType) => {
    switch (type) {
      case "complaint":
        return <Badge variant="destructive">Complaint</Badge>;
      case "feedback":
        return <Badge variant="secondary">Feedback</Badge>;
      case "inquiry":
        return <Badge>Inquiry</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback, Inquiries & Complaints</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Feedback Yet</h3>
            <p className="text-muted-foreground">Feedback from users will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{getTypeBadge(item.feedback_type)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.full_name}</p>
                      <p className="text-sm text-muted-foreground">{item.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(item.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {item.is_reviewed ? (
                      <Badge variant="outline" className="text-accent">
                        <Check className="w-3 h-3 mr-1" />
                        Reviewed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFeedback(item)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* View Feedback Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback && getTypeBadge(selectedFeedback.feedback_type)}
              <span>from {selectedFeedback?.full_name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedFeedback.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedFeedback.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedFeedback.address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedFeedback.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm mb-2">Message</p>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedFeedback.message}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
                  Close
                </Button>
                {!selectedFeedback.is_reviewed && (
                  <Button
                    onClick={() => markAsReviewed(selectedFeedback.id)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

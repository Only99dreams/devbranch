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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Heart, Download, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type PrayerRequest = Tables<"prayer_requests">;
type PrayerStatus = "pending" | "reviewed" | "prayed_for";

export function PrayerRequestsManagement() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null);
  const [filterRegistration, setFilterRegistration] = useState<string | null>(null);
  const [registrationCounts, setRegistrationCounts] = useState({ streamsOfHealing: 0, harvestOfBabies: 0 });

  useEffect(() => {
    fetchRequests();
    fetchRegistrationCounts();
  }, []);

  const fetchRequests = async (filter?: string | null) => {
    const activeFilter = typeof filter === "undefined" ? filterRegistration : filter;
    let query = supabase.from("prayer_requests").select("*").order("created_at", { ascending: false });
    if (activeFilter) {
      query = query.ilike("request_text", `%Registration for ${activeFilter}%` as any);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error", description: "Failed to fetch prayer requests", variant: "destructive" });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const fetchRegistrationCounts = async () => {
    try {
      const [{ count: sCount }, { count: hCount }] = await Promise.all([
        supabase.from("prayer_requests").select("id", { count: "exact", head: true }).ilike("request_text", "%Registration for Healing in His Wings%"),
        supabase.from("prayer_requests").select("id", { count: "exact", head: true }).ilike("request_text", "%Registration for Harvest of Babies%"),
      ]);

      setRegistrationCounts({ streamsOfHealing: sCount || 0, harvestOfBabies: hCount || 0 });
    } catch (error) {
      console.error("Failed to fetch registration counts:", error);
    }
  };

  const updateStatus = async (id: string, status: PrayerStatus) => {
    const { error } = await supabase
      .from("prayer_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Status Updated", description: `Request marked as ${status.replace("_", " ")}` });
      fetchRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest({ ...selectedRequest, status });
      }
    }
  };

  const downloadDocument = async (url: string, fileName: string) => {
    try {
      // Extract the path from the URL - it should be stored as just the path
      const { data, error } = await supabase.storage
        .from("prayer-reports")
        .download(url);

      if (error) throw error;

      // Create a download link
      const blob = new Blob([data], { type: data.type });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName || "doctors-report";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      toast({ title: "Download Started", description: "Document is being downloaded" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "prayed_for":
        return <Badge className="bg-accent text-accent-foreground">Prayed For</Badge>;
      case "reviewed":
        return <Badge variant="secondary">Reviewed</Badge>;
      case "pending":
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent" />
          Prayer Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white">Healing in His Wings: {registrationCounts.streamsOfHealing}</Badge>
            <Button size="sm" variant="ghost" onClick={() => { const target = filterRegistration === "Healing in His Wings" ? null : "Healing in His Wings"; setFilterRegistration(target); fetchRequests(target); }}>View</Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-pink-600 text-white">Harvest of Babies: {registrationCounts.harvestOfBabies}</Badge>
            <Button size="sm" variant="ghost" onClick={() => { const target = filterRegistration === "Harvest of Babies" ? null : "Harvest of Babies"; setFilterRegistration(target); fetchRequests(target); }}>View</Button>
          </div>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={() => { setFilterRegistration(null); fetchRequests(null); }}>Clear Filter</Button>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading prayer requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Prayer Requests Yet</h3>
            <p className="text-muted-foreground">Prayer requests from users will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.full_name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{request.email}</p>
                      {request.phone && (
                        <p className="text-sm text-muted-foreground">{request.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground line-clamp-2">{request.request_text}</p>
                  </TableCell>
                  <TableCell>
                    {request.doctors_report_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(request.doctors_report_url!, `report-${request.id}`)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRequest(request)}
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

      {/* View Prayer Request Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-accent" />
              Prayer Request from {selectedRequest?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedRequest.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Submitted</p>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Prayer Request</p>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedRequest.request_text}</p>
                </div>
              </div>

              {selectedRequest.doctors_report_url && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Attached Document</p>
                  <Button
                    variant="outline"
                    onClick={() => downloadDocument(selectedRequest.doctors_report_url!, `report-${selectedRequest.id}`)}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Doctor's Report
                  </Button>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-sm mb-2">Update Status</p>
                <Select
                  value={selectedRequest.status || "pending"}
                  onValueChange={(value) => updateStatus(selectedRequest.id, value as PrayerStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="prayed_for">Prayed For</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Upload, X, FileText, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle: string;
}

export function SessionRegistrationForm({ open, onOpenChange, sessionTitle }: Props) {
  const [formData, setFormData] = useState({ full_name: "", email: "", phone: "", request_text: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please upload a PDF, image, or document file.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please upload a file smaller than 10MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      toast({ title: "Missing required fields", description: "Please fill in your name and email.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let doctorsReportUrl: string | null = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("prayer-reports").upload(filePath, selectedFile);
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({ title: "Upload failed", description: uploadError.message || "Failed to upload document.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        doctorsReportUrl = filePath;
      }

      // Insert into prayer_requests table as a registration record referencing the session
      const { error: insertError } = await supabase.from("prayer_requests").insert({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        request_text: formData.request_text || `Registration for ${sessionTitle}`,
        doctors_report_url: doctorsReportUrl,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast({ title: "Submission failed", description: insertError.message || "Failed to submit registration.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      toast({ title: "Registered", description: `Thanks — registration for ${sessionTitle} received.` });

      // Close and navigate to prayer page where user can proceed to request to join
      onOpenChange(false);
      navigate("/prayer");
    } catch (error) {
      console.error("Submission error:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Register for {sessionTitle}</DialogTitle>
          <DialogDescription>
            Please provide your details to register interest for <strong>{sessionTitle}</strong>. After registering you can proceed to request to join the session on the prayer page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input id="full_name" placeholder="Your full name" value={formData.full_name} onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" placeholder="Your phone number" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" placeholder="Any additional info..." rows={3} value={formData.request_text} onChange={(e) => setFormData((p) => ({ ...p, request_text: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Attach (optional)</Label>
            {selectedFile ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors" onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={handleFileSelect} />
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload (PDF, Image, or Document)</p>
                <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="gold" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>) : (<><Send className="w-4 h-4" /> Register</>)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

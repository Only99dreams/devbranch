import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Video, Music, FileText, File, Eye, Download, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, Enums } from "@/integrations/supabase/types";

type MediaContent = Tables<"media_content">;
type MediaType = Enums<"media_type">;

const mediaTypeIcons = {
  video: Video,
  audio: Music,
  pdf: FileText,
  text: File,
};

export function MediaManagement() {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMedia, setNewMedia] = useState({
    title: "",
    description: "",
    category: "",
    media_type: "video" as MediaType,
    is_downloadable: false,
    is_published: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from("media_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch media", variant: "destructive" });
    } else {
      setMedia(data || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect media type
      if (file.type.startsWith("video/")) {
        setNewMedia((prev) => ({ ...prev, media_type: "video" }));
      } else if (file.type.startsWith("audio/")) {
        setNewMedia((prev) => ({ ...prev, media_type: "audio" }));
      } else if (file.type === "application/pdf") {
        setNewMedia((prev) => ({ ...prev, media_type: "pdf" }));
      } else {
        setNewMedia((prev) => ({ ...prev, media_type: "text" }));
      }
    }
  };

  const uploadMedia = async () => {
    if (!newMedia.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    setUploading(true);

    let fileUrl = null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, selectedFile);

      if (uploadError) {
        toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("media_content").insert({
      ...newMedia,
      file_url: fileUrl,
      uploaded_by: user?.id,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to save media", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Media uploaded successfully" });
      setShowUploadDialog(false);
      setNewMedia({
        title: "",
        description: "",
        category: "",
        media_type: "video",
        is_downloadable: false,
        is_published: false,
      });
      setSelectedFile(null);
      fetchMedia();
    }
    setUploading(false);
  };

  const togglePublished = async (item: MediaContent) => {
    const { error } = await supabase
      .from("media_content")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      fetchMedia();
    }
  };

  const deleteMedia = async (id: string) => {
    const { error } = await supabase.from("media_content").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Media removed" });
      fetchMedia();
    }
  };

  const getMediaIcon = (type: MediaType) => {
    const Icon = mediaTypeIcons[type] || File;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Media Library</CardTitle>
        <Button onClick={() => setShowUploadDialog(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Upload className="w-4 h-4 mr-2" />
          Upload New
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading media...</div>
        ) : media.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Media Yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first media file</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground">{getMediaIcon(item.media_type)}</div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium line-clamp-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.category || "Uncategorized"}</p>
                    </div>
                    <Badge variant={item.is_published ? "default" : "secondary"}>
                      {item.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {item.view_count || 0}
                    </span>
                    <span>{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={item.is_published ? "outline" : "default"}
                      className="flex-1"
                      onClick={() => togglePublished(item)}
                    >
                      {item.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMedia(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>Add new content to your media library</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="video/*,audio/*,.pdf"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Click to select a file</p>
                </>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Media title"
                value={newMedia.title}
                onChange={(e) => setNewMedia((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Description..."
                value={newMedia.description}
                onChange={(e) => setNewMedia((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Input
                  placeholder="Sermons, Worship, etc."
                  value={newMedia.category}
                  onChange={(e) => setNewMedia((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select
                  value={newMedia.media_type}
                  onValueChange={(value) => setNewMedia((prev) => ({ ...prev, media_type: value as MediaType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newMedia.is_downloadable}
                  onCheckedChange={(checked) => setNewMedia((prev) => ({ ...prev, is_downloadable: checked }))}
                />
                <label className="text-sm">Allow downloads</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newMedia.is_published}
                  onCheckedChange={(checked) => setNewMedia((prev) => ({ ...prev, is_published: checked }))}
                />
                <label className="text-sm">Publish immediately</label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={uploadMedia} disabled={uploading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

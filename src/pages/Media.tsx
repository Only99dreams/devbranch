import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Play, Music, FileText, Search, Download, Lock, Clock, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import type { Tables } from "@/integrations/supabase/types";

type MediaContent = Tables<"media_content">;

const categories = ["All", "Sermons", "Testimonies", "Worship", "Teachings", "Documents"];

const Media = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaContent | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingDownload, setRequestingDownload] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from("media_content")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMediaItems(data || []);
    } catch (error) {
      console.error("Error fetching media:", error);
      toast({
        title: "Error",
        description: "Failed to load media content.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = mediaItems.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleDownloadRequest = (item: MediaContent) => {
    setSelectedItem(item);
    setShowDownloadDialog(true);
  };

  const submitDownloadRequest = async (reason: string) => {
    if (!selectedItem) return;

    setRequestingDownload(true);
    try {
      const { error } = await supabase
        .from("download_requests")
        .insert({
          media_id: selectedItem.id,
          request_reason: reason,
        });

      if (error) throw error;

      toast({
        title: "Download request submitted",
        description: "We'll review your request and get back to you soon.",
      });
      setShowDownloadDialog(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error submitting download request:", error);
      toast({
        title: "Error",
        description: "Failed to submit download request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequestingDownload(false);
    }
  };

  const handleViewMedia = (item: MediaContent) => {
    if (item.file_url) {
      // Increment view count
      supabase
        .from("media_content")
        .update({ view_count: (item.view_count || 0) + 1 })
        .eq("id", item.id);

      // Open the media
      window.open(item.file_url, '_blank');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      case "document":
        return <FileText className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        </div>
        <div className="container relative z-10 text-center">
          <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground mb-4">
            <BookOpen className="w-3 h-3 mr-1" />
            Media Library
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-4">
            Explore Our Content
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto">
            Access sermons, testimonies, worship sessions, and spiritual resources
          </p>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-full px-4 py-2"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Media Grid */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading media content...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No media found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden group hover:shadow-elevated transition-all duration-300">
                  <div className="relative aspect-video bg-muted">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        {getTypeIcon(item.media_type)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div
                        className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
                        onClick={() => handleViewMedia(item)}
                      >
                        {getTypeIcon(item.media_type)}
                      </div>
                    </div>
                    <Badge className="absolute top-2 left-2 capitalize">
                      {getTypeIcon(item.media_type)}
                      <span className="ml-1">{item.media_type}</span>
                    </Badge>
                    {item.duration && (
                      <Badge className="absolute bottom-2 right-2 bg-black/70">
                        <Clock className="w-3 h-3 mr-1" />
                        {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                    )}
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
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewMedia(item)}
                        disabled={!item.file_url}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {item.is_downloadable ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => item.file_url && window.open(item.file_url, '_blank')}
                          disabled={!item.file_url}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadRequest(item)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </section>

      {/* Download Request Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Request Download Access</DialogTitle>
            <DialogDescription>
              Downloads require admin approval. Submit a request to download "{selectedItem?.title}".
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const reason = formData.get('reason') as string;
              submitDownloadRequest(reason);
            }}
            className="py-4 space-y-4"
          >
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Lock className="w-4 h-4" />
                <span>Content Protection</span>
              </div>
              <p className="text-sm">
                All content is protected. Download requests are reviewed by administrators to ensure proper use.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for download (optional)
              </label>
              <textarea
                id="reason"
                name="reason"
                placeholder="Please explain why you need to download this content..."
                className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={requestingDownload}
            >
              {requestingDownload ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowDownloadDialog(false)}
              disabled={requestingDownload}
            >
              Cancel
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Media;

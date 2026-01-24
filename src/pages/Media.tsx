import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Play, Music, FileText, Search, Download, Lock, Clock, Eye } from "lucide-react";

const categories = ["All", "Sermons", "Testimonies", "Worship", "Teachings", "Documents"];

const mediaItems = [
  {
    id: 1,
    title: "The Power of Faith",
    type: "video",
    category: "Sermons",
    duration: "45:00",
    views: 1520,
    date: "Jan 1, 2026",
    thumbnail: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&h=225&fit=crop",
  },
  {
    id: 2,
    title: "Healing Testimony - Sarah's Story",
    type: "video",
    category: "Testimonies",
    duration: "12:30",
    views: 890,
    date: "Dec 28, 2025",
    thumbnail: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400&h=225&fit=crop",
  },
  {
    id: 3,
    title: "Sunday Worship Session",
    type: "audio",
    category: "Worship",
    duration: "1:20:00",
    views: 450,
    date: "Dec 25, 2025",
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
  },
  {
    id: 4,
    title: "Understanding Grace",
    type: "video",
    category: "Teachings",
    duration: "55:00",
    views: 780,
    date: "Dec 22, 2025",
    thumbnail: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=225&fit=crop",
  },
  {
    id: 5,
    title: "Weekly Devotional - January",
    type: "document",
    category: "Documents",
    pages: 12,
    views: 320,
    date: "Jan 1, 2026",
    thumbnail: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=225&fit=crop",
  },
  {
    id: 6,
    title: "Miracle at Midnight",
    type: "audio",
    category: "Testimonies",
    duration: "8:45",
    views: 560,
    date: "Dec 20, 2025",
    thumbnail: "https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=400&h=225&fit=crop",
  },
];

const Media = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filteredItems = mediaItems.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownloadRequest = (item: any) => {
    setSelectedItem(item);
    setShowDownloadDialog(true);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-elevated transition-all duration-300">
                <div className="relative aspect-video">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                      {getTypeIcon(item.type)}
                    </div>
                  </div>
                  <Badge className="absolute top-2 left-2 capitalize">
                    {getTypeIcon(item.type)}
                    <span className="ml-1">{item.type}</span>
                  </Badge>
                  {item.duration && (
                    <Badge className="absolute bottom-2 right-2 bg-black/70">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.duration}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                  <h3 className="font-semibold mb-2 group-hover:text-accent transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{item.date}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="gold" size="sm" className="flex-1">
                      {item.type === "document" ? "View" : "Play"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadRequest(item)}
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Lock className="w-4 h-4" />
                <span>Content Protection</span>
              </div>
              <p className="text-sm">
                All content is protected. Download requests are reviewed by administrators to ensure proper use.
              </p>
            </div>
            <Button variant="gold" className="w-full">
              <Download className="w-4 h-4" />
              Submit Request
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowDownloadDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Media;

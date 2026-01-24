import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Radio,
  Heart,
  Gift,
  Settings,
  LogOut,
  Upload,
  BarChart3,
  MessageSquare,
  Download,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { UserManagement } from "@/components/admin/UserManagement";
import { StreamManagement } from "@/components/admin/StreamManagement";
import { MediaManagement } from "@/components/admin/MediaManagement";
import { Analytics } from "@/components/admin/Analytics";
import { PrayerSessionManagement } from "@/components/admin/PrayerSessionManagement";
import { DownloadRequestsManagement } from "@/components/admin/DownloadRequestsManagement";
import { FeedbackManagement } from "@/components/admin/FeedbackManagement";

interface Stats {
  totalUsers: number;
  liveStreams: number;
  prayerSessions: number;
  peopleInPrayer: number;
  peopleInLive: number;
  donations: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    liveStreams: 0,
    prayerSessions: 0,
    peopleInPrayer: 0,
    peopleInLive: 0,
    donations: 0,
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    const [users, streams, prayers, donations] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("live_streams").select("*", { count: "exact", head: true }).eq("status", "live"),
      supabase.from("prayer_sessions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("donations").select("amount"),
    ]);

    const totalDonations = donations.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    
    // Count active prayer participants
    const { count: prayerPeopleCount } = await supabase
      .from("prayer_participants")
      .select("*", { count: "exact", head: true })
      .is("left_at", null);
    
    // Count live viewers for current live streams
    let livePeopleCount = 0;
    const { data: liveStreamIds } = await supabase
      .from("live_streams")
      .select("id")
      .eq("status", "live");
    if (liveStreamIds && liveStreamIds.length > 0) {
      const ids = liveStreamIds.map(s => s.id);
      const { count: viewersCount } = await supabase
        .from("live_viewers")
        .select("*", { count: "exact", head: true })
        .in("stream_id", ids)
        .is("left_at", null);
      livePeopleCount = viewersCount || 0;
    }

    setStats({
      totalUsers: users.count || 0,
      liveStreams: streams.count || 0,
      prayerSessions: prayers.count || 0,
      peopleInPrayer: prayerPeopleCount || 0,
      peopleInLive: livePeopleCount || 0,
      donations: totalDonations,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const statCards = [
    { title: "Total Users", value: stats.totalUsers.toLocaleString(), change: "+12%", icon: Users },
    { title: "Live Streams", value: stats.liveStreams.toLocaleString(), change: "Active", icon: Radio },
    { title: "People in Live", value: stats.peopleInLive.toLocaleString(), change: "Watching", icon: Radio },
    { title: "Prayer Sessions", value: stats.prayerSessions.toLocaleString(), change: "Active", icon: Heart },
    { title: "People in Prayer", value: stats.peopleInPrayer.toLocaleString(), change: "Joined", icon: Users },
    { title: "Donations", value: `$${stats.donations.toLocaleString()}`, change: "+8%", icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Home of Super Stars" className="w-10 h-10 rounded-full object-cover" />
              <span className="font-serif text-xl font-semibold">Admin Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Exit Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-serif font-bold">{stat.value}</p>
                    <p className="text-xs text-accent">{stat.change}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="streams">
              <Radio className="w-4 h-4 mr-2" />
              Streams
            </TabsTrigger>
            <TabsTrigger value="prayer">
              <Heart className="w-4 h-4 mr-2" />
              Prayer
            </TabsTrigger>
            <TabsTrigger value="media">
              <Upload className="w-4 h-4 mr-2" />
              Media
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Download className="w-4 h-4 mr-2" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Analytics />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="streams">
            <StreamManagement />
          </TabsContent>

          <TabsContent value="prayer">
            <PrayerSessionManagement />
          </TabsContent>

          <TabsContent value="media">
            <MediaManagement />
          </TabsContent>

          <TabsContent value="requests">
            <DownloadRequestsManagement />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Play, Gift, Settings, User, Calendar, Pencil } from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
}

interface Stats {
  prayerSessions: number;
  donations: number;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ prayerSessions: 0, donations: 0 });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone, location, avatar_url")
      .eq("user_id", user?.id)
      .single();
    
    if (data) setProfile(data);
  };

  const fetchStats = async () => {
    const [prayerRes, donationRes] = await Promise.all([
      supabase
        .from("prayer_participants")
        .select("id", { count: "exact" })
        .eq("user_id", user?.id),
      supabase
        .from("donations")
        .select("id", { count: "exact" })
        .eq("user_id", user?.id),
    ]);

    setStats({
      prayerSessions: prayerRes.count || 0,
      donations: donationRes.count || 0,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {profile?.full_name ? getInitials(profile.full_name) : <User />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {profile?.full_name || "Member"}!
              </h1>
              <p className="text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/admin">
                <Settings className="w-4 h-4 mr-2" />
                Admin Dashboard
              </Link>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prayer Sessions</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.prayerSessions}</div>
              <p className="text-xs text-muted-foreground">Sessions joined</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Donations</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.donations}</div>
              <p className="text-xs text-muted-foreground">Contributions made</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/live">
                <CardHeader>
                  <Play className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Watch Live</CardTitle>
                  <CardDescription>Join ongoing live streams</CardDescription>
                </CardHeader>
              </Link>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/prayer">
                <CardHeader>
                  <Heart className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Prayer Room</CardTitle>
                  <CardDescription>Join a prayer session</CardDescription>
                </CardHeader>
              </Link>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/media">
                <CardHeader>
                  <Calendar className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Media Library</CardTitle>
                  <CardDescription>Browse sermons & content</CardDescription>
                </CardHeader>
              </Link>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/donate">
                <CardHeader>
                  <Gift className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Give</CardTitle>
                  <CardDescription>Support our ministry</CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile/edit">
                <Pencil className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{profile?.full_name || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{profile?.phone || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{profile?.location || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Radio, Heart, Gift, TrendingUp, Eye } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalDonations: number;
  totalStreams: number;
  totalPrayerSessions: number;
  totalMediaViews: number;
}

const COLORS = ["hsl(40, 82%, 56%)", "hsl(228, 50%, 35%)", "hsl(0, 72%, 51%)", "hsl(228, 20%, 94%)"];

export function Analytics() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDonations: 0,
    totalStreams: 0,
    totalPrayerSessions: 0,
    totalMediaViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [donationData, setDonationData] = useState<any[]>([]);
  const [mediaTypeData, setMediaTypeData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Fetch total counts
    const [users, donations, streams, prayers, media] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("donations").select("amount"),
      supabase.from("live_streams").select("*", { count: "exact", head: true }),
      supabase.from("prayer_sessions").select("*", { count: "exact", head: true }),
      supabase.from("media_content").select("view_count"),
    ]);

    const totalDonationAmount = donations.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const totalMediaViews = media.data?.reduce((sum, m) => sum + (m.view_count || 0), 0) || 0;

    setStats({
      totalUsers: users.count || 0,
      totalDonations: totalDonationAmount,
      totalStreams: streams.count || 0,
      totalPrayerSessions: prayers.count || 0,
      totalMediaViews,
    });

    // Generate mock growth data (in real app, aggregate from actual data)
    const mockUserGrowth = [
      { month: "Jan", users: 120 },
      { month: "Feb", users: 180 },
      { month: "Mar", users: 250 },
      { month: "Apr", users: 310 },
      { month: "May", users: 420 },
      { month: "Jun", users: 580 },
    ];
    setUserGrowth(mockUserGrowth);

    const mockDonations = [
      { month: "Jan", amount: 2400 },
      { month: "Feb", amount: 1800 },
      { month: "Mar", amount: 3200 },
      { month: "Apr", amount: 2800 },
      { month: "May", amount: 4100 },
      { month: "Jun", amount: 3500 },
    ];
    setDonationData(mockDonations);

    // Fetch media type distribution
    const { data: mediaData } = await supabase.from("media_content").select("media_type");
    if (mediaData) {
      const typeCounts = mediaData.reduce((acc: any, item) => {
        acc[item.media_type] = (acc[item.media_type] || 0) + 1;
        return acc;
      }, {});
      
      setMediaTypeData(
        Object.entries(typeCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );
    }

    setLoading(false);
  };

  const statCards = [
    { title: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-accent" },
    { title: "Total Donations", value: `$${stats.totalDonations.toLocaleString()}`, icon: Gift, color: "text-accent" },
    { title: "Live Streams", value: stats.totalStreams.toLocaleString(), icon: Radio, color: "text-accent" },
    { title: "Prayer Sessions", value: stats.totalPrayerSessions.toLocaleString(), icon: Heart, color: "text-accent" },
    { title: "Media Views", value: stats.totalMediaViews.toLocaleString(), icon: Eye, color: "text-accent" },
  ];

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 20%, 88%)" />
                <XAxis dataKey="month" stroke="hsl(228, 15%, 45%)" fontSize={12} />
                <YAxis stroke="hsl(228, 15%, 45%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(45, 20%, 99%)",
                    border: "1px solid hsl(228, 20%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(40, 82%, 56%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(40, 82%, 56%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              Monthly Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={donationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 20%, 88%)" />
                <XAxis dataKey="month" stroke="hsl(228, 15%, 45%)" fontSize={12} />
                <YAxis stroke="hsl(228, 15%, 45%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(45, 20%, 99%)",
                    border: "1px solid hsl(228, 20%, 88%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`$${value}`, "Amount"]}
                />
                <Bar dataKey="amount" fill="hsl(228, 50%, 35%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Media Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Media Content Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            {mediaTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mediaTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mediaTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(45, 20%, 99%)",
                      border: "1px solid hsl(228, 20%, 88%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground py-8">No media content yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

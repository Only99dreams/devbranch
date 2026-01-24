import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function HeroSection() {
  const [liveStream, setLiveStream] = useState<{ title: string } | null>(null);
  const [stats, setStats] = useState({ users: 0, sessions: 0, countries: 50 });

  useEffect(() => {
    fetchLiveStream();
    fetchStats();

    const channel = supabase
      .channel('live-streams-hero')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, fetchLiveStream)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLiveStream = async () => {
    const { data } = await supabase
      .from('live_streams')
      .select('title')
      .eq('status', 'live')
      .limit(1)
      .single();
    setLiveStream(data);
  };

  const fetchStats = async () => {
    const [usersRes, sessionsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('prayer_sessions').select('id', { count: 'exact', head: true })
    ]);
    setStats({
      users: usersRes.count || 0,
      sessions: sessionsRes.count || 0,
      countries: 50
    });
  };

  return (
    <section className="relative min-h-[85vh] flex items-center gradient-hero overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <div className="container relative z-10 py-20">
        <div className="max-w-3xl mx-auto text-center">
          {liveStream && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-primary-foreground/90 font-medium">Live Now: {liveStream.title}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-primary-foreground mb-6 animate-slide-up">
            Home of
            <span className="block mt-2 bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Super Stars</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
            The official digital platform of <strong className="text-primary-foreground">The Miracle City Church</strong>. Join our vibrant community for live services, powerful prayer sessions, and spiritual growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/live">
              <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg font-semibold">
                <Radio className="w-5 h-5" />
                Watch Live
              </Button>
            </Link>
            <Link to="/prayer">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 font-semibold backdrop-blur-sm">
                <Heart className="w-5 h-5" />
                Join Prayer
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-primary-foreground/10 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div>
              <div className="text-3xl md:text-4xl font-serif font-bold text-accent">{stats.users.toLocaleString()}+</div>
              <div className="text-sm text-primary-foreground/60 mt-1">Active Members</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-serif font-bold text-accent">{stats.sessions.toLocaleString()}+</div>
              <div className="text-sm text-primary-foreground/60 mt-1">Prayer Sessions</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-serif font-bold text-accent">{stats.countries}+</div>
              <div className="text-sm text-primary-foreground/60 mt-1">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-1">
          <div className="w-1.5 h-3 rounded-full bg-primary-foreground/50 animate-pulse" />
        </div>
      </div>
    </section>
  );
}

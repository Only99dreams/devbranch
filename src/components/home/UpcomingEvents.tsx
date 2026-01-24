import { Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: string;
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    const channel = supabase
      .channel('upcoming-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_sessions' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchEvents = async () => {
    const [prayerRes, streamRes] = await Promise.all([
      supabase.from('prayer_sessions').select('id, title, description, scheduled_at, status').eq('status', 'scheduled').order('scheduled_at', { ascending: true }).limit(2),
      supabase.from('live_streams').select('id, title, description, scheduled_at:started_at, status').eq('status', 'scheduled').order('started_at', { ascending: true }).limit(1)
    ]);
    const combined = [...(prayerRes.data || []), ...(streamRes.data || [])].slice(0, 3);
    setEvents(combined);
    setLoading(false);
  };

  return (
    <section className="py-20">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
              Upcoming Events
            </h2>
            <p className="text-muted-foreground">
              Don't miss out on our scheduled gatherings
            </p>
          </div>
          <Button variant="outline">View All Events</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted/50 animate-pulse" />
            ))
          ) : events.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              No upcoming events scheduled yet
            </div>
          ) : (
            events.map((event, index) => (
              <div
                key={event.id}
                className="group relative overflow-hidden rounded-2xl gradient-card border border-border/50 p-6 hover:shadow-elevated transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-bl-full" />

                <div className="relative">
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent capitalize mb-4">
                    {event.status}
                  </span>

                  <h3 className="text-xl font-serif font-semibold text-foreground mb-4 group-hover:text-accent transition-colors">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {event.scheduled_at && (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span>{format(new Date(event.scheduled_at), 'EEEE, MMMM d')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>{format(new Date(event.scheduled_at), 'h:mm a')}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span>Online</span>
                    </div>
                  </div>

                  <Button className="w-full mt-6 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                    Set Reminder
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

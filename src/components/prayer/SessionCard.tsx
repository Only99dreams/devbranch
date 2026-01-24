import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type PrayerSession = Tables<"prayer_sessions">;

interface SessionCardProps {
  session: PrayerSession;
  isLive?: boolean;
  participantCount?: number;
  onJoin: (session: PrayerSession) => void;
}

export function SessionCard({ session, isLive, participantCount = 0, onJoin }: SessionCardProps) {
  return (
    <Card className={`hover:shadow-card transition-all card-hover ${isLive ? "border-destructive/30 bg-destructive/5" : ""}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-3 md:mb-4 gap-2">
          <div className="flex-1 min-w-0">
            {isLive && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30 mb-2">
                <span className="w-2 h-2 rounded-full bg-destructive mr-2 animate-pulse" />
                LIVE
              </Badge>
            )}
            <h3 className="text-lg md:text-xl font-serif font-semibold line-clamp-2">{session.title}</h3>
            {session.description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{session.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0 bg-muted/50 px-2 py-1 rounded-full">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{participantCount}</span>
          </div>
        </div>

        {!isLive && session.scheduled_at && (
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-accent" />
              {format(new Date(session.scheduled_at), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-accent" />
              {format(new Date(session.scheduled_at), "h:mm a")}
            </span>
          </div>
        )}

        <Button
          variant={isLive ? "gold" : "outline"}
          className="w-full h-11 md:h-10 font-medium"
          onClick={() => onJoin(session)}
        >
          <Heart className="w-4 h-4 mr-2" />
          {isLive ? "Join Session" : "Register to Join"}
        </Button>
      </CardContent>
    </Card>
  );
}

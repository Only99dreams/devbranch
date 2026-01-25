import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, Clock, Shield } from "lucide-react";
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
    <Card className={`hover:shadow-card transition-shadow ${isLive ? "border-destructive/30" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isLive && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                  <span className="w-2 h-2 rounded-full bg-destructive mr-2 animate-pulse" />
                  LIVE
                </Badge>
              )}
              {session.requires_permission && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Permission Required
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-serif font-semibold">{session.title}</h3>
            {session.description && (
              <p className="text-muted-foreground text-sm mt-1">{session.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">{participantCount}</span>
          </div>
        </div>

        {!isLive && session.scheduled_at && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
          className="w-full"
          onClick={() => onJoin(session)}
        >
          <Heart className="w-4 h-4 mr-2" />
          {isLive ? "Join Session" : session.requires_permission ? "Request to Join" : "Register to Join"}
        </Button>
      </CardContent>
    </Card>
  );
}
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Testimony {
  id: string;
  full_name: string;
  location: string | null;
  message: string;
}

export function TestimoniesPreview() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonies();
  }, []);

  const fetchTestimonies = async () => {
    const { data } = await supabase
      .from('feedback')
      .select('id, full_name, address, message')
      .eq('feedback_type', 'feedback')
      .eq('is_reviewed', true)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (data) {
      setTestimonies(data.map(d => ({
        id: d.id,
        full_name: d.full_name,
        location: d.address,
        message: d.message
      })));
    }
    setLoading(false);
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-primary-foreground blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Stories of Faith
          </h2>
          <p className="text-primary-foreground/70 max-w-2xl mx-auto">
            Hear from members whose lives have been touched by God through our community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-primary-foreground/5 animate-pulse" />
            ))
          ) : testimonies.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-primary-foreground/70">
              No testimonies available yet
            </div>
          ) : (
            testimonies.map((testimony, index) => (
              <div
                key={testimony.id}
                className="relative bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/10 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Quote className="w-10 h-10 text-accent/50 mb-4" />
                
                <p className="text-primary-foreground/80 leading-relaxed mb-6">
                  "{testimony.message}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center">
                    <span className="font-serif font-bold text-accent-foreground">
                      {getInitial(testimony.full_name)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{testimony.full_name}</div>
                    {testimony.location && (
                      <div className="text-sm text-primary-foreground/60">{testimony.location}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center mt-10">
          <Link to="/media?category=testimonies">
            <Button variant="outline" size="lg" className="border-2 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10">
              Read More Testimonies
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

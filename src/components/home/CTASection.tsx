import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.jpg";

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl gradient-gold p-8 md:p-12 lg:p-16 text-center">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent-foreground/10 backdrop-blur-sm mb-6">
              <img src={logo} alt="Home of Super Stars" className="w-16 h-16 rounded-full object-cover" />
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-accent-foreground mb-4">
              Join Home of Super Stars
            </h2>

            <p className="text-lg text-accent-foreground/80 mb-8 max-w-2xl mx-auto">
              Be part of The Miracle City Church's global family united in faith. Register today to access all features, join prayer sessions, and connect with believers worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?register=true">
                <Button size="lg" className="bg-accent-foreground text-accent hover:bg-accent-foreground/90 w-full sm:w-auto">
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10 w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

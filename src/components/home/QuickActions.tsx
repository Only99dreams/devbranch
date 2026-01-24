import { Link } from "react-router-dom";
import { Radio, Heart, BookOpen, Gift, MessageCircle, Users } from "lucide-react";

const actions = [
  {
    title: "Live Services",
    description: "Watch live broadcasts and past services",
    icon: Radio,
    href: "/live",
    color: "from-red-500 to-orange-500",
  },
  {
    title: "Prayer Sessions",
    description: "Join live prayer or request prayer",
    icon: Heart,
    href: "/prayer",
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Media Library",
    description: "Access sermons, testimonies & more",
    icon: BookOpen,
    href: "/media",
    color: "from-blue-500 to-indigo-500",
  },
  {
    title: "Give Online",
    description: "Support the ministry with donations",
    icon: Gift,
    href: "/donate",
    color: "from-amber-500 to-yellow-500",
  },
  {
    title: "Contact Us",
    description: "Get in touch or send feedback",
    icon: MessageCircle,
    href: "/contact",
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Community",
    description: "Connect with fellow believers",
    icon: Users,
    href: "/community",
    color: "from-purple-500 to-violet-500",
  },
];

export function QuickActions() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            How Can We Serve You?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our platform and find what you're looking for
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action, index) => (
            <Link
              key={action.title}
              to={action.href}
              className="group relative overflow-hidden rounded-2xl bg-card p-6 shadow-card hover:shadow-elevated transition-all duration-500 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color}`} />
              </div>

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                {action.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {action.description}
              </p>

              <div className="mt-4 flex items-center text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Learn more</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

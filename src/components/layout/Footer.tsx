import { Link } from "react-router-dom";
import { Heart, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.jpg";

const footerLinks = {
  quickLinks: [
    { name: "Home", href: "/" },
    { name: "Live Services", href: "/live" },
    { name: "Prayer Sessions", href: "/prayer" },
    { name: "Media Library", href: "/media" },
  ],
  connect: [
    { name: "Contact Us", href: "/contact" },
    { name: "Give Online", href: "/donate" },
    { name: "Testimonies", href: "/media?category=testimonies" },
    { name: "About Us", href: "/about" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Home of Super Stars" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <span className="font-serif text-xl font-semibold block">Home of Super Stars</span>
                <span className="text-xs text-primary-foreground/70">The Miracle City Church</span>
              </div>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-4">
              Join our community of faith at The Miracle City Church. Experience live services, prayer sessions, and spiritual growth together.
            </p>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
              <Heart className="w-4 h-4 text-accent" />
              <span>Made with love for the community</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Connect</h4>
            <ul className="space-y-2">
              {footerLinks.connect.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <span className="text-sm text-primary-foreground/70">
                  By City Complex Asaba, Delta State
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <span className="text-sm text-primary-foreground/70">
                  08037836991, 09073338222
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <span className="text-sm text-primary-foreground/70">
                  contact@homeofsuperstars.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} Home of Super Stars. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-primary-foreground/50 hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-primary-foreground/50 hover:text-accent transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

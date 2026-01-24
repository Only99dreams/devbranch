import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Radio, Heart, BookOpen, MessageCircle, Gift, User, LogOut, LayoutDashboard, Settings, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter } from "@/components/ui/notification";
import logo from "@/assets/logo.jpg";

const navigation = [
  { name: "Home", href: "/", icon: null },
  { name: "Live", href: "/live", icon: Radio },
  { name: "Prayer", href: "/prayer", icon: Heart },
  { name: "Recordings", href: "/recordings", icon: Play },
  { name: "Media", href: "/media", icon: BookOpen },
  { name: "Give", href: "/donate", icon: Gift },
  { name: "Contact", href: "/contact", icon: MessageCircle },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const isActive = (href: string) => location.pathname === href;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Home of Super Stars" className="w-12 h-12 rounded-full object-cover" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => (
            <Button
              key={item.name}
              asChild
              variant={isActive(item.href) ? "default" : "ghost"}
              size="sm"
              className={
                isActive(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              <Link to={item.href} className="inline-flex items-center">
                {item.icon && <item.icon className="w-4 h-4 mr-1" />}
                {item.name}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user && <NotificationCenter />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={undefined} alt="User avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                <Link to="/auth?register=true">Join Us</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Right Actions */}
        <div className="flex items-center gap-2 md:hidden">
          {user && <NotificationCenter />}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-highlight-transparent">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[350px] safe-top">
              <div className="flex flex-col gap-6 pt-6 h-full">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Home of Super Stars" className="w-12 h-12 rounded-full object-cover" />
                  <span className="font-serif font-semibold">Home of Super Stars</span>
                </div>

                <nav className="flex flex-col gap-1 flex-1 overflow-y-auto scroll-smooth-ios">
                  {navigation.map((item) => (
                    <Button
                      key={item.name}
                      asChild
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`w-full justify-start h-12 ${
                        isActive(item.href) ? "bg-accent text-accent-foreground" : ""
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to={item.href} className="inline-flex items-center">
                        {item.icon && <item.icon className="w-5 h-5 mr-3" />}
                        {item.name}
                      </Link>
                    </Button>
                  ))}
                </nav>

                <div className="flex flex-col gap-2 pt-4 border-t border-border safe-bottom">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-2 py-2 bg-muted/50 rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(user.email || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate flex-1">{user.email}</span>
                      </div>
                      <Button asChild variant="outline" className="w-full h-12" onClick={() => setIsOpen(false)}>
                        <Link to="/dashboard">
                          <LayoutDashboard className="w-5 h-5 mr-3" />
                          Dashboard
                        </Link>
                      </Button>
                      {isAdmin && (
                        <Button asChild variant="outline" className="w-full h-12" onClick={() => setIsOpen(false)}>
                          <Link to="/admin">
                            <Settings className="w-5 h-5 mr-3" />
                            Admin Panel
                          </Link>
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        className="w-full h-12" 
                        onClick={() => { handleSignOut(); setIsOpen(false); }}
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="w-full h-12" onClick={() => setIsOpen(false)}>
                        <Link to="/auth">Sign In</Link>
                      </Button>
                      <Button
                        asChild
                        className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                        onClick={() => setIsOpen(false)}
                      >
                        <Link to="/auth?register=true">Join Us</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

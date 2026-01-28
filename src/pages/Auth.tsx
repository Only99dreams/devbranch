import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, User, Phone, MapPin, ArrowLeft, Loader2 } from "lucide-react";
import logo from "@/assets/logo.jpg";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get("register") === "true";
  const isAdmin = searchParams.get("admin") === "true";
  const [mode, setMode] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin: userIsAdmin, signUp, signIn, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
  });

  // Note: do not auto-redirect away from /auth. Users may open this page to switch accounts.

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Generate a deterministic password from email
  const generatePassword = (email: string) => {
    return `HSS_${email.toLowerCase().replace(/[^a-z0-9]/g, '')}#2024!`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const password = generatePassword(formData.email);

      try {
        if (mode === "register") {
          const { error } = await signUp(formData.email, password, {
            full_name: formData.fullName,
            phone: formData.phone,
            location: formData.location,
          });
          if (error) throw error;

          toast({
            title: "Account created!",
            description: "You are now logged in.",
          });
          navigate("/dashboard", { replace: true });
        } else {
          const { error } = await signIn(formData.email, password);
          if (error) throw error;

          toast({
            title: "Welcome back!",
            description: "You are now logged in.",
          });
          navigate("/dashboard", { replace: true });
        }
      } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <Card className="shadow-elevated">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden shadow-lg">
              <img src={logo} alt="Home of Super Stars" className="w-full h-full object-cover" />
            </div>
            <CardTitle className="font-serif text-2xl">
              {isAdmin ? "Admin Login" : mode === "login" ? "Welcome Back" : "Join Home of Super Stars"}
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Enter your admin email to continue"
                : mode === "login"
                  ? "Enter your email to sign in"
                  : "Create your account with just your email"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user && !authLoading && (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p>
                  You're already signed in as <span className="font-medium">{user.email}</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await signOut();
                    }}
                    disabled={loading}
                  >
                    Sign out
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(userIsAdmin ? "/admin" : "/dashboard", { replace: true })}
                    disabled={loading}
                  >
                    Go to {userIsAdmin ? "Admin Dashboard" : "Dashboard"}
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && !isAdmin && (
                <>
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        placeholder="John Doe"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="+1 (555) 000-0000"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        required
                        placeholder="City, Country"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="john@example.com"
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button 
                type="submit"
                size="lg" 
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  mode === "login" ? "Sign In" : "Create Account"
                )}
              </Button>
            </form>

            {!isAdmin && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                    className="text-accent hover:underline font-medium"
                    disabled={loading}
                  >
                    {mode === "login" ? "Register now" : "Sign in"}
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/60 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;

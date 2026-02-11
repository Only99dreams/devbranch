import { useSearchParams } from "react-router-dom";
import { AuthPanel } from "@/components/auth/AuthPanel";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get("register") === "true";
  const isAdmin = searchParams.get("admin") === "true";
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>
      <AuthPanel defaultMode={isRegister ? "register" : "login"} isAdmin={isAdmin} />
    </div>
  );
};

export default Auth;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback from Supabase
    const handleCallback = async () => {
      try {
        // Supabase will handle the token exchange and set the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Callback error:", error);
          toast({ 
            title: "Authentication failed", 
            description: error.message 
          });
          navigate("/login", { replace: true });
          return;
        }

        if (data.session) {
          // Successfully authenticated
          toast({ 
            title: "Successfully signed in with Google", 
            description: "Welcome back!" 
          });
          navigate("/pathway", { replace: true });
        } else {
          // No session, redirect to login
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Callback exception:", err);
        toast({ 
          title: "Authentication failed", 
          description: "An unexpected error occurred" 
        });
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full border-2 border-primary mb-4">
          <div className="h-8 w-8 rounded-full bg-primary"></div>
        </div>
        <p className="text-muted-foreground">Processing your sign in...</p>
      </div>
    </div>
  );
};

export default Callback;

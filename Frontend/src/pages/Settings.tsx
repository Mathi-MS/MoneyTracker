import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Wallet } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <AppLayout>
      <div className="p-4 space-y-6 pb-12">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>

        {/* Profile Card */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
          <Avatar className="w-24 h-24 ring-4 ring-primary/20">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback className="text-3xl bg-secondary">{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2 mb-3">Preferences</h3>
          
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-4 hover:bg-secondary/50 cursor-pointer transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Currency</div>
                <div className="text-xs text-muted-foreground">INR (₹)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button 
            variant="destructive" 
            className="w-full h-14 rounded-xl font-bold text-base bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors border-none"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
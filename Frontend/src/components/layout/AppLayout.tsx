import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, List, PieChart, Plus, MoreHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import logo from "../../assests/money.png";
export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation().pathname;
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
            <img src={logo} alt="Money Tracker" className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">TRACK X</span>
          <span className="font-bold text-xs text-gray-400">({import.meta.env.VITE_VERSION})</span>
        </Link>
        {user && (
          <Link to="/settings">
            <Avatar className="w-8 h-8 ring-2 ring-border cursor-pointer hover:ring-primary transition-all">
              <AvatarImage src={user.profileImageUrl || ""} alt={user.firstName || "User"} />
              <AvatarFallback>{user.firstName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between relative">
          
          <Link to="/" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link to="/transactions" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location === '/transactions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Activity</span>
          </Link>

          {/* Floating Action Button */}
          <div className="relative -top-6">
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30">
                  <Plus className="w-7 h-7" />
                </button>
              </DialogTrigger>
              <DialogContent className="w-11/12 max-w-sm rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-center">New Transaction</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <button onClick={() => navigate('/transactions/new?type=earn')} className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-xl border border-transparent hover:border-primary/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Earn</span>
                  </button>
                  <button onClick={() => navigate('/transactions/new?type=spend')} className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-xl border border-transparent hover:border-destructive/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-3">
                      <div className="w-4 h-0.5 bg-current rounded-full" />
                    </div>
                    <span className="font-semibold">Spend</span>
                  </button>
                  <button onClick={() => navigate('/transactions/new?type=lend')} className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-xl border border-transparent hover:border-blue-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Lend</span>
                  </button>
                  <button onClick={() => navigate('/transactions/new?type=borrow')} className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-xl border border-transparent hover:border-amber-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-3">
                      <div className="w-4 h-0.5 bg-current rounded-full" />
                    </div>
                    <span className="font-semibold">Borrow</span>
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Link to="/reports" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location === '/reports' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <PieChart className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Reports</span>
          </Link>

          <Drawer>
            <DrawerTrigger asChild>
              <button className="flex flex-col items-center justify-center w-16 h-full transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                <MoreHorizontal className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>More Options</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col p-4 gap-2">
                <Link to="/categories">
                  <DrawerClose className="w-full text-left p-4 rounded-xl hover:bg-secondary/80 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center"><PieChart className="w-4 h-4" /></div>
                    Categories
                  </DrawerClose>
                </Link>
                <Link to="/persons">
                  <DrawerClose className="w-full text-left p-4 rounded-xl hover:bg-secondary/80 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center"><span className="text-xs">👥</span></div>
                    Persons
                  </DrawerClose>
                </Link>
                <Link to="/settings">
                  <DrawerClose className="w-full text-left p-4 rounded-xl hover:bg-secondary/80 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center"><span className="text-xs">⚙️</span></div>
                    Settings
                  </DrawerClose>
                </Link>
              </div>
            </DrawerContent>
          </Drawer>

        </div>
      </nav>
    </div>
  );
}

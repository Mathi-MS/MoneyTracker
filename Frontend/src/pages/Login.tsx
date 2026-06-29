import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { WalletCards } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await login(username, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-8"
      >
        <WalletCards className="w-8 h-8" />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="text-center space-y-3 mb-12"
      >
        <h1 className="text-4xl font-bold tracking-tight">Money Tracker</h1>
        <p className="text-muted-foreground text-lg">Your financial best friend.</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-sm space-y-4"
      >
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-14 rounded-xl text-base"
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 rounded-xl text-base"
          required
        />
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="w-full h-14 text-lg font-semibold rounded-xl"
        >
          {loading ? "Signing in..." : "Log In"}
        </Button>
      </motion.form>
      <span className="absolute bottom-3 right-3 text-xs text-gray-400">
      v{import.meta.env.VITE_VERSION}
    </span>
    </div>
  );
}

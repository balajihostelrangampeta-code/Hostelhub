import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(username, password, rememberMe);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Balaji Boys Hostel</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your hostel</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(Boolean(v))}
                  disabled={loading}
                  data-testid="checkbox-remember-me"
                />
                <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer select-none">
                  Keep me signed in for 30 days
                </Label>
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium" data-testid="login-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !username || !password}
                data-testid="button-login"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {rememberMe ? "Session lasts 30 days" : "Session lasts 30 minutes"}
        </p>
      </div>
    </div>
  );
}

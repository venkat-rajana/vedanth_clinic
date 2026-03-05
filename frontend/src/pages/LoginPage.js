import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Stethoscope, Mail, Lock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const { login, emailLogin } = useAuth();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await emailLogin(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-20 h-20 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-6 hover:bg-teal-800 transition-colors cursor-pointer">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Vedanth Clinic</h1>
          <p className="text-slate-500">Appointment Management System</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-6">
            {!showEmailLogin ? (
              <>
                {/* Google Sign In */}
                <Button
                  onClick={login}
                  size="lg"
                  className="w-full bg-teal-700 hover:bg-teal-800 h-12 text-base"
                  data-testid="google-signin-btn"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign In with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={() => setShowEmailLogin(true)}
                  data-testid="email-signin-btn"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Sign In with Email
                </Button>
              </>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-2 -ml-2"
                  onClick={() => {
                    setShowEmailLogin(false);
                    setError('');
                  }}
                >
                  ← Back to options
                </Button>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="password-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-teal-700 hover:bg-teal-800 h-12 text-base"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            )}

            <p className="text-center text-xs text-slate-500">
              Staff & Doctors: Use credentials provided by your administrator
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

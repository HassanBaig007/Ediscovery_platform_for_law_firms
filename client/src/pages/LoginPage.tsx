import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Lock, Mail, Scale, ShieldCheck, Search, FileText, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            // Show the actual backend error message when available.
            // Without this, network errors, CORS blocks, and wrong credentials
            // all displayed the same misleading "Invalid email or password" text.
            const backendMessage =
                err?.response?.data?.message ||
                err?.message ||
                'Unable to sign in. Please check your credentials and try again.';
            setError(backendMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        { icon: ShieldCheck, label: 'Secure & Compliant', desc: 'Enterprise-grade security with full audit trails' },
        { icon: Search, label: 'Intelligent Search', desc: 'Advanced full-text search across all documents' },
        { icon: FileText, label: 'Document Review', desc: 'Streamlined review workflows with coding panels' },
    ];

    return (
        <div className="min-h-screen flex w-full bg-background">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-slate-900 via-slate-900 to-primary/30 relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                {/* Gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-primary/90 flex items-center justify-center backdrop-blur">
                            <Scale className="w-4.5 h-4.5 text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">eDiscovery</span>
                    </div>
                </div>

                <div className="relative z-10 space-y-8 max-w-lg">
                    <div className="space-y-3">
                        <h2 className="text-3xl xl:text-4xl font-bold leading-[1.15] tracking-tight">
                            Secure, Intelligent<br />Legal Discovery.
                        </h2>
                        <p className="text-white/50 text-base leading-relaxed max-w-md">
                            Streamline legal workflows with advanced analytics, document review, and case management designed for modern legal teams.
                        </p>
                    </div>
                    <div className="space-y-4">
                        {features.map((f) => (
                            <div key={f.label} className="flex items-start gap-3 group">
                                <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:bg-white/[0.1] transition-colors">
                                    <f.icon className="w-4 h-4 text-primary/80" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white/90">{f.label}</p>
                                    <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-white/30">
                    &copy; {new Date().getFullYear()} eDiscovery Platform. All rights reserved.
                </div>
            </div>

            {/* Mobile branding strip */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Scale className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm text-foreground">eDiscovery</span>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
                <Card className="w-full max-w-[400px] border-0 shadow-none bg-transparent">
                    <CardHeader className="space-y-1.5 px-0 pb-6">
                        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="text-[15px]">
                            Enter your credentials to continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                    <Input
                                        id="login-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-11"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                    <Input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-11"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
                                    <span className="text-sm text-destructive font-medium">{error}</span>
                                </div>
                            )}

                            <Button type="submit" className="w-full h-11 text-[15px] font-semibold" loading={isLoading}>
                                {isLoading ? 'Signing in...' : 'Sign in'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LoginPage;

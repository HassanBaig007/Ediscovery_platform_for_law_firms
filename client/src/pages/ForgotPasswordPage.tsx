import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, ArrowLeft, CheckCircle, Loader2, 
  Lock, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import api from '../services/api';
import { cn } from '../lib/utils';

type Step = 'email' | 'reset' | 'success';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [currentStep, setCurrentStep] = useState<Step>(resetToken ? 'reset' : 'email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendVerificationCode();
  };

  const sendVerificationCode = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      await api.post('/auth/forgot-password', { email });
      setCurrentStep('success');
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!resetToken) {
      setError('Reset token is missing or invalid. Request a new reset email.');
      return;
    }

    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await api.post('/auth/reset-password', {
        token: resetToken,
        password: newPassword
      });
      setCurrentStep('success');
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 'email', label: 'Email', number: 1 },
    { id: 'reset', label: 'Reset', number: 2 },
  ];

  const getStepNumberDisplay = (step: typeof steps[0], index: number) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const isCompleted = currentIndex > index;
    
    if (isCompleted) {
      return <CheckCircle className="h-5 w-5" />;
    }
    return step.number;
  };


  const getStepClasses = (step: typeof steps[0], index: number) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const isCompleted = currentIndex > index;
    
    if (currentStep === step.id) {
      return "bg-primary text-white";
    }
    if (isCompleted) {
      return "bg-success text-white";
    }
    return "bg-muted text-muted-foreground";
  };


  const getConnectorClasses = (index: number) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const isCompleted = currentIndex > index;
    
    return isCompleted ? "bg-success" : "bg-muted";
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email': return 'Forgot Password?';
      case 'reset': return 'Create New Password';
      case 'success': return 'Password Reset Complete';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'email': return "Enter your email and we'll send you a reset link";
      case 'reset': return 'Enter your new password below';
      case 'success': return 'Your password has been successfully reset';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-xl">e</span>
            </div>
            <span className="text-2xl font-bold text-foreground">eDiscovery</span>
          </div>
          <p className="text-muted-foreground">Secure password recovery</p>
        </div>

        {/* Progress Steps */}
        {currentStep !== 'success' && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                  getStepClasses(step, index)
                )}>
                  {getStepNumberDisplay(step, index)}
                </div>
                <span className={cn(
                  "text-sm font-medium hidden sm:block",
                  currentStep === step.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 hidden sm:block",
                    getConnectorClasses(index)
                  )} />
                )}
              </div>
            ))}
          </div>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {getStepTitle()}
            </CardTitle>
            <CardDescription className="text-center">
              {getStepDescription()}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {currentStep === 'email' && (
              <motion.form
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendCode}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="mr-2 h-4 w-4" /> Send Reset Link</>
                  )}
                </Button>
              </motion.form>
            )}

            {currentStep === 'reset' && (
              <motion.form
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-muted-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-muted-foreground"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" /> Reset Password</>
                  )}
                </Button>
              </motion.form>
            )}

            {currentStep === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 bg-success/12 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
                <p className="text-muted-foreground">
                  {resetToken
                    ? 'Your password has been successfully reset. You can now log in with your new password.'
                    : 'If the account exists, a password reset link has been sent to your email.'}
                </p>
                <Button 
                  onClick={() => navigate(resetToken ? '/login' : '/forgot-password')}
                  className="w-full"
                >
                  {resetToken ? 'Go to Login' : 'Request Another Reset'}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Back to Login */}
        {currentStep !== 'success' && (
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, Home, ArrowLeft, FileQuestion, 
  HelpCircle, Mail, FolderOpen
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { useState } from 'react';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cases?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const quickLinks = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', color: 'bg-primary/12 text-primary' },
    { icon: FolderOpen, label: 'My Cases', path: '/cases', color: 'bg-success/12 text-success' },
    { icon: Search, label: 'Search Documents', path: '/cases', color: 'bg-purple/12 text-purple' },
    { icon: HelpCircle, label: 'Help Center', path: '#', color: 'bg-warning/12 text-warning' },
  ];

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="border-none shadow-2xl overflow-hidden">
          {/* Header Illustration */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-12 text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full" />
              <div className="absolute bottom-10 right-10 w-48 h-48 border-4 border-white rounded-full" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white rounded-full" />
            </div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative z-10"
            >
              <div className="w-32 h-32 bg-card/10 backdrop-blur-sm rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/20">
                <FileQuestion className="h-16 w-16 text-white" />
              </div>
              <h1 className="text-7xl font-black text-white mb-2">404</h1>
              <p className="text-xl text-primary-foreground/70">Page Not Found</p>
            </motion.div>
          </div>

          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Oops! We couldn't find that page
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The page you're looking for might have been moved, deleted, or never existed. 
                Let's get you back on track.
              </p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search for cases, documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg rounded-xl border-border focus:border-blue-500 focus:ring-primary"
                />
                <Button 
                  type="submit"
                  className="absolute right-2 top-2 bottom-2"
                  disabled={!searchQuery.trim()}
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {quickLinks.map((link, index) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", link.color)}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{link.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button 
                size="lg"
                onClick={() => navigate('/cases')}
                className="w-full sm:w-auto"
              >
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>

            {/* Support */}
            <div className="mt-8 pt-8 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Need help? Contact our support team
              </p>
              <a 
                href="mailto:support@ediscovery.com" 
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
              >
                <Mail className="h-4 w-4" />
                support@ediscovery.com
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          &copy; {new Date().getFullYear()} eDiscovery Platform. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

// Helper function for className concatenation
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default NotFoundPage;

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { ToastContainer } from '../ui/ToastContainer';
import { SkipLink } from '../ui/SkipLink';

const MainLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SkipLink />
      
      {/* Desktop sidebar (hidden on mobile via internal lg:flex) */}
      <Sidebar />
      
      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <Sidebar mobileOpen onClose={() => setMobileNavOpen(false)} />
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <HeaderBar onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          <div className="container mx-auto px-4 md:px-6 py-4 max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};

export default MainLayout;

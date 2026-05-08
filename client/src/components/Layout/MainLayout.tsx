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
        <main id="main-content" className="flex-1 overflow-auto bg-gradient-to-b from-background via-background to-secondary/35" tabIndex={-1}>
          <div className="mx-auto w-full max-w-[88rem] px-4 py-5 md:px-7 md:py-7 lg:px-8 animate-fade-in">
            <section className="page-stack">
              <Outlet />
            </section>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};

export default MainLayout;

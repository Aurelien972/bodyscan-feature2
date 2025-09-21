// src/app/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../system/store/userStore';
import { LoadingFallback } from './components/LoadingFallback';
import { Header } from './shell/Header/Header';
import Sidebar from './shell/Sidebar';

// Import des pages
import Home from './pages/Home';
import BodyScan from './pages/BodyScan';
import BodyScanReview from './pages/BodyScan/BodyScanReview';
import BodyScanCelebrationStep from './pages/BodyScan/BodyScanCelebrationStep';
import Profile from './pages/Profile';
import AvatarPage from './pages/Avatar/AvatarPage';
import FaceScanPage from './pages/FaceScanPage';
import FaceScanCelebrationStep from './pages/FaceScan/FaceScanCelebrationStep';
import FaceScanReviewPage from './pages/FaceScan/FaceScanReviewPage';

/**
 * App Content Component - Handles conditional header rendering
 */
function AppContent() {
  const location = useLocation();
  const { authReady } = useUserStore();
  
  // Smooth scroll to top on route changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);
  
  // Wait for providers to be fully initialized before rendering routes
  if (!authReady) {
    return <LoadingFallback />;
  }
  
  return (
    <div className="min-h-screen flex flex-col relative bg-twinforge-visionos">
      {/* Particules de l'Enclume Cosmique */}
      <div className="cosmic-forge-particles">
        <div className="forge-particle forge-particle--1" style={{ '--particle-phase': '0' } as React.CSSProperties}></div>
        <div className="forge-particle forge-particle--2" style={{ '--particle-phase': '1.57' } as React.CSSProperties}></div>
        <div className="forge-particle forge-particle--3" style={{ '--particle-phase': '3.14' } as React.CSSProperties}></div>
        <div className="forge-particle forge-particle--4" style={{ '--particle-phase': '4.71' } as React.CSSProperties}></div>
        <div className="forge-particle forge-particle--5" style={{ '--particle-phase': '6.28' } as React.CSSProperties}></div>
        <div className="forge-particle forge-particle--6" style={{ '--particle-phase': '1.05' } as React.CSSProperties}></div>
      </div>
      
      {/* Header - Always visible */}
      <Header />
      
      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Column - Desktop Sidebar and Dynamic Progress Header */}
        <div className="hidden lg:flex lg:flex-col lg:w-[240px] xl:w-[260px] shrink-0 ml-6 mr-3">
          {/* Desktop Sidebar */}
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <main 
          id="main-content"
          className="flex-1 px-4 py-4 md:px-6 lg:px-8 xl:px-12 md:pb-4 route-container overflow-x-hidden"
          role="main"
          aria-label="Contenu principal de l'application"
        >
          <div className="max-w-[1200px] mx-auto w-full min-w-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/body-scan" element={<BodyScan />} />
              <Route path="/body-scan/celebration" element={<BodyScanCelebrationStep />} />
              <Route path="/body-scan/review" element={<BodyScanReview />} />
              <Route path="/avatar" element={<AvatarPage />} />
              <Route path="/face-scan" element={<FaceScanPage />} />
              <Route path="/face-scan/celebration" element={<FaceScanCelebrationStep />} />
              <Route path="/face-scan/review" element={<FaceScanReviewPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Main Application Component - Simplified for Body Scan Development
 * Removed authentication guards for development environment
 */
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

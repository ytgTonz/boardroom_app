import React, { useState } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallPromptProps {
  className?: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const { isInstallable, installApp, dismissInstallPrompt } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await installApp();
      if (success) {
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissInstallPrompt();
  };

  return (
    <div className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Download className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Install Boardroom App</h3>
          </div>
          
          <p className="text-blue-100 mb-4 text-sm">
            Get quick access and work offline! Install our app for the best experience.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center space-x-2 text-sm">
              <Smartphone className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">Works on mobile & desktop</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Monitor className="w-4 h-4 text-blue-200" />
              <span className="text-blue-100">Offline functionality</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleDismiss}
              className="bg-transparent border border-blue-200 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-400 hover:bg-opacity-20 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="ml-4 text-blue-200 hover:text-white transition-colors p-1"
          aria-label="Dismiss install prompt"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
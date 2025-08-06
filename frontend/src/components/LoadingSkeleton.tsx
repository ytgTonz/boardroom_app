import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-lg';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[wave_1.5s_ease-in-out_infinite]';
      case 'pulse':
      default:
        return 'animate-pulse bg-gray-200';
    }
  };

  const getDefaultDimensions = () => {
    if (variant === 'text') {
      return {
        width: width || '100%',
        height: height || '1rem'
      };
    } else if (variant === 'circular') {
      const size = width || height || '2.5rem';
      return {
        width: size,
        height: size
      };
    }
    return {
      width: width || '100%',
      height: height || '2rem'
    };
  };

  const dimensions = getDefaultDimensions();
  const variantClasses = getVariantClasses();
  const animationClasses = getAnimationClasses();

  return (
    <div
      className={`${animationClasses} ${variantClasses} ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height
      }}
      aria-label="Loading..."
      role="status"
    />
  );
};

// Compound components for common loading patterns
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <LoadingSkeleton variant="circular" width="3rem" height="3rem" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton variant="text" width="60%" height="1.25rem" />
          <LoadingSkeleton variant="text" width="40%" height="1rem" />
        </div>
      </div>
      <div className="space-y-3">
        <LoadingSkeleton variant="text" width="100%" height="1rem" />
        <LoadingSkeleton variant="text" width="80%" height="1rem" />
        <LoadingSkeleton variant="text" width="90%" height="1rem" />
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <LoadingSkeleton key={index} variant="text" height="1.25rem" width="80%" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <LoadingSkeleton key={colIndex} variant="text" height="1rem" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 4, 
  className = '' 
}) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
    <div className="animate-pulse space-y-6">
      {/* Title */}
      <LoadingSkeleton variant="text" width="40%" height="1.5rem" />
      
      {/* Fields */}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <LoadingSkeleton variant="text" width="25%" height="1rem" />
            <LoadingSkeleton variant="rectangular" height="2.5rem" className="rounded-md" />
          </div>
        ))}
      </div>
      
      {/* Buttons */}
      <div className="flex space-x-3 pt-4">
        <LoadingSkeleton variant="rounded" width="6rem" height="2.5rem" />
        <LoadingSkeleton variant="rounded" width="6rem" height="2.5rem" />
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ 
  items?: number; 
  showAvatar?: boolean; 
  showActions?: boolean;
  className?: string;
}> = ({ 
  items = 6, 
  showAvatar = true, 
  showActions = false,
  className = ''
}) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="p-4">
        <div className="animate-pulse flex items-center space-x-4">
          {showAvatar && (
            <LoadingSkeleton variant="circular" width="2.5rem" height="2.5rem" />
          )}
          <div className="flex-1 space-y-2">
            <LoadingSkeleton variant="text" width="60%" height="1.25rem" />
            <LoadingSkeleton variant="text" width="40%" height="1rem" />
          </div>
          {showActions && (
            <div className="flex space-x-2">
              <LoadingSkeleton variant="rounded" width="2rem" height="2rem" />
              <LoadingSkeleton variant="rounded" width="2rem" height="2rem" />
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Header */}
    <div className="animate-pulse">
      <LoadingSkeleton variant="text" width="30%" height="2rem" className="mb-2" />
      <LoadingSkeleton variant="text" width="50%" height="1rem" />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <LoadingSkeleton variant="circular" width="3rem" height="3rem" />
              <LoadingSkeleton variant="text" width="2rem" height="1.5rem" />
            </div>
            <LoadingSkeleton variant="text" width="70%" height="1rem" />
          </div>
        </div>
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

export const ProfileSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
    {/* Header */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="animate-pulse flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <LoadingSkeleton variant="circular" width="4rem" height="4rem" />
          <div className="space-y-2">
            <LoadingSkeleton variant="text" width="12rem" height="1.5rem" />
            <LoadingSkeleton variant="text" width="20rem" height="1rem" />
          </div>
        </div>
        <LoadingSkeleton variant="rounded" width="8rem" height="2.5rem" />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile Form */}
      <div className="lg:col-span-2">
        <FormSkeleton fields={6} />
      </div>
      
      {/* Sidebar */}
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  </div>
);

export const CalendarSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    <div className="animate-pulse">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <LoadingSkeleton variant="rounded" width="2rem" height="2rem" />
          <LoadingSkeleton variant="text" width="12rem" height="1.5rem" />
          <LoadingSkeleton variant="rounded" width="2rem" height="2rem" />
        </div>
        <div className="flex space-x-2">
          <LoadingSkeleton variant="rounded" width="5rem" height="2rem" />
          <LoadingSkeleton variant="rounded" width="5rem" height="2rem" />
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-6">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="text" height="1.5rem" className="text-center" />
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="aspect-square border border-gray-100 rounded p-2">
              <LoadingSkeleton variant="text" width="1.5rem" height="1rem" />
              {Math.random() > 0.7 && (
                <LoadingSkeleton variant="rectangular" height="0.5rem" className="mt-1 rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Add wave animation keyframes to your CSS
const waveKeyframes = `
  @keyframes wave {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject CSS for wave animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = waveKeyframes;
  document.head.appendChild(style);
}

export default LoadingSkeleton;
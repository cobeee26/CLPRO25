import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  className = '', 
  height = 'h-4', 
  width = 'w-full',
  rounded = true 
}) => {
  return (
    <div 
      className={`bg-slate-700/50 animate-pulse ${height} ${width} ${rounded ? 'rounded' : ''} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <SkeletonLoader className="w-10 h-10 rounded-xl" />
        <div className="flex-1">
          <SkeletonLoader className="h-5 w-3/4 mb-2" />
          <SkeletonLoader className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonLoader className="h-4 w-full" />
        <SkeletonLoader className="h-4 w-5/6" />
        <SkeletonLoader className="h-4 w-4/5" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6 border-b border-slate-700/50">
        <SkeletonLoader className="h-6 w-48 mb-2" />
        <SkeletonLoader className="h-4 w-64" />
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <SkeletonLoader className="w-10 h-10 rounded-xl" />
              <div className="flex-1">
                <SkeletonLoader className="h-4 w-3/4 mb-2" />
                <SkeletonLoader className="h-3 w-1/2" />
              </div>
              <SkeletonLoader className="h-4 w-20" />
              <SkeletonLoader className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SkeletonLoader className="w-8 h-8 rounded-lg" />
              <div>
                <SkeletonLoader className="h-6 w-48 mb-2" />
                <SkeletonLoader className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <SkeletonLoader className="h-8 w-24 rounded-lg" />
              <SkeletonLoader className="w-8 h-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="space-y-8">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;

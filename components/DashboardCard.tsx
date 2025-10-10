
import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

const TrendIcon: React.FC<{ direction: 'up' | 'down' | 'neutral' }> = ({ direction }) => {
    if (direction === 'up') return <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>;
    if (direction === 'down') return <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>;
    return <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14"></path></svg>;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, colorClass, trend, trendDirection }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-start justify-between">
      <div className="flex items-start">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
      </div>
      {trend && trendDirection && (
        <div className="flex items-center text-sm font-semibold">
            <TrendIcon direction={trendDirection} />
            <span className={`ml-1 ${
                trendDirection === 'up' ? 'text-green-500' : 
                trendDirection === 'down' ? 'text-red-500' :
                'text-gray-500'
            }`}>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default DashboardCard;
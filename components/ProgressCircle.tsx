
import React from 'react';

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ 
  percentage, 
  size = 60, 
  strokeWidth = 6,
  colorClass = 'text-violet-500'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-slate-200 dark:text-slate-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${colorClass} transition-all duration-1000 ease-out`}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ProgressCircle;

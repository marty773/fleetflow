import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Wrench } from 'lucide-react';

export default function DashboardStats({ stats, onUpcomingClick, onOverdueClick }) {
  const statCards = [
    {
      label: 'Upcoming Services',
      value: stats.upcomingMaintenance,
      icon: Wrench,
      useDynamic: true,
      onClick: onUpcomingClick,
    },
    {
      label: 'Overdue Services',
      value: stats.overdueServices,
      icon: AlertCircle,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      onClick: onOverdueClick,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {statCards.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card
            key={idx}
            className={`border-0 shadow-sm transition-shadow ${stat.onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
            onClick={stat.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  {stat.onClick && <p className="text-xs text-slate-400 mt-1">Click to view →</p>}
                </div>
                <div
                  className={stat.useDynamic ? 'p-3 rounded-lg' : `${stat.bgColor} p-3 rounded-lg`}
                  style={stat.useDynamic ? { backgroundColor: 'var(--color-primary-light)' } : {}}
                >
                  <Icon
                    className={stat.useDynamic ? 'w-6 h-6' : `w-6 h-6 ${stat.iconColor}`}
                    style={stat.useDynamic ? { color: 'var(--color-icon-bg)' } : {}}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
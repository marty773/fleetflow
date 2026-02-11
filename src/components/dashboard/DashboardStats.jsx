import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertCircle, Wrench, DollarSign } from 'lucide-react';

export default function DashboardStats({ stats }) {
  const statCards = [
    {
      label: 'Fleet Size',
      value: stats.totalVehicles,
      icon: TrendingUp,
      color: 'slate',
      bgColor: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-700 dark:text-slate-300',
    },
    {
      label: 'Expenses (30 Days)',
      value: `$${stats.totalExpenses.toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      hideIcon: true,
    },
    {
      label: 'Upcoming Services',
      value: stats.upcomingMaintenance,
      icon: Wrench,
      color: 'primary',
      useDynamic: true,
    },
    {
      label: 'Overdue Services',
      value: stats.overdueServices,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
                {!stat.hideIcon && (
                  <div 
                    className={stat.useDynamic ? 'p-3 rounded-lg' : `${stat.bgColor} p-3 rounded-lg`}
                    style={stat.useDynamic ? { backgroundColor: 'var(--color-primary-light)' } : {}}
                  >
                    <Icon 
                      className={stat.useDynamic ? 'w-6 h-6' : `w-6 h-6 ${stat.iconColor}`}
                      style={stat.useDynamic ? { color: 'var(--color-icon-bg)' } : {}}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
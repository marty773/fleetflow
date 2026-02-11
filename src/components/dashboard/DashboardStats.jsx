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
      bgColor: 'bg-slate-50',
      iconColor: 'text-slate-700',
    },
    {
      label: 'Expenses (30 Days)',
      value: `$${stats.totalExpenses.toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
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
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
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
                  <p className="text-sm font-medium text-slate-600 mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
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
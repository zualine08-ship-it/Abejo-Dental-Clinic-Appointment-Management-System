import { CalenderIcon, CheckCircleIcon, GroupIcon, PageIcon } from "../../icons";

interface HealthMetricsProps {
  summary: {
    total_appointments: number;
    upcoming_appointments: number;
    completed_appointments: number;
    medical_records: number;
    last_visit: string;
  };
}

export default function HealthMetrics({ summary }: HealthMetricsProps) {
  const colorConfig = {
    blue: {
      bg: "from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20",
      border: "border-blue-200/50 dark:border-blue-800/30",
      label: "text-blue-600 dark:text-blue-400",
      number: "text-blue-900 dark:text-blue-100",
      icon: "text-blue-600 dark:text-blue-400",
    },
    cyan: {
      bg: "from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20",
      border: "border-cyan-200/50 dark:border-cyan-800/30",
      label: "text-cyan-600 dark:text-cyan-400",
      number: "text-cyan-900 dark:text-cyan-100",
      icon: "text-cyan-600 dark:text-cyan-400",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      label: "text-emerald-600 dark:text-emerald-400",
      number: "text-emerald-900 dark:text-emerald-100",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    violet: {
      bg: "from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20",
      border: "border-violet-200/50 dark:border-violet-800/30",
      label: "text-violet-600 dark:text-violet-400",
      number: "text-violet-900 dark:text-violet-100",
      icon: "text-violet-600 dark:text-violet-400",
    },
  };

  const metrics = [
    {
      title: "Upcoming Appointments",
      value: summary.upcoming_appointments,
      icon: CalenderIcon,
      colorKey: "cyan",
    },
    {
      title: "Completed Appointments",
      value: summary.completed_appointments,
      icon: CheckCircleIcon,
      colorKey: "emerald",
    },
    {
      title: "Medical Records",
      value: summary.medical_records,
      icon: PageIcon,
      colorKey: "violet",
    },
    {
      title: "Total Visits",
      value: summary.total_appointments,
      icon: GroupIcon,
      colorKey: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        const colors = colorConfig[metric.colorKey as keyof typeof colorConfig];
        return (
          <div
            key={index}
            className={`overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg} ${colors.border} border p-6`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className={`inline-block text-xs font-semibold ${colors.label} uppercase tracking-wide`}>
                  {metric.title}
                </span>
                <h4 className={`mt-3 text-4xl font-bold ${colors.number}`}>
                  {metric.value}
                </h4>
              </div>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-gray-900/30 shadow-sm">
                <IconComponent className={`${colors.icon} size-8`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendLabel?: string;
}

export function StatCard({ label, value, trend, trendLabel }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-[gray-200] bg-white px-5 py-6 shadow-[0_25px_70px_-60px_rgba(0,0,0,0.15)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[gray-400]">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[black]">{value}</p>
      {trend || trendLabel ? (
        <p className="text-xs font-semibold text-[gray-700]">
          {trend}
          {trendLabel ? <span className={trend ? 'ml-1 text-[gray-400]' : 'text-[gray-400]'}>{trendLabel}</span> : null}
        </p>
      ) : null}
    </div>
  );
}



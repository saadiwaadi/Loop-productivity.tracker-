import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useWeeklyTimeByProject, useProjects } from '../hooks/useDb';

export default function WeekChart() {
  const chartData = useWeeklyTimeByProject();
  const projects = useProjects();

  const totalWeeklyHours = chartData.reduce((sum, dayEntry) => {
    let daySum = 0;
    projects.forEach(p => {
      if (dayEntry[p.name]) {
        daySum += Number(dayEntry[p.name]);
      }
    });
    return sum + daySum;
  }, 0).toFixed(1);

  return (
    <div>
      <div className="card-h">
        <div>
          <div className="t">Weekly Activity</div>
          <div className="sub">Focus hours logged per project (last 7 days)</div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: 'var(--ink)' }}>
          {totalWeeklyHours}h
        </div>
      </div>

      <div className="chart-wrap">
        {chartData.length === 0 || projects.length === 0 ? (
          <div
            style={{
              height: '220px',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink-faint)',
              fontSize: '14px',
            }}
          >
            No data logged this week. Start a session to see analytics!
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {projects.map(p => (
                    <linearGradient key={p.id} id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(${p.colorToken})`} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={`var(${p.colorToken})`} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>

                <XAxis
                  dataKey="day"
                  stroke="var(--ink-faint)"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="var(--ink-faint)"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-solid)',
                    border: '1px solid var(--stroke-2)',
                    borderRadius: '12px',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-body)',
                    boxShadow: 'var(--shadow-soft)',
                  }}
                />

                {projects.map(p => (
                  <Area
                    key={p.id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={`var(${p.colorToken})`}
                    fill={`url(#grad-${p.id})`}
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>

            {/* Custom high-fidelity legend below chart */}
            <div className="chart-legend">
              {projects.map(p => (
                <span key={p.id}>
                  <i style={{ backgroundColor: `var(${p.colorToken})` }}></i>
                  {p.name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingDown, TrendingUp, Minus, Flame, Droplets, Footprints, Moon, Dumbbell } from 'lucide-react';
import { useHealthReport, useHealthGoals, formatMinutes } from '../../hooks/useHealth';

type Range = 7 | 30 | 90;

function ConsistencyBar({ label, Icon, hit, total, color }: {
  label: string;
  Icon: React.ComponentType<{ size?: number | string }>;
  hit: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  return (
    <div className="cons-row">
      <span className="cons-label"><Icon size={15} /> {label}</span>
      <div className="cons-track">
        <motion.div
          className="cons-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
      <span className="cons-val">{hit}/{total} · {pct}%</span>
    </div>
  );
}

export default function HealthReportView() {
  const [range, setRange] = useState<Range>(7);
  const report = useHealthReport(range);
  const goals = useHealthGoals();

  const verdict = (() => {
    if (!report) return null;
    if (report.weightDeltaKg === null) return { Icon: Minus, color: 'var(--ink-faint)', text: 'Not enough weigh-ins to judge weight change yet.' };
    if (report.weightDeltaKg < -0.2) return { Icon: TrendingDown, color: 'var(--mint)', text: `You lost ${Math.abs(report.weightDeltaKg)} kg over this period.` };
    if (report.weightDeltaKg > 0.2) return { Icon: TrendingUp, color: 'var(--coral)', text: `You gained ${report.weightDeltaKg} kg over this period.` };
    return { Icon: Minus, color: 'var(--sky)', text: 'Your weight held steady over this period.' };
  })();

  const insights: string[] = [];
  if (report) {
    if (report.consistencyPct >= 80) insights.push(`Excellent consistency — you logged something on ${report.loggedAnyDays} of ${report.days} days.`);
    else if (report.consistencyPct >= 50) insights.push(`Decent consistency (${report.consistencyPct}%), but there's room: ${report.days - report.loggedAnyDays} days had no logs at all.`);
    else insights.push(`Consistency is the weak spot: only ${report.loggedAnyDays} of ${report.days} days have any logs. The report is only as honest as the logging.`);

    if (report.bestStreak >= 3) insights.push(`Best logging streak: ${report.bestStreak} days in a row.`);
    if (report.sleepDaysLogged > 0 && report.sleepAvgMin < goals.sleepGoalMin - 30) {
      insights.push(`Sleep is running ${formatMinutes(goals.sleepGoalMin - report.sleepAvgMin)} under your goal on average.`);
    }
    if (report.exerciseTotalMin >= goals.exerciseWeeklyMin * (report.days / 7)) {
      insights.push('You hit your active-minutes pace for this period. Keep the engine warm.');
    }
    if (report.dietOnTrackPct !== null) {
      insights.push(report.dietOnTrackPct >= 75
        ? `${report.dietOnTrackPct}% of logged meals matched your dietary goals.`
        : `Only ${report.dietOnTrackPct}% of logged meals were on plan — worth a look at what keeps slipping.`);
    }
    if (report.toGoalKg !== null && Math.abs(report.toGoalKg) <= 0.5) {
      insights.push('You are within half a kilo of your goal weight. 🎯');
    }
  }

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <header className="top">
        <div className="hello">
          <h1>Report</h1>
          <p>Did we gain, lose, and how consistent were we? The honest numbers.</p>
        </div>
        <div className="top-right">
          <div className="seg" style={{ width: 260, margin: 0 }}>
            {( [7, 30, 90] as Range[]).map(r => (
              <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>
                {r === 7 ? 'Week' : r === 30 ? 'Month' : '90 days'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {report && (
        <div className="bento">
          {/* Verdict */}
          <div className="w span-12">
            <div className="card verdict-card">
              {verdict && (
                <div className="verdict">
                  <div className="verdict-ic" style={{ color: verdict.color }}><verdict.Icon size={30} /></div>
                  <div>
                    <div className="verdict-t">{verdict.text}</div>
                    <div className="verdict-s">
                      {report.firstWeight !== null && report.lastWeight !== null
                        ? `${report.firstWeight} kg → ${report.lastWeight} kg`
                        : 'Add weekly weigh-ins in Body to unlock the weight verdict.'}
                      {report.toGoalKg !== null ? ` · ${Math.abs(report.toGoalKg)} kg ${report.toGoalKg > 0 ? 'above' : 'below'} goal` : ''}
                    </div>
                  </div>
                  <div className="verdict-streak">
                    <Flame size={18} />
                    <b>{report.bestStreak}</b> day best streak
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Consistency breakdown */}
          <div className="w span-7">
            <div className="card">
              <div className="card-h">
                <div>
                  <div className="t">Consistency</div>
                  <div className="sub">Goal hits over the last {report.days} days</div>
                </div>
              </div>
              <ConsistencyBar label="Water goal" Icon={Droplets} hit={report.waterDaysHit} total={report.days} color="var(--sky)" />
              <ConsistencyBar label="Step goal" Icon={Footprints} hit={report.stepDaysHit} total={report.days} color="var(--h-blue)" />
              <ConsistencyBar label="Exercised" Icon={Dumbbell} hit={report.exerciseDays} total={report.days} color="var(--accent-deep)" />
              <ConsistencyBar label="Sleep logged" Icon={Moon} hit={report.sleepDaysLogged} total={report.days} color="var(--violet)" />
              <ConsistencyBar label="Any log at all" Icon={Flame} hit={report.loggedAnyDays} total={report.days} color="var(--coral)" />
            </div>
          </div>

          {/* Numbers + insights */}
          <div className="w span-5">
            <div className="card">
              <div className="card-h">
                <div>
                  <div className="t">Insights</div>
                  <div className="sub">What the data says</div>
                </div>
              </div>
              <div className="mini-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }}>
                <div className="ms">
                  <div className="v">{formatMinutes(report.exerciseTotalMin)}</div>
                  <div className="k">total active time</div>
                </div>
                <div className="ms">
                  <div className="v">{report.sleepAvgMin > 0 ? formatMinutes(report.sleepAvgMin) : '—'}</div>
                  <div className="k">avg sleep</div>
                </div>
              </div>
              <ul className="insight-list">
                {insights.map((text, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    {text}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

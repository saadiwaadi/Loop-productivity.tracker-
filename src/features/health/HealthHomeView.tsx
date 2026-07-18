import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Footprints, GlassWater, Moon, Dumbbell, Scale, ArrowRight, Flame } from 'lucide-react';
import ProgressRing from '../../components/health/ProgressRing';
import CountUp from '../../components/health/CountUp';
import {
  useHealthGoals, useWaterToday, useStepsToday, useSleepLastNight,
  useExerciseWeekMinutes, useWeightLogs, useHealthReport, formatMinutes,
} from '../../hooks/useHealth';
import { useSettings } from '../../hooks/useDb';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HealthHomeView() {
  const settings = useSettings();
  const goals = useHealthGoals();
  const waterMl = useWaterToday();
  const steps = useStepsToday();
  const sleep = useSleepLastNight();
  const weekExercise = useExerciseWeekMinutes();
  const weights = useWeightLogs();
  const report = useHealthReport(7);

  const lastWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const sleepMin = sleep?.durationMin ?? 0;

  const rings = [
    {
      to: '/health/activity', label: 'Steps', Icon: Footprints, color: 'var(--h-blue)',
      progress: steps / goals.stepGoal,
      value: <CountUp value={steps} />, unit: `/ ${goals.stepGoal.toLocaleString()}`,
    },
    {
      to: '/health/nutrition', label: 'Water', Icon: GlassWater, color: 'var(--sky)',
      progress: waterMl / goals.waterGoalMl,
      value: <CountUp value={waterMl} />, unit: `/ ${goals.waterGoalMl} ml`,
    },
    {
      to: '/health/sleep', label: 'Sleep', Icon: Moon, color: 'var(--violet)',
      progress: sleepMin / goals.sleepGoalMin,
      value: <span>{sleepMin > 0 ? formatMinutes(sleepMin) : '—'}</span>,
      unit: `goal ${formatMinutes(goals.sleepGoalMin)}`,
    },
    {
      to: '/health/activity', label: 'Active mins', Icon: Dumbbell, color: 'var(--accent-deep)',
      progress: weekExercise / goals.exerciseWeeklyMin,
      value: <CountUp value={weekExercise} />, unit: `/ ${goals.exerciseWeeklyMin} wk`,
    },
  ];

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <header className="top">
        <div className="hello">
          <h1>{greeting()}{settings?.name ? `, ${settings.name}` : ''}</h1>
          <p>Your body's dashboard for today. Log it while it's fresh.</p>
        </div>
        <div className="top-right">
          {report && (
            <div className="stat">
              <div className="k">7-day consistency</div>
              <div className="v"><Flame size={22} />{report.consistencyPct}%</div>
            </div>
          )}
        </div>
      </header>

      <div className="bento">
        {/* Today rings */}
        {rings.map(({ to, label, Icon, color, progress, value, unit }) => (
          <Link key={label} to={to} className="w span-3 no-link">
            <div className="card health-ring-card">
              <div className="hrc-top">
                <span className="hrc-label"><Icon size={15} /> {label}</span>
                <ArrowRight size={14} className="hrc-arrow" />
              </div>
              <ProgressRing size={116} stroke={11} progress={progress} color={color}>
                <div className="hrc-value">{value}</div>
                <div className="hrc-unit">{unit}</div>
              </ProgressRing>
              <div className="hrc-pct" style={{ color }}>
                {Math.min(100, Math.round(progress * 100))}%
              </div>
            </div>
          </Link>
        ))}

        {/* Weight strip */}
        <div className="w span-6">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Body weight</div>
                <div className="sub">Weekly check-ins keep the trend honest</div>
              </div>
              <Link to="/health/body" className="ghost-btn" aria-label="Open body view"><Scale size={18} /></Link>
            </div>
            {lastWeight ? (
              <div className="weight-strip">
                <div>
                  <div className="hrc-value big"><CountUp value={lastWeight.weightKg} decimals={1} /> kg</div>
                  <div className="hrc-unit">last logged {lastWeight.date}</div>
                </div>
                {goals.weightGoalKg && (
                  <div className="weight-goal-chip">
                    {Math.abs(+(lastWeight.weightKg - goals.weightGoalKg).toFixed(1))} kg
                    {lastWeight.weightKg > goals.weightGoalKg ? ' above goal' : ' below goal'}
                  </div>
                )}
              </div>
            ) : (
              <p className="empty-hint">No weigh-ins yet — record your first one in Body.</p>
            )}
          </div>
        </div>

        {/* Week summary */}
        <div className="w span-6">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">This week</div>
                <div className="sub">Rolling 7 days at a glance</div>
              </div>
              <Link to="/health/report" className="ghost-btn" aria-label="Open report"><ArrowRight size={18} /></Link>
            </div>
            {report ? (
              <div className="mini-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="ms">
                  <div className="v">{report.exerciseDays}/7</div>
                  <div className="k">days exercised · {formatMinutes(report.exerciseTotalMin)} total</div>
                </div>
                <div className="ms">
                  <div className="v">{report.waterDaysHit}/7</div>
                  <div className="k">days water goal hit</div>
                </div>
                <div className="ms">
                  <div className="v">{report.stepDaysHit}/7</div>
                  <div className="k">days step goal hit</div>
                </div>
                <div className="ms">
                  <div className="v">{report.sleepAvgMin > 0 ? formatMinutes(report.sleepAvgMin) : '—'}</div>
                  <div className="k">average sleep ({report.sleepDaysLogged} nights logged)</div>
                </div>
              </div>
            ) : (
              <p className="empty-hint">Loading…</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

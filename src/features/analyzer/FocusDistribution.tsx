import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Card from '../../components/ui/Card';

interface FocusDistributionProps {
  projectShares: any[];
  totalHours: number;
  rangeLabel: string;
}

export default function FocusDistribution({ projectShares, totalHours, rangeLabel }: FocusDistributionProps) {
  return (
    <Card className="span-6" style={{ padding: '24px' }}>
      <div className="card-h" style={{ marginBottom: '20px' }}>
        <div>
          <div className="t">Focus Distribution</div>
          <div className="sub">Logged hours by project for {rangeLabel.toLowerCase()}</div>
        </div>
      </div>

      {projectShares.length === 0 ? (
        <div
          style={{
            height: '180px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-faint)',
            fontSize: '14px',
          }}
        >
          No hours logged in this range. Start a session!
        </div>
      ) : (
        <div className="donut-wrap">
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectShares}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {projectShares.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`var(${entry.colorToken})`} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <b>
              <span className="n">{totalHours}h</span>
              <span className="l">Total Focus</span>
            </b>
          </div>

          {/* Accessible Legend */}
          <div className="donut-legend">
            {projectShares.map(p => (
              <div key={p.id} className="dl">
                <i style={{ backgroundColor: `var(${p.colorToken})` }} />
                <span className="nm">{p.name}</span>
                <span className="vv">{p.value}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

import Card from '../../components/ui/Card';

interface InitiativeProgressProps {
  projectProgress: any[];
}

export default function InitiativeProgress({ projectProgress }: InitiativeProgressProps) {
  return (
    <Card className="span-6" style={{ padding: '24px' }}>
      <div className="card-h" style={{ marginBottom: '20px' }}>
        <div>
          <div className="t">Initiative Progress</div>
          <div className="sub">Active project task completion, sorted by progress</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {projectProgress.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-faint)', fontSize: '14px' }}>
            No active projects found.
          </div>
        ) : (
          projectProgress.map(p => (
            <div key={p.id} className="proj-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: `var(${p.colorToken})`,
                    }}
                  />
                  <span>{p.name}</span>
                </div>
                <span className="text-ink-soft">{p.progress}%</span>
              </div>

              <div className="bar" style={{ margin: '8px 0 0' }}>
                <i
                  style={{
                    width: `${p.progress}%`,
                    backgroundColor: `var(${p.colorToken})`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

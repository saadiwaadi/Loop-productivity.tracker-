import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../db/db';

const getTagColor = (tag: string) => {
  const t = tag.toLowerCase();
  if (t === 'film' || t === 'creative' || t === 'video') return 'var(--coral)';
  if (t === 'product' || t === 'app' || t === 'software' || t === 'dev') return 'var(--violet)';
  if (t === 'brand' || t === 'design' || t === 'style' || t === 'marketing') return 'var(--mint)';
  return 'var(--sky)';
};

export default function SparksToday() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('App');

  const ideas = useLiveQuery(async () => {
    const list = await db.ideas.toArray();
    // Sort descending by id or date to show latest first
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }) || [];

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await db.ideas.add({
      tag,
      title: title.trim(),
      body: body.trim(),
      createdAt: new Date(),
    });

    setTitle('');
    setBody('');
    setTag('App');
    setShowAddForm(false);
  };

  const latestTwo = ideas.slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-h">
        <div>
          <div className="t">Sparks</div>
          <div className="sub">Future projects &amp; ideas</div>
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="ghost-btn"
          title="Add quick idea"
        >
          {showAddForm ? <Icons.X size={18} /> : <Icons.Plus size={18} />}
        </button>
      </div>

      {showAddForm ? (
        <form onSubmit={handleAddIdea} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          <input
            type="text"
            placeholder="Idea Title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--stroke-2)',
              color: 'var(--ink)',
              fontSize: '13px',
              outline: 'none',
            }}
            required
            autoFocus
          />
          <textarea
            placeholder="Description..."
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{
              width: '100%',
              height: '54px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--stroke-2)',
              color: 'var(--ink)',
              fontSize: '12.5px',
              fontFamily: 'var(--font-body)',
              outline: 'none',
              resize: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={tag}
              onChange={e => setTag(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--stroke-2)',
                color: 'var(--ink)',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="App">App</option>
              <option value="Product">Product</option>
              <option value="Film">Film</option>
              <option value="Brand">Brand</option>
              <option value="Design">Design</option>
              <option value="Other">Other</option>
            </select>
            <button
              type="submit"
              className="btn primary"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12.5px',
                borderRadius: '8px',
              }}
            >
              Save Idea
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1, justifyContent: 'flex-start' }}>
          {latestTwo.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '13.5px', fontStyle: 'italic' }}>
              No sparks yet. Add one!
            </div>
          ) : (
            latestTwo.map(idea => {
              const tagColor = getTagColor(idea.tag);
              const isMint = tagColor === 'var(--mint)';
              return (
                <div key={idea.id} className="idea">
                  <span
                    className="tag"
                    style={{
                      background: `color-mix(in srgb, ${tagColor} 22%, transparent)`,
                      color: isMint ? '#2f9e78' : tagColor,
                    }}
                  >
                    {idea.tag}
                  </span>
                  <div className="h">{idea.title}</div>
                  <div className="b">{idea.body}</div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

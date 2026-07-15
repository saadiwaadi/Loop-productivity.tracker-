import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import Card from '../../components/ui/Card';
import { useConfirm } from '../../components/providers/ConfirmProvider';
import CustomSelect from '../../components/ui/CustomSelect';

export default function IdeasCapture() {
  const confirmDialog = useConfirm();
  const ideasList = useLiveQuery(() => db.ideas.toArray()) || [];

  // Ideas State
  const [ideaTag, setIdeaTag] = useState('App');
  const [customTag, setCustomTag] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaBody, setIdeaBody] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;

    const tagToInsert = showCustomTagInput ? customTag.trim() : ideaTag;
    if (!tagToInsert) return;

    db.ideas.add({
      tag: tagToInsert,
      title: ideaTitle.trim(),
      body: ideaBody.trim(),
      createdAt: new Date(),
    });

    setIdeaTitle('');
    setIdeaBody('');
    setCustomTag('');
    setShowCustomTagInput(false);
  };

  const handleDeleteIdea = async (id: number) => {
    const ok = await confirmDialog({
      title: 'Delete Idea Card',
      message: 'Are you sure you want to delete this idea card?',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      db.ideas.delete(id);
    }
  };

  // Filter Ideas
  const uniqueTags = ['All', ...Array.from(new Set(ideasList.map(i => i.tag)))];
  const filteredIdeas = selectedTagFilter === 'All'
    ? ideasList
    : ideasList.filter(i => i.tag === selectedTagFilter);

  // Hash tags for background colors
  const getTagColor = (tag: string) => {
    const colors = ['--violet', '--sky', '--coral', '--mint', '--amber'];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return `var(${colors[idx]})`;
  };

  return (
    <Card className="span-4" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="font-display font-bold text-xl mb-1">Ideas capture</h2>
        <p className="text-xs text-ink-soft">Instantly capture a product spark or creative direction.</p>
      </div>

      {/* Ideas Form */}
      <form onSubmit={handleCreateIdea} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!showCustomTagInput ? (
            <CustomSelect
              value={ideaTag}
              onChange={(val) => {
                if (val === 'custom') {
                  setShowCustomTagInput(true);
                } else {
                  setIdeaTag(val);
                }
              }}
              options={[
                { value: 'App', label: 'App' },
                { value: 'Product', label: 'Product' },
                { value: 'Film', label: 'Film' },
                { value: 'Brand', label: 'Brand' },
                { value: 'custom', label: 'Custom Tag...' }
              ]}
              style={{ flex: 1 }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Custom tag name..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--stroke-2)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  outline: 'none',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCustomTagInput(false)}
                className="ghost-btn text-xs"
                style={{ padding: '4px' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Idea title..."
          value={ideaTitle}
          onChange={(e) => setIdeaTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '10px',
            background: 'var(--input-bg)',
            border: '1px solid var(--stroke-2)',
            color: 'var(--ink)',
            fontSize: '13px',
            outline: 'none',
          }}
          required
        />

        <textarea
          placeholder="Short description..."
          value={ideaBody}
          onChange={(e) => setIdeaBody(e.target.value)}
          style={{
            width: '100%',
            height: '80px',
            padding: '9px 12px',
            borderRadius: '10px',
            background: 'var(--input-bg)',
            border: '1px solid var(--stroke-2)',
            color: 'var(--ink)',
            fontSize: '13px',
            outline: 'none',
            resize: 'none',
          }}
        />

        <button type="submit" className="btn primary text-xs" style={{ padding: '9px', borderRadius: '12px' }}>
          <Icons.Send size={12} /> Log Idea
        </button>
      </form>

      {/* Ideas Tag Filters */}
      {ideasList.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--stroke)', paddingTop: '14px' }}>
          {uniqueTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              className={`pill text-[10px] uppercase font-bold tracking-wider ${
                selectedTagFilter === tag
                  ? 'bg-ink text-bg-1'
                  : 'bg-stroke-2 text-ink-soft hover:bg-card-2'
              }`}
              style={{ border: 'none', cursor: 'pointer', padding: '4px 10px' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Ideas List Cards */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px' }}>
        {filteredIdeas.length === 0 ? (
          <div className="text-xs text-ink-faint italic p-4 text-center">No ideas recorded under this tag.</div>
        ) : (
          filteredIdeas.map(idea => (
            <div key={idea.id} className="idea" style={{ position: 'relative', margin: 0 }}>
              <div
                className="tag"
                style={{
                  backgroundColor: getTagColor(idea.tag),
                  color: '#fff',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {idea.tag}
              </div>
              <div className="h">{idea.title}</div>
              <div className="b">{idea.body}</div>

              {idea.id && (
                <button
                  onClick={() => handleDeleteIdea(idea.id!)}
                  className="absolute right-3 top-3 text-ink-faint hover:text-coral transition-colors"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  <Icons.Trash2 size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

import { useState } from 'react';
import * as Icons from 'lucide-react';
import Card from '../../components/ui/Card';

interface NotesSidebarProps {
  notesList: any[];
  activeNoteId: number | null;
  sessionUnlockedNoteIds: number[];
  handleSelectNote: (noteId: number, isLocked?: boolean) => void;
  handleToggleLockNote: (id: number, currentLocked?: boolean, e?: React.MouseEvent) => void;
  handleArchiveNote: (id: number, e: React.MouseEvent) => void;
  handleUnarchiveNote: (id: number, e: React.MouseEvent) => void;
  handleDeleteNote: (id: number, e: React.MouseEvent) => void;
}

function extractPreviewText(json: any, maxLength = 100): string {
  try {
    if (!json || !json.content) return '';
    let text = '';
    
    for (const block of json.content) {
      if (block.content) {
        for (const child of block.content) {
          if (child.text) {
            text += child.text + ' ';
            if (text.length >= maxLength) break;
          }
        }
      }
      if (text.length >= maxLength) break;
    }
    
    const trimmed = text.trim();
    if (trimmed.length > maxLength) {
      return trimmed.substring(0, maxLength) + '...';
    }
    return trimmed || 'Empty note...';
  } catch (e) {
    return '';
  }
}

export default function NotesSidebar({
  notesList,
  activeNoteId,
  sessionUnlockedNoteIds,
  handleSelectNote,
  handleToggleLockNote,
  handleArchiveNote,
  handleUnarchiveNote,
  handleDeleteNote,
}: NotesSidebarProps) {
  const [expandPreviews, setExpandPreviews] = useState(false);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const activeNotes = notesList.filter(n => !n.archived);
  const archivedNotes = notesList.filter(n => n.archived);

  return (
    <Card className="span-12" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display font-bold text-xl mb-1">Saved Notes</h2>
          <p className="text-xs text-ink-soft">Browse and manage your collection of written drafts.</p>
        </div>
        <button
          onClick={() => setExpandPreviews(!expandPreviews)}
          className="ghost-btn"
          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', height: '38px', width: 'auto' }}
          title="Toggle detailed previews"
        >
          {expandPreviews ? <Icons.ChevronsUpDown size={13} /> : <Icons.ChevronsLeftRight size={13} />}
          <span>{expandPreviews ? 'Compact View' : 'Detailed View'}</span>
        </button>
      </div>

      {activeNotes.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-faint)', border: '1px dashed var(--stroke-2)', borderRadius: '16px' }}>
          <Icons.FileQuestion size={40} style={{ marginBottom: '8px', color: 'var(--ink-faint)', margin: '0 auto' }} />
          <div className="text-sm font-medium">No saved notes yet</div>
          <div className="text-xs mt-1">Create your first note above to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeNotes.map(note => {
            const isActive = activeNoteId === note.id;
            const isLockedSession = note.locked && !sessionUnlockedNoteIds.includes(note.id || 0);
            return (
              <div
                key={note.id}
                onClick={() => note.id && handleSelectNote(note.id, note.locked)}
                className="group"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isActive ? 'var(--card-2)' : 'var(--input-bg)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--stroke-2)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                {/* Left Details */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="font-semibold text-sm text-ink truncate" style={{ maxWidth: '250px' }}>
                      {note.title || 'Untitled Note'}
                    </span>
                    <span className="text-[10px] text-ink-faint">
                      • Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                    {note.locked && (
                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }} title="Locked Note">
                        <Icons.Lock size={12} />
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                        Active
                      </span>
                    )}
                  </div>
                  {expandPreviews && (
                    <div className="text-xs text-ink-soft truncate">
                      {isLockedSession ? (
                        <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Locked content — Enter PIN to view</span>
                      ) : (
                        extractPreviewText(note.contentJSON, 150)
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={(e) => note.id && handleToggleLockNote(note.id, note.locked, e)}
                    className={note.locked ? "" : "opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: note.locked ? 'var(--accent)' : 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}
                    title={note.locked ? "Unlock Note" : "Lock Note"}
                  >
                    {note.locked ? <Icons.Lock size={15} /> : <Icons.Unlock size={15} />}
                  </button>

                  <button
                    onClick={(e) => note.id && handleArchiveNote(note.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}
                    title="Archive Note"
                  >
                    <Icons.Archive size={15} />
                  </button>

                  {note.id && (
                    <button
                      onClick={(e) => handleDeleteNote(note.id!, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-coral"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}
                      title="Delete Note"
                    >
                      <Icons.Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived section toggle header */}
      {archivedNotes.length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--stroke-2)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => setArchivedExpanded(!archivedExpanded)}
              className="ghost-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                width: 'auto',
                height: 'auto',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Icons.Archive size={14} />
              <span>Archived Notes ({archivedNotes.length})</span>
              {archivedExpanded ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
            </button>
          </div>

          {/* Expanded list of archived notes */}
          {archivedExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {archivedNotes.map(note => {
                const isActive = activeNoteId === note.id;
                const isLockedSession = note.locked && !sessionUnlockedNoteIds.includes(note.id || 0);
                return (
                  <div
                    key={note.id}
                    onClick={() => note.id && handleSelectNote(note.id, note.locked)}
                    className="group"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--card-2)' : 'var(--input-bg)',
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--stroke-2)',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    {/* Left Details */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="font-semibold text-sm text-ink truncate" style={{ maxWidth: '250px' }}>
                          {note.title || 'Untitled Note'}
                        </span>
                        <span className="text-[10px] text-ink-faint">
                          • Archived {note.archivedAt ? new Date(note.archivedAt).toLocaleDateString() : ''}
                        </span>
                        {note.locked && (
                          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }} title="Locked Note">
                            <Icons.Lock size={12} />
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                            Active
                          </span>
                        )}
                      </div>
                      {expandPreviews && (
                        <div className="text-xs text-ink-soft truncate">
                          {isLockedSession ? (
                            <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Locked content — Enter PIN to view</span>
                          ) : (
                            extractPreviewText(note.contentJSON, 150)
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={(e) => note.id && handleToggleLockNote(note.id, note.locked, e)}
                        className={note.locked ? "" : "opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: note.locked ? 'var(--accent)' : 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}
                        title={note.locked ? "Unlock Note" : "Lock Note"}
                      >
                        {note.locked ? <Icons.Lock size={15} /> : <Icons.Unlock size={15} />}
                      </button>

                      <button
                        onClick={(e) => note.id && handleUnarchiveNote(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}
                        title="Unarchive Note"
                      >
                        <Icons.ArchiveRestore size={15} />
                      </button>

                      {note.id && (
                        <button
                          onClick={(e) => handleDeleteNote(note.id!, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-coral"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}
                          title="Delete Note"
                        >
                          <Icons.Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

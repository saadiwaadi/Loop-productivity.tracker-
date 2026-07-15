import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useConfirm } from '../../components/providers/ConfirmProvider';
import NoteEditor from './NoteEditor';
import IdeasCapture from './IdeasCapture';
import NotesSidebar from './NotesSidebar';

export default function NotesView() {
  const confirmDialog = useConfirm();

  // --- DATABASE QUERIES ---
  const notesList = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));

  // --- STATE CONTROLS ---
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [sessionUnlockedNoteIds, setSessionUnlockedNoteIds] = useState<number[]>([]);

  // PIN Modal States
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'set' | 'verify'>('verify');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccessCallback, setPinSuccessCallback] = useState<(() => void) | null>(null);

  // Active Note Query
  const activeNote = notesList.find(n => n.id === activeNoteId);

  // Load first note automatically on start
  useEffect(() => {
    if (notesList.length > 0 && activeNoteId === null) {
      const firstOpenNote = notesList.find(n => !n.archived && (!n.locked || sessionUnlockedNoteIds.includes(n.id || 0)));
      if (firstOpenNote) {
        setActiveNoteId(firstOpenNote.id || null);
      }
    }
  }, [notesList, activeNoteId, sessionUnlockedNoteIds]);

  // --- HANDLERS ---
  const handleNewNote = async () => {
    const id = await db.notes.add({
      title: 'Untitled Note',
      contentJSON: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Untitled Note' }],
          },
          {
            type: 'paragraph',
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setActiveNoteId(id);
  };

  const handleArchiveNote = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.notes.update(id, {
      archived: true,
      archivedAt: new Date(),
    });
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  };

  const handleUnarchiveNote = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.notes.update(id, {
      archived: false,
      archivedAt: null,
    });
  };

  const promptPin = (mode: 'set' | 'verify', callback: () => void) => {
    setPinModalMode(mode);
    setPinInput('');
    setPinError('');
    setPinSuccessCallback(() => callback);
    setPinModalOpen(true);
  };

  const handleToggleLockNote = async (id: number, currentLocked?: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!settings?.notesPin) {
      promptPin('set', async () => {
        await db.notes.update(id, { locked: true });
        if (activeNoteId === id) {
          setActiveNoteId(null);
        }
      });
    } else {
      if (currentLocked) {
        if (sessionUnlockedNoteIds.includes(id)) {
          await db.notes.update(id, { locked: false });
          setSessionUnlockedNoteIds(prev => prev.filter(nid => nid !== id));
        } else {
          promptPin('verify', async () => {
            await db.notes.update(id, { locked: false });
            setSessionUnlockedNoteIds(prev => prev.filter(nid => nid !== id));
          });
        }
      } else {
        await db.notes.update(id, { locked: true });
        setSessionUnlockedNoteIds(prev => prev.filter(nid => nid !== id));
        if (activeNoteId === id) {
          setActiveNoteId(null);
        }
      }
    }
  };

  const handleSelectNote = (noteId: number, isLocked?: boolean) => {
    if (isLocked && !sessionUnlockedNoteIds.includes(noteId)) {
      promptPin('verify', () => {
        setSessionUnlockedNoteIds(prev => [...prev, noteId]);
        setActiveNoteId(noteId);
      });
    } else {
      setActiveNoteId(noteId);
    }
  };

  const handleDeleteNote = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: 'Delete Note',
      message: 'Are you sure you want to delete this note?',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      await db.notes.delete(id);
      if (activeNoteId === id) {
        const remaining = notesList.filter(n => n.id !== id);
        setActiveNoteId(remaining.length > 0 ? (remaining[0].id || null) : null);
      }
    }
  };

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* View Header */}
      <header className="top">
        <div className="hello">
          <h1>Notes &amp; Ideas</h1>
          <p>Draft detailed records or record quick conceptual sparks.</p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="bento">
        {/* LEFT COLUMN: NOTES WRITER (8 columns) */}
        <NoteEditor
          activeNoteId={activeNoteId}
          activeNote={activeNote}
          handleNewNote={handleNewNote}
        />

        {/* RIGHT COLUMN: IDEAS CAPTURE BOARD (4 columns) */}
        <IdeasCapture />

        {/* Saved Notes List Card (Below editor and ideas, spanning full width) */}
        <NotesSidebar
          notesList={notesList}
          activeNoteId={activeNoteId}
          sessionUnlockedNoteIds={sessionUnlockedNoteIds}
          handleSelectNote={handleSelectNote}
          handleToggleLockNote={handleToggleLockNote}
          handleArchiveNote={handleArchiveNote}
          handleUnarchiveNote={handleUnarchiveNote}
          handleDeleteNote={handleDeleteNote}
        />
      </div>

      {/* PIN Setup/Verify Modal */}
      {pinModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--card-1)',
            border: '1px solid var(--stroke-2)',
            borderRadius: '20px',
            padding: '24px',
            width: '320px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent)',
              }}>
                <Icons.Key size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                  {pinModalMode === 'set' ? 'Set Note PIN' : 'Enter PIN'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: 1.3 }}>
                  {pinModalMode === 'set'
                    ? 'Create a PIN to protect your locked notes.'
                    : 'Enter your PIN to access this note.'}
                </p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (pinModalMode === 'set') {
                if (!pinInput.trim()) {
                  setPinError('PIN cannot be empty.');
                  return;
                }
                await db.settings.update(1, { notesPin: pinInput });
                setPinModalOpen(false);
                pinSuccessCallback?.();
              } else {
                if (pinInput === settings?.notesPin) {
                  setPinModalOpen(false);
                  pinSuccessCallback?.();
                } else {
                  setPinError('Incorrect PIN. Please try again.');
                }
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                placeholder="Enter PIN..."
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--input-bg)',
                  border: pinError ? '1px solid var(--coral)' : '1px solid var(--stroke-2)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  textAlign: 'center',
                  letterSpacing: '0.25em',
                  outline: 'none',
                }}
              />

              {pinError && (
                <div style={{ fontSize: '11px', color: 'var(--coral)', textAlign: 'center', fontWeight: 600 }}>
                  {pinError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="ghost-btn"
                  style={{ flex: 1, height: '38px', borderRadius: '12px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  style={{ flex: 1, height: '38px', borderRadius: '12px', fontSize: '13px' }}
                >
                  {pinModalMode === 'set' ? 'Save PIN' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

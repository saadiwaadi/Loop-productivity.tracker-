import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import Card from '../../components/Card';
import { useConfirm } from '../../components/ConfirmProvider';
import CustomSelect from '../../components/CustomSelect';

// Extracted Title Parser
function extractTitle(json: any): string {
  try {
    if (json && json.content && json.content.length > 0) {
      const firstBlock = json.content[0];
      if (firstBlock.content && firstBlock.content.length > 0) {
        return firstBlock.content[0].text || 'Untitled Note';
      }
    }
  } catch (e) {
    // fallback
  }
  return 'Untitled Note';
}

export default function NotesView() {
  const confirmDialog = useConfirm();
  // --- DATABASE QUERIES ---
  const notesList = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) || [];
  const ideasList = useLiveQuery(() => db.ideas.toArray()) || [];

  // --- STATE CONTROLS ---
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [loadedNoteId, setLoadedNoteId] = useState<number | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<any>(null);

  // Ideas State
  const [ideaTag, setIdeaTag] = useState('App');
  const [customTag, setCustomTag] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaBody, setIdeaBody] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

  // Toolbar Button Active States
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isH1, setIsH1] = useState(false);
  const [isH2, setIsH2] = useState(false);
  const [isTaskList, setIsTaskList] = useState(false);
  const [activeFont, setActiveFont] = useState('Sans');
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  // Active Note Query
  const activeNote = notesList.find(n => n.id === activeNoteId);

  // Load first note automatically on start
  useEffect(() => {
    if (notesList.length > 0 && activeNoteId === null) {
      setActiveNoteId(notesList[0].id || null);
    }
  }, [notesList, activeNoteId]);

  // --- TIPTAP EDITOR INITIALIZATION ---
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'todo-line',
        },
      }),
      TextStyle,
      FontFamily,
    ],
    editorProps: {
      attributes: {
        class: 'editor outline-none f-sans',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      if (!activeNoteId) return;

      // Debounce autosave logic (800ms)
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(() => {
        const title = extractTitle(json);
        db.notes.update(activeNoteId, {
          title,
          contentJSON: json,
          updatedAt: new Date(),
        });
      }, 800);
      setSaveTimeout(timeout);
    },
  });

  // Guard: Set content exactly once per note ID shift to avoid resetting cursor/focus
  useEffect(() => {
    if (editor && activeNote) {
      if (loadedNoteId !== activeNote.id) {
        editor.commands.setContent(activeNote.contentJSON || '');
        setLoadedNoteId(activeNote.id ?? null);
      }
    }
  }, [editor, activeNote, loadedNoteId]);

  // Sync Toolbar States on Selection Update
  const updateToolbarStates = () => {
    if (!editor) return;
    setIsBold(editor.isActive('bold'));
    setIsItalic(editor.isActive('italic'));
    setIsH1(editor.isActive('heading', { level: 1 }));
    setIsH2(editor.isActive('heading', { level: 2 }));
    setIsTaskList(editor.isActive('taskList'));

    if (editor.isActive('textStyle', { fontFamily: 'var(--font-serif)' })) {
      setActiveFont('Serif');
    } else if (editor.isActive('textStyle', { fontFamily: 'var(--font-display)' })) {
      setActiveFont('Round');
    } else {
      setActiveFont('Sans');
    }

    const highlights = ['var(--accent)', 'rgba(124,111,240,0.2)', 'rgba(232,168,92,0.2)', 'rgba(87,180,242,0.2)'];
    let foundHl = null;
    for (const hl of highlights) {
      if (editor.isActive('highlight', { color: hl })) {
        foundHl = hl;
        break;
      }
    }
    setActiveHighlight(foundHl);
  };

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', updateToolbarStates);
    editor.on('transaction', updateToolbarStates);
    return () => {
      editor.off('selectionUpdate', updateToolbarStates);
      editor.off('transaction', updateToolbarStates);
    };
  }, [editor]);

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [saveTimeout]);

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
        setLoadedNoteId(null);
      }
    }
  };

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
        {/* LEFT COLUMN: NOTES WRITER & LIST (8 columns) */}
        <Card className="span-8" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', padding: '24px' }}>
          
          {/* Notes Sidebar */}
          <div style={{ borderRight: '1px solid var(--stroke)', paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={handleNewNote} className="btn primary w-full text-xs" style={{ padding: '8px 12px', borderRadius: '12px' }}>
              <Icons.Plus size={14} /> New Note
            </button>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '420px' }}>
              {notesList.length === 0 ? (
                <div className="text-xs text-ink-faint italic p-4 text-center">No notes created.</div>
              ) : (
                notesList.map(note => (
                  <div
                    key={note.id}
                    onClick={() => note.id && setActiveNoteId(note.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: activeNoteId === note.id ? 'var(--card-2)' : 'transparent',
                      border: activeNoteId === note.id ? '1px solid var(--stroke)' : '1px solid transparent',
                      position: 'relative',
                    }}
                    className="group"
                  >
                    <div className="font-semibold text-xs truncate text-ink max-w-[150px]">
                      {note.title || 'Untitled Note'}
                    </div>
                    <div className="text-[10px] text-ink-faint mt-1">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                    {note.id && (
                      <button
                        onClick={(e) => handleDeleteNote(note.id!, e)}
                        className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-coral"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Icons.Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Editor Workstation */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activeNoteId && editor ? (
              <>
                {/* Editor Toolbar */}
                <div className="editor-toolbar">
                  {/* H1, H2, Paragraph */}
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`tb ${isH1 ? 'on' : ''}`}
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`tb ${isH2 ? 'on' : ''}`}
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={`tb ${!isH1 && !isH2 && !isTaskList ? 'on' : ''}`}
                    title="Paragraph"
                  >
                    P
                  </button>

                  <div className="tb-div" />

                  {/* Bold, Italic */}
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`tb ${isBold ? 'on' : ''}`}
                    title="Bold"
                  >
                    <Icons.Bold />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`tb i ${isItalic ? 'on' : ''}`}
                    title="Italic"
                  >
                    <Icons.Italic />
                  </button>

                  {/* Checkbox Task List */}
                  <button
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    className={`tb ${isTaskList ? 'on' : ''}`}
                    title="Task List"
                  >
                    <Icons.ListTodo />
                  </button>

                  <div className="tb-div" />

                  {/* Highlight Color Row */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div
                      onClick={() => editor.chain().focus().toggleHighlight({ color: 'var(--accent)' }).run()}
                      className="hl-swatch"
                      style={{ backgroundColor: 'var(--accent)', border: activeHighlight === 'var(--accent)' ? '2px solid var(--ink)' : undefined }}
                      title="Accent"
                    />
                    <div
                      onClick={() => editor.chain().focus().toggleHighlight({ color: 'rgba(124,111,240,0.2)' }).run()}
                      className="hl-swatch"
                      style={{ backgroundColor: 'var(--violet)', opacity: 0.8, border: activeHighlight === 'rgba(124,111,240,0.2)' ? '2px solid var(--ink)' : undefined }}
                      title="Violet Tint"
                    />
                    <div
                      onClick={() => editor.chain().focus().toggleHighlight({ color: 'rgba(232,168,92,0.2)' }).run()}
                      className="hl-swatch"
                      style={{ backgroundColor: 'var(--coral)', opacity: 0.8, border: activeHighlight === 'rgba(232,168,92,0.2)' ? '2px solid var(--ink)' : undefined }}
                      title="Coral Tint"
                    />
                    <div
                      onClick={() => editor.chain().focus().toggleHighlight({ color: 'rgba(87,180,242,0.2)' }).run()}
                      className="hl-swatch"
                      style={{ backgroundColor: 'var(--sky)', opacity: 0.8, border: activeHighlight === 'rgba(87,180,242,0.2)' ? '2px solid var(--ink)' : undefined }}
                      title="Sky Tint"
                    />
                    <button
                      onClick={() => editor.chain().focus().unsetHighlight().run()}
                      className="ghost-btn"
                      style={{ padding: '4px' }}
                      title="Clear Highlight"
                    >
                      <Icons.Eraser size={14} />
                    </button>
                  </div>

                  <div className="tb-div" />

                  {/* Font Picker */}
                  <div className="font-pick">
                    <button
                      className={activeFont === 'Sans' ? 'on' : ''}
                      onClick={() => editor.chain().focus().setFontFamily('var(--font-body)').run()}
                    >
                      Sans
                    </button>
                    <button
                      className={`f-round ${activeFont === 'Round' ? 'on' : ''}`}
                      onClick={() => editor.chain().focus().setFontFamily('var(--font-display)').run()}
                    >
                      Round
                    </button>
                    <button
                      className={`f-serif ${activeFont === 'Serif' ? 'on' : ''}`}
                      onClick={() => editor.chain().focus().setFontFamily('var(--font-serif)').run()}
                    >
                      Serif
                    </button>
                  </div>
                </div>

                {/* Editor Content Area */}
                <EditorContent editor={editor} style={{ flex: 1, minHeight: '320px' }} />
              </>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-faint)', fontSize: '14px' }}>
                Select or create a note to begin.
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT COLUMN: IDEAS CAPTURE BOARD (4 columns) */}
        <Card className="span-4" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 className="font-display font-black text-xl mb-1">Ideas capture</h2>
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
                    { value: 'App', label: '📱 App' },
                    { value: 'Product', label: '📦 Product' },
                    { value: 'Film', label: '🎬 Film' },
                    { value: 'Brand', label: '✨ Brand' },
                    { value: 'custom', label: '✏️ Custom Tag...' }
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
      </div>
    </motion.div>
  );
}

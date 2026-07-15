import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import Card from '../../components/ui/Card';

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

interface NoteEditorProps {
  activeNoteId: number | null;
  activeNote: any;
  handleNewNote: () => void;
}

export default function NoteEditor({ activeNoteId, activeNote, handleNewNote }: NoteEditorProps) {
  const [loadedNoteId, setLoadedNoteId] = useState<number | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<any>(null);

  // Toolbar Button Active States
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isH1, setIsH1] = useState(false);
  const [isH2, setIsH2] = useState(false);
  const [isTaskList, setIsTaskList] = useState(false);
  const [activeFont, setActiveFont] = useState('Sans');
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

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
  }, [activeNoteId]); // Recreate or update on activeNoteId change

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

  return (
    <Card className="span-8" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display font-bold text-xl mb-1">
            {activeNote ? activeNote.title : 'Write a note'}
          </h2>
          <p className="text-xs text-ink-soft">
            {activeNote ? 'Editing draft (Auto-saves changes)' : 'Create or select a note to start writing.'}
          </p>
        </div>
        <button onClick={handleNewNote} className="btn primary text-xs" style={{ padding: '8px 16px', borderRadius: '12px' }}>
          <Icons.Plus size={14} /> New Note
        </button>
      </div>

      {/* Editor Workstation */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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

            {/* Editor Content Area (Resizable) */}
            <div style={{
              flex: 1,
              minHeight: '320px',
              resize: 'vertical',
              overflow: 'auto',
              border: '1px solid var(--stroke-2)',
              borderRadius: '12px',
              padding: '14px',
              background: 'var(--input-bg)',
              marginTop: '12px',
            }}>
              <EditorContent editor={editor} />
            </div>
          </>
        ) : (
          <div style={{ height: '320px', display: 'grid', placeItems: 'center', color: 'var(--ink-faint)', fontSize: '14px', border: '1px dashed var(--stroke-2)', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Icons.FileText size={48} className="text-ink-faint" />
              <span>No note active. Click "New Note" or select a saved note below to begin.</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

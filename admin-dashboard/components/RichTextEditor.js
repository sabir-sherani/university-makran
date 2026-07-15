import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

function AlignLeftIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="currentColor">
      <rect x="0" y="0" width="13" height="2" rx="1"/><rect x="0" y="4" width="9" height="2" rx="1"/>
      <rect x="0" y="8" width="13" height="2" rx="1"/><rect x="0" y="12" width="7" height="2" rx="1"/>
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="currentColor">
      <rect x="0" y="0" width="13" height="2" rx="1"/><rect x="2" y="4" width="9" height="2" rx="1"/>
      <rect x="0" y="8" width="13" height="2" rx="1"/><rect x="3" y="12" width="7" height="2" rx="1"/>
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="currentColor">
      <rect x="0" y="0" width="13" height="2" rx="1"/><rect x="4" y="4" width="9" height="2" rx="1"/>
      <rect x="0" y="8" width="13" height="2" rx="1"/><rect x="6" y="12" width="7" height="2" rx="1"/>
    </svg>
  );
}
function AlignJustifyIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="currentColor">
      <rect x="0" y="0" width="13" height="2" rx="1"/><rect x="0" y="4" width="13" height="2" rx="1"/>
      <rect x="0" y="8" width="13" height="2" rx="1"/><rect x="0" y="12" width="13" height="2" rx="1"/>
    </svg>
  );
}

function Btn({ onMouseDown, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

// extended=true enables bullet list, ordered list
export default function RichTextEditor({ value, onChange, placeholder = 'Write here...', extended = false }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading:      false,
        bulletList:   extended ? undefined : false,
        orderedList:  extended ? undefined : false,
        blockquote:   false,
        code:         false,
        codeBlock:    false,
      }),
      Underline,
      TextAlign.configure({ types: ['paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'min-h-[100px] p-3 text-sm text-gray-700 outline-none leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current  = editor.getHTML();
    const incoming = value || '';
    if (current !== incoming && !(current === '<p></p>' && incoming === '')) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const exec = (fn) => (e) => { e.preventDefault(); fn(); };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <Btn title="Bold" active={editor.isActive('bold')}
          onMouseDown={exec(() => editor.chain().focus().toggleBold().run())}>
          <strong>B</strong>
        </Btn>
        <Btn title="Italic" active={editor.isActive('italic')}
          onMouseDown={exec(() => editor.chain().focus().toggleItalic().run())}>
          <em>I</em>
        </Btn>
        <Btn title="Underline" active={editor.isActive('underline')}
          onMouseDown={exec(() => editor.chain().focus().toggleUnderline().run())}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </Btn>

        {extended && (
          <>
            <span className="w-px h-5 bg-gray-200 mx-0.5" />
            <Btn title="Bullet list" active={editor.isActive('bulletList')}
              onMouseDown={exec(() => editor.chain().focus().toggleBulletList().run())}>
              <span className="text-xs leading-none">•≡</span>
            </Btn>
            <Btn title="Ordered list" active={editor.isActive('orderedList')}
              onMouseDown={exec(() => editor.chain().focus().toggleOrderedList().run())}>
              <span className="text-xs leading-none">1≡</span>
            </Btn>
          </>
        )}

        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <Btn title="Align Left" active={editor.isActive({ textAlign: 'left' })}
          onMouseDown={exec(() => editor.chain().focus().setTextAlign('left').run())}>
          <AlignLeftIcon />
        </Btn>
        <Btn title="Align Center" active={editor.isActive({ textAlign: 'center' })}
          onMouseDown={exec(() => editor.chain().focus().setTextAlign('center').run())}>
          <AlignCenterIcon />
        </Btn>
        <Btn title="Align Right" active={editor.isActive({ textAlign: 'right' })}
          onMouseDown={exec(() => editor.chain().focus().setTextAlign('right').run())}>
          <AlignRightIcon />
        </Btn>
        <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })}
          onMouseDown={exec(() => editor.chain().focus().setTextAlign('justify').run())}>
          <AlignJustifyIcon />
        </Btn>

        <span className="w-px h-5 bg-gray-200 mx-0.5" />
        <Btn title="Clear formatting" active={false}
          onMouseDown={exec(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>
          <span className="text-xs leading-none">Tx</span>
        </Btn>
      </div>

      {/* Editor */}
      <div className="bg-white relative">
        {editor.isEmpty && (
          <p className="absolute top-3 left-3 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror { outline: none; }
        .ProseMirror p { margin: 0 0 0.3rem 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror u { text-decoration: underline; }
        .ProseMirror ul { list-style: disc; padding-left: 1.4rem; margin: 0.25rem 0; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.4rem; margin: 0.25rem 0; }
        .ProseMirror li { margin-bottom: 0.15rem; }
        .ProseMirror p[style*="text-align: center"] { text-align: center; }
        .ProseMirror p[style*="text-align: right"] { text-align: right; }
        .ProseMirror p[style*="text-align: justify"] { text-align: justify; }
      `}</style>
    </div>
  );
}

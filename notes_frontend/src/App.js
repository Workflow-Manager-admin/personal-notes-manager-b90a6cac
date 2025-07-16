import React, { useEffect, useState } from 'react';
import './App.css';

// API endpoint for notes
const API_BASE = 'http://localhost:3001/notes/';

// Color theme from requirements
const THEME = {
  primary: '#2563eb',   // blue
  secondary: '#64748b', // slate/gray
  accent: '#f59e42'     // orange
};

/**
 * Minimalistic button component
 */
function Button({ children, onClick, type = 'button', style = {}, ...props }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        background: THEME.primary,
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '7px 15px',
        fontWeight: 500,
        cursor: 'pointer',
        margin: 2,
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Sidebar: List of notes
 */
function Sidebar({ notes, selectedId, onSelect, onCreate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Notes</span>
        <Button style={{ background: THEME.accent, color: '#222', fontWeight: 600, fontSize: 18 }} onClick={onCreate} aria-label="Create New Note">+</Button>
      </div>
      <ul className="notes-list" data-testid="notes-list">
        {notes.map(note => (
          <li
            key={note.id}
            className={`note-list-item${note.id === selectedId ? ' selected' : ''}`}
            onClick={() => onSelect(note.id)}
            tabIndex={0}
            aria-label={`Note: ${note.title}`}
          >
            <strong>{note.title || <em>Untitled</em>}</strong>
            <div className="note-list-meta" title={note.updated_at ? `Last updated: ${new Date(note.updated_at).toLocaleString()}` : ''} >
              {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : ''}
            </div>
          </li>
        ))}
        {notes.length === 0 && (
          <div className="empty-state">No notes yet.</div>
        )}
      </ul>
    </aside>
  );
}

/**
 * Main area: View/edit/create a note
 */
function NoteMain({
  note,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  error
}) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');

  // Reset the form when note changes (viewing different note)
  useEffect(() => {
    setTitle(note?.title || '');
    setContent(note?.content || '');
  }, [note?.id]);

  if (!note) {
    return <main className="main-area"><div className="empty-state">Select a note or create a new one.</div></main>;
  }

  if (isEditing) {
    return (
      <main className="main-area">
        <form
          className="note-form"
          onSubmit={(e) => { e.preventDefault(); onSave(title, content); }}
          aria-label="Edit Note"
        >
          <input
            className="note-title-input"
            value={title}
            placeholder="Title"
            maxLength={100}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
            aria-label="Note title"
          />
          <textarea
            className="note-content-input"
            value={content}
            placeholder="Content"
            rows={10}
            maxLength={10000}
            onChange={e => setContent(e.target.value)}
            required
            aria-label="Note content"
          />
          {error && <div className="error">{error}</div>}
          <div style={{marginTop: '1em'}}>
            <Button type="submit" style={{marginRight:4, background: THEME.primary}}>Save</Button>
            <Button onClick={onCancel} style={{background: THEME.secondary}}>Cancel</Button>
          </div>
        </form>
      </main>
    );
  }

  // Viewing note
  return (
    <main className="main-area">
      <div className="note-view" tabIndex={0}>
        <h2 style={{color: THEME.primary, margin: 0}}>{note.title}</h2>
        {note.content ? <pre className="note-preview">{note.content}</pre> : <em>This note is empty.</em>}
        <div className="note-actions">
          <Button onClick={onEdit} style={{ background: THEME.primary, marginRight: 10 }}>Edit</Button>
          <Button onClick={onDelete} style={{ background: THEME.accent, color: '#222' }}>Delete</Button>
        </div>
      </div>
    </main>
  );
}

// PUBLIC_INTERFACE
/**
 * Main App component
 */
export default function App() {
  // Note list and currently selected note
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [forceReload, setForceReload] = useState(0); // triggers reload after add/update/delete

  // Fetch list of notes on load and whenever reload flag changes
  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('Failed to fetch notes');
        const data = await res.json();
        setNotes(data);
        // If we just deleted the selected note, clear the selection:
        if (selectedId && data.findIndex(n=>n.id===selectedId)<0) setSelectedId(null);
      } catch (err) {
        setError('Could not fetch notes.');
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [forceReload]);

  // Selected note
  const note = notes.find(n => n.id === selectedId);

  // Create new note
  async function handleCreate() {
    setEditMode(true);
    setSelectedId('new');
  }

  // Save new or edited note
  async function handleSave(title, content) {
    setError('');
    try {
      if (selectedId === 'new') {
        // Create new note
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content })
        });
        if (res.status === 201) {
          setEditMode(false);
          setForceReload(f => f + 1);
          setSelectedId(null); // Will select after refresh
        } else {
          throw new Error('Could not create note');
        }
      } else if (note) {
        // Update existing note
        const res = await fetch(`${API_BASE}${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content })
        });
        if (res.ok) {
          setEditMode(false);
          setForceReload(f => f + 1);
        } else {
          throw new Error('Could not update note');
        }
      }
    } catch (e) {
      setError(e.message || 'Error saving note');
    }
  }

  // Edit note
  function handleEdit() {
    setEditMode(true);
  }

  // Cancel editing
  function handleCancel() {
    setEditMode(false);
    setError('');
    // If cancelling new note, restore selection
    if (selectedId === 'new') setSelectedId(null);
  }

  // Delete note
  async function handleDelete() {
    if (!note || !window.confirm('Delete this note?')) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}${note.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEditMode(false);
      setSelectedId(null);
      setForceReload(f => f + 1);
    } catch (e) {
      setError('Could not delete note.');
    }
  }

  // Select note from sidebar
  function handleSelect(id) {
    setSelectedId(id);
    setEditMode(false);
    setError('');
  }

  // App Header
  function Header() {
    return (
      <header className="app-header" style={{
        background: THEME.primary,
        color: '#fff',
        padding: '18px 20px',
        letterSpacing: "0.01em",
        fontWeight: 700,
        fontSize: 24,
        boxShadow: '0 2px 4px rgba(80,99,140,0.09)'
      }}>
        <span style={{color:'#fff'}}>📝 Personal Notes</span>
      </header>
    );
  }

  return (
    <div className="app-container" data-theme="light">
      <Header />
      <div className="main-layout">
        <Sidebar
          notes={notes}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
        <section className="main-section">
          {loading && <div className="loading">Loading...</div>}
          <NoteMain
            note={selectedId === 'new'
              ? { title: '', content: '' }
              : note}
            isEditing={editMode || selectedId === 'new'}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSave={handleSave}
            onCancel={handleCancel}
            error={error}
          />
        </section>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Task = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiRaw, setAiRaw] = useState('');
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await axios.get('http://localhost:3001/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  }

  async function sendPrompt() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/mcp/create', { prompt });

      if (res.data && res.data.error) {
        alert('AI error: ' + (res.data.error || 'unknown'));
        console.error('AI raw:', res.data.raw);
      }

      // show AI message (human-facing) and raw text if provided
      // prefer `assistant` (adapter for VS Code / clients expecting a plain string)
      setAiMessage(res.data?.message || res.data?.assistant || '');
      setAiRaw(res.data?.raw || '');

      // If the MCP returned a `listed` array, show only those tasks in the UI.
      // Otherwise refresh the full tasks list (useful for create/update/delete actions).
      if (Array.isArray(res.data?.listed) && res.data.listed.length > 0) {
        setTasks(res.data.listed);
      } else {
        await fetchTasks();
      }

      setPrompt('');
    } catch (err) {
      console.error(err);
      alert('Failed to send prompt to MCP server. See console for details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>MCP Todo</h1>

      {/* Prompt-driven UI: users control tasks only via instructions here */}
      <div className="input-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type an instruction for the todo list (e.g. 'Create 3 tasks to organize my desk')"
          disabled={loading}
        />
        <button onClick={sendPrompt} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* AI human-facing message */}
      {aiMessage ? (
        <div style={{ marginTop: 12, padding: 12, background: '#eef6ff', borderRadius: 6 }}>
          <strong>AI message:</strong>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{aiMessage}</div>
        </div>
      ) : null}

      {/* AI raw text for inspection */}
      {aiRaw ? (
        <div style={{ marginTop: 12, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
          <strong>AI response (raw):</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, marginBottom: 0 }}>{aiRaw}</pre>
        </div>
      ) : null}

      <ul style={{ marginTop: 12 }}>
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? 'done' : ''}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input type="checkbox" checked={task.done} readOnly />
                <span>{task.title}</span>
              </label>

              <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
                <div>
                  ID:{' '}
                  <code style={{ fontSize: 11, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>
                    {task.id}
                  </code>
                </div>
                <div>Status: {task.done ? 'Done' : 'Not done'}</div>
                <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

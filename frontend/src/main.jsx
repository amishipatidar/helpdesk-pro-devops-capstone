import React, { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = '/api';

const CATEGORIES = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS', 'TECHNICAL', 'BILLING'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester: 'Support User',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    status: 'OPEN',
  });

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/tickets/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats failure will be reflected in main fetch
    }
  };

  const fetchTickets = async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedPriority !== 'ALL') params.append('priority', selectedPriority);

      const queryString = params.toString();
      const url = `${API_BASE}/tickets${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setTickets(data);
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to connect to HelpDesk Pro backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedStatus, selectedCategory, selectedPriority]);

  const handleOpenCreateModal = () => {
    setEditingTicket(null);
    setFormData({
      title: '',
      description: '',
      requester: 'Support User',
      category: 'TECHNICAL',
      priority: 'MEDIUM',
      status: 'OPEN',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      requester: ticket.requester,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      let res;
      if (editingTicket) {
        res = await fetch(`${API_BASE}/tickets/${editingTicket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch(`${API_BASE}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save ticket');
      }

      setIsModalOpen(false);
      setEditingTicket(null);
      await fetchTickets();
    } catch (err) {
      alert(`Error saving ticket: ${err.message}`);
    }
  };

  const handleAdvanceStatus = async (ticket) => {
    const statusCycle = {
      OPEN: 'IN_PROGRESS',
      IN_PROGRESS: 'RESOLVED',
      RESOLVED: 'CLOSED',
      CLOSED: 'OPEN',
    };
    const nextStatus = statusCycle[ticket.status] || 'OPEN';

    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchTickets();
      }
    } catch (err) {
      console.error('Failed to advance status', err);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm(`Are you sure you want to delete ticket #${ticketId}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        if (viewingTicket?.id === ticketId) setViewingTicket(null);
        await fetchTickets();
      } else {
        alert('Could not delete ticket.');
      }
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <div>
            <div className="brand-title">HelpDesk Pro</div>
            <div className="brand-subtitle">DevOps Final Capstone</div>
          </div>
        </div>

        <nav className="nav-menu">
          <div className="nav-item active">
            <span>📊</span>
            <span>Dashboard</span>
          </div>
          <div className="nav-item" onClick={() => { setSelectedPriority('CRITICAL'); setSelectedStatus('ALL'); }}>
            <span>🚨</span>
            <span>Critical Queue ({stats.critical})</span>
          </div>
          <div className="nav-item" onClick={() => { setSelectedStatus('OPEN'); setSelectedPriority('ALL'); }}>
            <span>📬</span>
            <span>Open Tickets ({stats.open})</span>
          </div>
          <div className="nav-item" onClick={() => { setSelectedStatus('RESOLVED'); setSelectedPriority('ALL'); }}>
            <span>✅</span>
            <span>Resolved</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="system-badge">
            <div className="system-badge-header">
              <span className="live-indicator"></span>
              <span>EKS Cluster / ap-south-1</span>
            </div>
            <p>Prometheus Scrape: Active</p>
            <p>Readiness Gate: Verified</p>
          </div>

          <div className="user-profile">
            <div className="user-avatar">NR</div>
            <div className="user-info">
              <div className="user-name">Nile Rodgers</div>
              <div className="user-role">DevOps Engineer</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <div className="breadcrumb">WORKSPACE / SERVICE DESK</div>
            <h1 className="page-title">Support Operations Center</h1>
            <p className="page-subtitle">
              Monitor, triage, and resolve incoming service tickets across your organization.
            </p>
          </div>
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={fetchTickets}>
              ↻ Refresh
            </button>
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              ＋ New Ticket
            </button>
          </div>
        </header>

        {error && (
          <div className="alert-box">
            <div>
              <strong>Service Alert:</strong> {error}. Ensure backend container and PostgreSQL are running.
            </div>
            <button className="btn btn-sm btn-secondary" onClick={fetchTickets}>
              Retry Connection
            </button>
          </div>
        )}

        {/* KPI Grid */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon total">📋</div>
            <div className="kpi-info">
              <span className="kpi-label">Total Tickets</span>
              <span className="kpi-value">{stats.total}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon open">📬</div>
            <div className="kpi-info">
              <span className="kpi-label">Open Tickets</span>
              <span className="kpi-value">{stats.open}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon progress">⚙️</div>
            <div className="kpi-info">
              <span className="kpi-label">In Progress</span>
              <span className="kpi-value">{stats.inProgress}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon resolved">✅</div>
            <div className="kpi-info">
              <span className="kpi-label">Resolved / Closed</span>
              <span className="kpi-value">{stats.resolved}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon critical">🚨</div>
            <div className="kpi-info">
              <span className="kpi-label">Critical Priority</span>
              <span className="kpi-value">{stats.critical}</span>
            </div>
          </div>
        </section>

        {/* Toolbar & Filters */}
        <section className="toolbar-panel">
          <div className="toolbar-row">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by ticket title, requester, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-dropdowns">
              <select
                className="filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
              >
                <option value="ALL">All Priorities</option>
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>
                    {pri} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="status-tabs">
            {['ALL', ...STATUSES].map((st) => (
              <button
                key={st}
                className={`status-tab ${selectedStatus === st ? 'active' : ''}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </section>

        {/* Tickets Table */}
        <section className="table-panel">
          {loading ? (
            <div className="state-message">
              <div className="state-icon">⏳</div>
              <div className="state-title">Loading support tickets...</div>
              <div className="state-subtitle">Connecting to HelpDesk Pro REST API</div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="state-message">
              <div className="state-icon">📭</div>
              <div className="state-title">No tickets match your filters</div>
              <div className="state-subtitle">
                Try clearing your search term or create a new support ticket above.
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ticket / Requester</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="ticket-id">#{t.id}</td>
                      <td>
                        <div className="ticket-title-wrap">
                          <span
                            className="ticket-title-text"
                            onClick={() => setViewingTicket(t)}
                            title="Click to view details"
                          >
                            {t.title}
                          </span>
                          <span className="ticket-desc-snippet">{t.description || 'No description provided'}</span>
                          <span className="ticket-requester">👤 {t.requester}</span>
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">{t.category}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${t.status.toLowerCase()}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                        {new Date(t.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="icon-button advance"
                            onClick={() => handleAdvanceStatus(t)}
                            title="Advance Status"
                          >
                            ↻
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => handleOpenEditModal(t)}
                            title="Edit Ticket"
                          >
                            ✎
                          </button>
                          <button
                            className="icon-button delete"
                            onClick={() => handleDeleteTicket(t.id)}
                            title="Delete Ticket"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTicket ? 'Edit Ticket' : 'Create Support Ticket'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitForm}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject / Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. VPN gateway disconnects unexpectedly"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe symptoms, error logs, and reproduction steps..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Requester Name / Email *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.requester}
                      onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      {PRIORITIES.map((pri) => (
                        <option key={pri} value={pri}>
                          {pri}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTicket ? 'Save Changes' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Drawer / Modal */}
      {viewingTicket && (
        <div className="modal-overlay" onClick={() => setViewingTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ticket Details #{viewingTicket.id}</h2>
              <button className="modal-close" onClick={() => setViewingTicket(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{viewingTicket.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                  {viewingTicket.description || 'No detailed description provided.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                <div>
                  <span className="form-label">Requester</span>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{viewingTicket.requester}</div>
                </div>
                <div>
                  <span className="form-label">Category</span>
                  <div><span className="category-tag">{viewingTicket.category}</span></div>
                </div>
                <div>
                  <span className="form-label">Priority</span>
                  <div>
                    <span className={`badge badge-${viewingTicket.priority.toLowerCase()}`}>
                      {viewingTicket.priority}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="form-label">Status</span>
                  <div>
                    <span className={`badge badge-${viewingTicket.status.toLowerCase()}`}>
                      {viewingTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '11px', color: 'var(--text-dim)' }}>
                <div>Created: {new Date(viewingTicket.created_at).toLocaleString()}</div>
                <div>Last Updated: {new Date(viewingTicket.updated_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const t = viewingTicket;
                  setViewingTicket(null);
                  handleOpenEditModal(t);
                }}
              >
                ✎ Edit Ticket
              </button>
              <button className="btn btn-primary" onClick={() => setViewingTicket(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);

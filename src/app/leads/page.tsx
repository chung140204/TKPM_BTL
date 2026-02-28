'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lead {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    leadStatus: string;
    notes?: string;
    createdAt: string;
    interactions?: { id: string; subject: string; createdAt: string }[];
}

const STAGES = [
    { key: 'NEW', label: 'New', color: 'blue', icon: '🆕' },
    { key: 'CONTACTED', label: 'Contacted', color: 'teal', icon: '📞' },
    { key: 'VIEWING_SCHEDULED', label: 'Viewing', color: 'amber', icon: '👁️' },
    { key: 'NEGOTIATING', label: 'Negotiating', color: 'purple', icon: '🤝' },
    { key: 'CONVERTED', label: 'Converted', color: 'emerald', icon: '✅' },
    { key: 'LOST', label: 'Lost', color: 'rose', icon: '❌' },
];

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newLead, setNewLead] = useState({
        name: '',
        email: '',
        phone: '',
        leadStatus: 'NEW',
        notes: '',
    });
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        fetchLeads();
    }, []);

    async function fetchLeads() {
        const res = await fetch('/api/persons?role=LEAD');
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await fetch('/api/persons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newLead, role: 'LEAD' }),
            });
            setShowCreateModal(false);
            setNewLead({ name: '', email: '', phone: '', leadStatus: 'NEW', notes: '' });
            setToastMsg('Lead created!');
            fetchLeads();
            setTimeout(() => setToastMsg(''), 3000);
        } catch (err) {
            console.error(err);
        }
    }

    async function moveStatus(leadId: string, newStatus: string) {
        try {
            await fetch(`/api/persons/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadStatus: newStatus }),
            });
            fetchLeads();
        } catch (err) {
            console.error(err);
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getLeadsByStage(stageKey: string) {
        return leads.filter((l) => l.leadStatus === stageKey);
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Lead Pipeline</h1>
                    <p>Track prospects from first contact to conversion</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    ➕ New Lead
                </button>
            </div>

            <div className="kanban-board">
                {STAGES.map((stage) => {
                    const stageLeads = getLeadsByStage(stage.key);
                    return (
                        <div key={stage.key} className="kanban-column">
                            <div className="kanban-column-header">
                                <h3>
                                    {stage.icon} {stage.label}
                                    <span className="count">{stageLeads.length}</span>
                                </h3>
                            </div>
                            <div className="kanban-cards">
                                {stageLeads.map((lead) => (
                                    <div key={lead.id} className="kanban-card">
                                        <div className="lead-name">{lead.name}</div>
                                        <div className="lead-info">
                                            {lead.email && <span>📧 {lead.email}</span>}
                                            {lead.phone && <span>📱 {lead.phone}</span>}
                                        </div>
                                        {lead.notes && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                                                {lead.notes.length > 60 ? lead.notes.slice(0, 60) + '...' : lead.notes}
                                            </div>
                                        )}
                                        <div className="lead-meta">
                                            <span>{formatDate(lead.createdAt)}</span>
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                <Link href={`/leads/${lead.id}`} className="btn btn-sm btn-secondary" title="View Details">👁️</Link>
                                                {stage.key !== 'CONVERTED' && stage.key !== 'LOST' && (
                                                    <>
                                                        {STAGES.indexOf(stage) < 4 && (
                                                            <button
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => moveStatus(lead.id, STAGES[STAGES.indexOf(stage) + 1].key)}
                                                                title={`Move to ${STAGES[STAGES.indexOf(stage) + 1].label}`}
                                                            >
                                                                →
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => moveStatus(lead.id, 'LOST')}
                                                            title="Mark as Lost"
                                                            style={{ color: 'var(--accent-rose)' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {stageLeads.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        No leads
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New Lead</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Full name"
                                        value={newLead.name}
                                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            className="form-input"
                                            type="email"
                                            placeholder="email@example.com"
                                            value={newLead.email}
                                            onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            className="form-input"
                                            placeholder="+66..."
                                            value={newLead.phone}
                                            onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Initial Status</label>
                                    <select
                                        className="form-select"
                                        value={newLead.leadStatus}
                                        onChange={(e) => setNewLead({ ...newLead, leadStatus: e.target.value })}
                                    >
                                        {STAGES.map((s) => (
                                            <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Additional notes about this lead..."
                                        value={newLead.notes}
                                        onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}

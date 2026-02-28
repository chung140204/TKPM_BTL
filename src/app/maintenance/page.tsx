'use client';

import { useState, useEffect } from 'react';

interface MaintenanceTicket {
    id: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: string;
    room: {
        number: string;
        building: { name: string };
    };
    reportedBy: {
        name: string;
    };
    createdAt: string;
}

interface Room {
    id: string;
    number: string;
    building: { name: string };
}

interface Person {
    id: string;
    name: string;
}

export default function MaintenancePage() {
    const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTicket, setNewTicket] = useState({
        roomId: '',
        reportedById: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
    });
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        fetchTickets();
        fetchRooms();
        fetchPersons();
    }, []);

    async function fetchTickets() {
        const res = await fetch('/api/maintenance');
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
    }

    async function fetchRooms() {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
    }

    async function fetchPersons() {
        const res = await fetch('/api/persons');
        const data = await res.json();
        setPersons(Array.isArray(data) ? data : []);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTicket),
            });
            if (res.ok) {
                setShowCreateModal(false);
                setNewTicket({ roomId: '', reportedById: '', title: '', description: '', priority: 'MEDIUM' });
                setToastMsg('Maintenance ticket created!');
                fetchTickets();
                setTimeout(() => setToastMsg(''), 3000);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function getPriorityColor(priority: string) {
        switch (priority) {
            case 'URGENT': return 'rose';
            case 'HIGH': return 'amber';
            case 'MEDIUM': return 'blue';
            case 'LOW': return 'teal';
            default: return 'blue';
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Maintenance & Repairs</h1>
                    <p>Track and resolve property infrastructure issues</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    🔧 New Ticket
                </button>
            </div>

            <div className="card-container">
                {tickets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔧</div>
                        <h3>No tickets found</h3>
                        <p>Create a maintenance ticket to start tracking repairs.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ticket Info</th>
                                    <th>Location</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Reported By</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{ticket.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {ticket.description}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{ticket.room.number}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.room.building.name}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge blue">{ticket.status}</span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{ticket.reportedBy.name}</td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(ticket.createdAt)}</td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary">Manage</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Submit Maintenance Ticket</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Brief summary of the issue"
                                        value={newTicket.title}
                                        onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Room *</label>
                                        <select
                                            className="form-select"
                                            value={newTicket.roomId}
                                            onChange={(e) => setNewTicket({ ...newTicket, roomId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a room...</option>
                                            {rooms.map((r) => (
                                                <option key={r.id} value={r.id}>{r.building.name} - {r.number}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Reported By *</label>
                                        <select
                                            className="form-select"
                                            value={newTicket.reportedById}
                                            onChange={(e) => setNewTicket({ ...newTicket, reportedById: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a person...</option>
                                            {persons.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        className="form-select"
                                        value={newTicket.priority}
                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Detailed description of the problem..."
                                        value={newTicket.description}
                                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}

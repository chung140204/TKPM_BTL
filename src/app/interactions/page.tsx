'use client';

import { useState, useEffect } from 'react';

interface Person {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

interface Room {
    id: string;
    number: string;
    building: { name: string };
}

interface Interaction {
    id: string;
    personId: string;
    person: Person;
    roomId?: string;
    room?: Room | null;
    contractId?: string;
    channel: string;
    direction: string;
    subject: string;
    content: string;
    tags: string;
    createdAt: string;
}

export default function InteractionsPage() {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [channelFilter, setChannelFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newInteraction, setNewInteraction] = useState({
        personId: '',
        roomId: '',
        channel: 'PHONE',
        direction: 'INBOUND',
        subject: '',
        content: '',
        tags: '',
    });
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        fetchInteractions();
        fetchPersons();
        fetchRooms();
    }, []);

    async function fetchInteractions() {
        const res = await fetch('/api/interactions');
        const data = await res.json();
        setInteractions(Array.isArray(data) ? data : []);
    }

    async function fetchPersons() {
        const res = await fetch('/api/persons');
        const data = await res.json();
        setPersons(Array.isArray(data) ? data : []);
    }

    async function fetchRooms() {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInteraction),
            });
            setShowCreateModal(false);
            setNewInteraction({ personId: '', roomId: '', channel: 'PHONE', direction: 'INBOUND', subject: '', content: '', tags: '' });
            setToastMsg('Interaction created!');
            fetchInteractions();
            setTimeout(() => setToastMsg(''), 3000);
        } catch (err) {
            console.error(err);
        }
    }

    function getChannelIcon(channel: string) {
        switch (channel) {
            case 'PHONE': return '📞';
            case 'EMAIL': return '📧';
            case 'CHAT': return '💬';
            case 'WALK_IN': return '🚶';
            case 'SMS': return '📱';
            case 'LINE': return '💚';
            default: return '📝';
        }
    }

    function formatDate(dateStr: string) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const channels = ['ALL', 'PHONE', 'EMAIL', 'CHAT', 'WALK_IN', 'SMS', 'LINE'];

    const filtered = interactions.filter((inter) => {
        if (channelFilter !== 'ALL' && inter.channel !== channelFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                inter.person.name.toLowerCase().includes(q) ||
                inter.subject.toLowerCase().includes(q) ||
                inter.content.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Unified Interaction Hub</h1>
                    <p>Every communication linked to Person → Room → Contract</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    ➕ New Interaction
                </button>
            </div>

            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        className="search-input"
                        placeholder="Search interactions by person, subject, or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="tabs">
                {channels.map((ch) => (
                    <button
                        key={ch}
                        className={`tab ${channelFilter === ch ? 'active' : ''}`}
                        onClick={() => setChannelFilter(ch)}
                    >
                        {ch === 'ALL' ? 'All' : `${getChannelIcon(ch)} ${ch.replace('_', ' ')}`}
                    </button>
                ))}
            </div>

            <div className="interaction-feed">
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <h3>No interactions found</h3>
                        <p>Create a new interaction or seed demo data from the Dashboard.</p>
                    </div>
                ) : (
                    filtered.map((inter) => (
                        <div key={inter.id} className="interaction-item">
                            <div className={`interaction-avatar ${inter.channel.toLowerCase().replace('_', '-')}`}>
                                {getChannelIcon(inter.channel)}
                            </div>
                            <div className="interaction-body">
                                <div className="interaction-header-row">
                                    <span className="person-name">{inter.person.name}</span>
                                    <span className="time">{formatDate(inter.createdAt)}</span>
                                </div>
                                <div className="subject">
                                    <strong>{inter.subject}</strong>
                                    {inter.room && (
                                        <span style={{ marginLeft: 8 }}>
                                            <span className="badge teal" style={{ marginLeft: 4 }}>
                                                🏠 {inter.room.building.name} - {inter.room.number}
                                            </span>
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {inter.content.length > 120 ? inter.content.slice(0, 120) + '...' : inter.content}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                                    <span className="badge blue">{inter.direction}</span>
                                    {inter.tags && inter.tags.split(',').filter(Boolean).map((tag, i) => (
                                        <span key={i} className="badge purple">{tag.trim()}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New Interaction</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Person *</label>
                                    <select
                                        className="form-select"
                                        value={newInteraction.personId}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, personId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select a person...</option>
                                        {persons.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.email || p.phone || 'No contact'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Room (optional)</label>
                                    <select
                                        className="form-select"
                                        value={newInteraction.roomId}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, roomId: e.target.value })}
                                    >
                                        <option value="">No room linked</option>
                                        {rooms.map((r) => (
                                            <option key={r.id} value={r.id}>{r.building.name} - Room {r.number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Channel</label>
                                        <select
                                            className="form-select"
                                            value={newInteraction.channel}
                                            onChange={(e) => setNewInteraction({ ...newInteraction, channel: e.target.value })}
                                        >
                                            <option value="PHONE">📞 Phone</option>
                                            <option value="EMAIL">📧 Email</option>
                                            <option value="CHAT">💬 Chat</option>
                                            <option value="WALK_IN">🚶 Walk-in</option>
                                            <option value="SMS">📱 SMS</option>
                                            <option value="LINE">💚 LINE</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Direction</label>
                                        <select
                                            className="form-select"
                                            value={newInteraction.direction}
                                            onChange={(e) => setNewInteraction({ ...newInteraction, direction: e.target.value })}
                                        >
                                            <option value="INBOUND">Inbound</option>
                                            <option value="OUTBOUND">Outbound</option>
                                            <option value="INTERNAL">Internal</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Subject *</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. Inquiry about Room 301"
                                        value={newInteraction.subject}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, subject: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Content *</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Interaction details..."
                                        value={newInteraction.content}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tags (comma-separated)</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. follow-up, pricing, viewing"
                                        value={newInteraction.tags}
                                        onChange={(e) => setNewInteraction({ ...newInteraction, tags: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Interaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}

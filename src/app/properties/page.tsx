'use client';

import { useState, useEffect } from 'react';

interface Property {
    id: string;
    name: string;
    address: string;
    type: string;
    buildings: {
        id: string;
        name: string;
        floors: number;
        _count?: { rooms: number };
        rooms: { id: string; status: string }[];
    }[];
    createdAt: string;
}

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProperty, setNewProperty] = useState({
        name: '',
        address: '',
        type: 'RESIDENTIAL',
    });
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        fetchProperties();
    }, []);

    async function fetchProperties() {
        const res = await fetch('/api/properties');
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : []);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await fetch('/api/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProperty),
            });
            setShowCreateModal(false);
            setNewProperty({ name: '', address: '', type: 'RESIDENTIAL' });
            setToastMsg('Property created!');
            fetchProperties();
            setTimeout(() => setToastMsg(''), 3000);
        } catch (err) {
            console.error(err);
        }
    }

    function getTotalRooms(prop: Property): number {
        const uniqueBuildings = Array.from(new Map(prop.buildings.map(b => [b.id, b])).values());
        return uniqueBuildings.reduce((sum, b) => sum + b.rooms.length, 0);
    }

    function getOccupiedRooms(prop: Property): number {
        const uniqueBuildings = Array.from(new Map(prop.buildings.map(b => [b.id, b])).values());
        return uniqueBuildings.reduce((sum, b) => sum + b.rooms.filter(r => r.status === 'OCCUPIED').length, 0);
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Properties</h1>
                    <p>Manage your property portfolio</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    ➕ New Property
                </button>
            </div>

            {properties.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏢</div>
                    <h3>No properties yet</h3>
                    <p>Seed demo data from the Dashboard or create your first property.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                    {properties.map((prop) => {
                        const totalRooms = getTotalRooms(prop);
                        const occupiedRooms = getOccupiedRooms(prop);
                        const rate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
                        return (
                            <div key={prop.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{prop.name}</h3>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{prop.address}</div>
                                    </div>
                                    <span className={`badge ${prop.type === 'RESIDENTIAL' ? 'blue' : prop.type === 'COMMERCIAL' ? 'amber' : 'purple'}`}>
                                        {prop.type}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{new Set(prop.buildings.map(b => b.id)).size}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Buildings</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalRooms}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rooms</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{rate}%</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Occupancy</div>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                                    <div style={{ background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-teal))', height: '100%', width: `${rate}%`, borderRadius: 8, transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New Property</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Property name"
                                        value={newProperty.name}
                                        onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Address *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Full address"
                                        value={newProperty.address}
                                        onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        className="form-select"
                                        value={newProperty.type}
                                        onChange={(e) => setNewProperty({ ...newProperty, type: e.target.value })}
                                    >
                                        <option value="RESIDENTIAL">Residential</option>
                                        <option value="COMMERCIAL">Commercial</option>
                                        <option value="MIXED">Mixed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Property</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}

'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Room {
    id: string;
    number: string;
    type: string;
    status: string;
    price: number;
    building: {
        name: string;
        property: { name: string };
    };
    contracts: {
        id: string;
        person: { name: string };
        startDate: string;
        endDate: string;
        status: string;
    }[];
    maintenanceTickets: {
        id: string;
        title: string;
        priority: string;
        status: string;
        createdAt: string;
    }[];
    meters: {
        id: string;
        type: string;
        readings: { value: number; readingDate: string }[];
    }[];
}

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/rooms/${id}`)
            .then(res => res.json())
            .then(data => {
                setRoom(data);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="loading">Loading room details...</div>;
    if (!room) return <div className="error">Room not found.</div>;

    const currentTenant = room.contracts.find(c => c.status === 'ACTIVE')?.person.name || 'None';

    return (
        <div className="detail-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/rooms" className="btn btn-sm btn-secondary">← Back</Link>
                    <h1>Room {room.number}</h1>
                    <span className={`badge ${room.status === 'VACANT' ? 'emerald' : 'blue'}`}>
                        {room.status}
                    </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {room.building.property.name} / {room.building.name}
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card blue">
                    <div className="stat-label">Monthly Rent</div>
                    <div className="stat-value">{room.price.toLocaleString()} THB</div>
                </div>
                <div className="stat-card emerald">
                    <div className="stat-label">Current Tenant</div>
                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>{currentTenant}</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-label">Pending Repairs</div>
                    <div className="stat-value">{room.maintenanceTickets.filter(t => t.status !== 'COMPLETED').length}</div>
                </div>
            </div>

            <div className="content-grid">
                <div className="main-col">
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="section-header">
                            <h2>Maintenance History</h2>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ticket</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {room.maintenanceTickets.map(ticket => (
                                        <tr key={ticket.id}>
                                            <td style={{ fontWeight: 600 }}>{ticket.title}</td>
                                            <td><span className={`badge ${ticket.priority === 'HIGH' ? 'amber' : 'blue'}`}>{ticket.priority}</span></td>
                                            <td><span className="badge blue">{ticket.status}</span></td>
                                            <td style={{ fontSize: '0.75rem' }}>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div className="section-header">
                            <h2>Contracts</h2>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tenant</th>
                                        <th>Period</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {room.contracts.map(contract => (
                                        <tr key={contract.id}>
                                            <td style={{ fontWeight: 600 }}>{contract.person.name}</td>
                                            <td style={{ fontSize: '0.75rem' }}>
                                                {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                                            </td>
                                            <td><span className={`badge ${contract.status === 'ACTIVE' ? 'emerald' : 'blue'}`}>{contract.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="side-col">
                    <div className="card">
                        <div className="section-header">
                            <h2>Utility Readings</h2>
                        </div>
                        {room.meters.map(meter => (
                            <div key={meter.id} className="info-item" style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    {meter.type}
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>#{meter.id.slice(0, 5)}</span>
                                </label>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{meter.readings[0]?.value || '0'}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        last update: {meter.readings[0] ? new Date(meter.readings[0].readingDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }}>Record Meter Reading</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

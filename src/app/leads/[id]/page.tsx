'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Person {
    id: string;
    name: string;
    email: string;
    phone: string;
    leadStatus: string;
    notes: string;
    interactions: {
        id: string;
        type: string;
        subject: string;
        notes: string;
        createdAt: string;
    }[];
    contracts: {
        id: string;
        monthlyRent: number;
        startDate: string;
        endDate: string;
        status: string;
        room: {
            number: string;
            building: { name: string };
        };
    }[];
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [person, setPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/persons/${id}`)
            .then(res => res.json())
            .then(data => {
                setPerson(data);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="loading">Loading details...</div>;
    if (!person) return <div className="error">Person not found.</div>;

    return (
        <div className="detail-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/leads" className="btn btn-sm btn-secondary">← Back</Link>
                    <h1>{person.name}</h1>
                    <span className={`badge ${person.leadStatus === 'HOT' ? 'rose' : person.leadStatus === 'WARM' ? 'amber' : 'blue'}`}>
                        {person.leadStatus}
                    </span>
                </div>
            </div>

            <div className="content-grid">
                <div className="main-col">
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="section-header">
                            <h2>Interaction History</h2>
                        </div>
                        <div className="interaction-feed">
                            {person.interactions.length === 0 ? (
                                <p className="empty-text">No interactions logged yet.</p>
                            ) : (
                                person.interactions.map(item => (
                                    <div key={item.id} className="interaction-item">
                                        <div className={`interaction-avatar ${item.type.toLowerCase()}`}>
                                            {item.type[0]}
                                        </div>
                                        <div className="interaction-body">
                                            <div className="interaction-header-row">
                                                <span className="person-name">{item.subject}</span>
                                                <span className="time">{new Date(item.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="subject">{item.notes}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="section-header">
                            <h2>Contract History</h2>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Room</th>
                                        <th>Rent</th>
                                        <th>Period</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {person.contracts.map(contract => (
                                        <tr key={contract.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{contract.room.number}</div>
                                                <div style={{ fontSize: '0.7rem' }}>{contract.room.building.name}</div>
                                            </td>
                                            <td>{contract.monthlyRent.toLocaleString()} THB</td>
                                            <td style={{ fontSize: '0.75rem' }}>
                                                {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <span className={`badge ${contract.status === 'ACTIVE' ? 'emerald' : 'blue'}`}>
                                                    {contract.status}
                                                </span>
                                            </td>
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
                            <h2>Contact Info</h2>
                        </div>
                        <div className="info-list">
                            <div className="info-item">
                                <label>Email</label>
                                <div>{person.email || 'N/A'}</div>
                            </div>
                            <div className="info-item">
                                <label>Phone</label>
                                <div>{person.phone || 'N/A'}</div>
                            </div>
                            <div className="info-item">
                                <label>Current Status</label>
                                <div>{person.leadStatus}</div>
                            </div>
                        </div>
                        <hr style={{ margin: '16px 0', borderColor: 'var(--border-subtle)' }} />
                        <div className="form-group">
                            <label>Notes</label>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {person.notes || 'No private notes yet.'}
                            </p>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>Edit Lead</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

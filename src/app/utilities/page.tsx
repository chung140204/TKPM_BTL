'use client';

import { useState, useEffect } from 'react';

interface Meter {
    id: string;
    type: 'ELECTRICITY' | 'WATER';
    number: string;
    room: {
        number: string;
        building: { name: string };
    };
    readings: {
        value: number;
        readingDate: string;
    }[];
}

interface Room {
    id: string;
    number: string;
    building: { name: string };
}

export default function UtilitiesPage() {
    const [meters, setMeters] = useState<Meter[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [newReading, setNewReading] = useState({
        roomId: '',
        type: 'ELECTRICITY',
        value: 0,
        readingDate: new Date().toISOString().split('T')[0],
        meterNumber: '',
    });
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        fetchMeters();
        fetchRooms();
    }, []);

    async function fetchMeters() {
        const res = await fetch('/api/utilities');
        const data = await res.json();
        setMeters(Array.isArray(data) ? data : []);
    }

    async function fetchRooms() {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
    }

    async function handleRecord(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/utilities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReading),
            });
            if (res.ok) {
                setShowRecordModal(false);
                setNewReading({ ...newReading, value: 0 });
                setToastMsg('Reading recorded!');
                fetchMeters();
                setTimeout(() => setToastMsg(''), 3000);
            }
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Utility Consumption</h1>
                    <p>Monitor electricity and water usage across all rooms</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowRecordModal(true)}>
                    ⚡ Record Reading
                </button>
            </div>

            <div className="stats-grid" style={{ marginBottom: 32 }}>
                <div className="stat-card blue">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-value">{meters.filter(m => m.type === 'ELECTRICITY').length}</div>
                    <div className="stat-label">Electricity Meters</div>
                </div>
                <div className="stat-card teal">
                    <div className="stat-icon">💧</div>
                    <div className="stat-value">{meters.filter(m => m.type === 'WATER').length}</div>
                    <div className="stat-label">Water Meters</div>
                </div>
            </div>

            <div className="card-container">
                {meters.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>No meters registered</h3>
                        <p>Start by recording a utility reading for a room.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Room</th>
                                    <th>Last Reading</th>
                                    <th>Reading Date</th>
                                    <th>Meter #</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {meters.map((meter) => (
                                    <tr key={meter.id}>
                                        <td>
                                            <span className={`badge ${meter.type === 'ELECTRICITY' ? 'amber' : 'blue'}`}>
                                                {meter.type === 'ELECTRICITY' ? '⚡ Electricity' : '💧 Water'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{meter.room.number}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meter.room.building.name}</div>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>
                                            {meter.readings[0]?.value || 'N/A'} {meter.type === 'ELECTRICITY' ? 'kWh' : 'm³'}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {meter.readings[0] ? new Date(meter.readings[0].readingDate).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{meter.number}</td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary">History</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showRecordModal && (
                <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Record Utility Reading</h2>
                            <button className="modal-close" onClick={() => setShowRecordModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleRecord}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Service Type *</label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${newReading.type === 'ELECTRICITY' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setNewReading({ ...newReading, type: 'ELECTRICITY' })}
                                        >⚡ Electricity</button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${newReading.type === 'WATER' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setNewReading({ ...newReading, type: 'WATER' })}
                                        >💧 Water</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Room *</label>
                                    <select
                                        className="form-select"
                                        value={newReading.roomId}
                                        onChange={(e) => setNewReading({ ...newReading, roomId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select a room...</option>
                                        {rooms.map((r) => (
                                            <option key={r.id} value={r.id}>{r.building.name} - {r.number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Reading Value *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Current meter value"
                                            value={newReading.value}
                                            onChange={(e) => setNewReading({ ...newReading, value: parseFloat(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Reading Date *</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={newReading.readingDate}
                                            onChange={(e) => setNewReading({ ...newReading, readingDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Meter Serial Number (Optional)</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. SN-99823"
                                        value={newReading.meterNumber}
                                        onChange={(e) => setNewReading({ ...newReading, meterNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRecordModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Reading</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}

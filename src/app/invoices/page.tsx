'use client';

import { useState, useEffect } from 'react';

interface Invoice {
    id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    dueDate: string;
    issuedDate: string;
    contract: {
        person: { name: string };
        room: { number: string; building: { name: string } };
    };
}

interface Contract {
    id: string;
    person: { name: string };
    room: { number: string };
    monthlyRent: number;
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        contractId: '',
        amount: 0,
        dueDate: '',
        status: 'DRAFT',
    });
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        fetchInvoices();
        fetchContracts();
    }, []);

    async function fetchInvoices() {
        const res = await fetch('/api/invoices');
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
    }

    async function fetchContracts() {
        const res = await fetch('/api/contracts');
        const data = await res.json();
        setContracts(Array.isArray(data) ? data : []);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInvoice),
            });
            if (res.ok) {
                setShowCreateModal(false);
                setNewInvoice({ contractId: '', amount: 0, dueDate: '', status: 'DRAFT' });
                setToastMsg('Invoice created!');
                fetchInvoices();
                setTimeout(() => setToastMsg(''), 3000);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Invoicing & Billing</h1>
                    <p>Track payments, generate receipts, and manage financial health</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    ➕ New Invoice
                </button>
            </div>

            <div className="card-container">
                {invoices.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💰</div>
                        <h3>No invoices found</h3>
                        <p>Generate your first invoice to track payments.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Tenant / Room</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Issued</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{inv.invoiceNumber}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{inv.contract.person.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room {inv.contract.room.number}</div>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(inv.amount)}</td>
                                        <td>{formatDate(inv.dueDate)}</td>
                                        <td>
                                            <span className={`badge ${inv.status === 'PAID' ? 'emerald' : inv.status === 'PENDING' ? 'blue' : 'amber'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td>{formatDate(inv.issuedDate)}</td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary">Record Payment</button>
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
                            <h2>Generate Invoice</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Contract *</label>
                                    <select
                                        className="form-select"
                                        value={newInvoice.contractId}
                                        onChange={(e) => {
                                            const c = contracts.find(x => x.id === e.target.value);
                                            setNewInvoice({ ...newInvoice, contractId: e.target.value, amount: c?.monthlyRent || 0 });
                                        }}
                                        required
                                    >
                                        <option value="">Select an active contract...</option>
                                        {contracts.map((c) => (
                                            <option key={c.id} value={c.id}>{c.person.name} - Room {c.room.number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Amount (THB) *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={newInvoice.amount}
                                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Due Date *</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={newInvoice.dueDate}
                                            onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Initial Status</label>
                                    <select
                                        className="form-select"
                                        value={newInvoice.status}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, status: e.target.value })}
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="PENDING">Pending (Sent)</option>
                                        <option value="PAID">Already Paid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Generate Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}

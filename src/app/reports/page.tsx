'use client';

import { useState, useEffect } from 'react';

interface ReportData {
    totalRevenue: number;
    occupancyRate: number;
    monthlyRevenue: { month: string; amount: number }[];
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/reports/financial')
            .then(res => res.json())
            .then(json => {
                setData(json);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="loading">Generating reports...</div>;

    const maxRev = Math.max(...(data?.monthlyRevenue.map(r => r.amount) || [1]));

    return (
        <>
            <div className="page-header">
                <h1>Financial Performance</h1>
                <p>Comprehensive overview of property revenue and occupancy trends</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 32 }}>
                <div className="stat-card blue">
                    <div className="stat-label">Total Collected Revenue</div>
                    <div className="stat-value">{data?.totalRevenue.toLocaleString()} THB</div>
                </div>
                <div className="stat-card emerald">
                    <div className="stat-label">Average Occupancy</div>
                    <div className="stat-value">{Math.round(data?.occupancyRate || 0)}%</div>
                </div>
            </div>

            <div className="content-grid">
                <div className="card">
                    <div className="section-header">
                        <h2>Revenue Trends</h2>
                    </div>
                    <div className="chart-container" style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '20px 0' }}>
                        {data?.monthlyRevenue.map(rev => (
                            <div key={rev.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '100%',
                                    background: 'var(--accent-blue)',
                                    height: `${(rev.amount / maxRev) * 200}px`,
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 1s ease-out'
                                }}></div>
                                <div style={{ fontSize: '0.65rem', marginTop: 8, color: 'var(--text-muted)' }}>{rev.month}</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>{Math.round(rev.amount / 1000)}k</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="section-header">
                        <h2>Monthly Breakdown</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Revenue</th>
                                    <th>Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.monthlyRevenue.map(rev => (
                                    <tr key={rev.month}>
                                        <td style={{ fontWeight: 600 }}>{rev.month}</td>
                                        <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{rev.amount.toLocaleString()} THB</td>
                                        <td>-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

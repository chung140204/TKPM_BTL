'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function Sidebar() {
    const pathname = usePathname();
    const { lang, setLang, t } = useLanguage();

    const navItems = [
        {
            section: lang === 'vi' ? 'Tổng quan' : 'Overview',
            items: [
                { href: '/', label: t.navDashboard, icon: '📊' },
            ]
        },
        {
            section: lang === 'vi' ? 'Vận hành' : 'Operations',
            items: [
                { href: '/interactions', label: t.navInteractions, icon: '💬', badge: 'Hub' },
                { href: '/leads', label: t.navLeads, icon: '🎯' },
                { href: '/rooms', label: t.navRooms, icon: '🏠' },
                { href: '/properties', label: t.navProperties, icon: '🏢' },
                { href: '/contracts', label: t.navContracts, icon: '📄' },
                { href: '/invoices', label: t.navContracts, icon: '💰' },
                { href: '/maintenance', label: t.navMaintenance, icon: '🔧' },
                { href: '/utilities', label: t.navUtilities, icon: '⚡' },
            ]
        },
        {
            section: lang === 'vi' ? 'Phân tích' : 'Analytics',
            items: [
                { href: '/reports', label: t.navReports, icon: '📈' },
            ]
        },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h2><span>Smile Home</span></h2>
                <div className="subtitle">Property Operation System</div>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((section) => (
                    <div key={section.section}>
                        <div className="nav-section-label">{section.section}</div>
                        {section.items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                                {item.badge && <span className="nav-badge">{item.badge}</span>}
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>
            
            <div style={{ padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.65rem', marginBottom: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    {t.language}
                </div>
                
                {/* Modern Premium Language Switcher */}
                <div style={{ 
                    display: 'flex', 
                    padding: '2px', 
                    background: 'rgba(26, 32, 53, 0.8)', 
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                }}>
                    <button 
                        onClick={() => setLang('vi')}
                        style={{ 
                            flex: 1,
                            cursor: 'pointer', 
                            border: 'none', 
                            background: lang === 'vi' ? 'var(--accent-blue)' : 'transparent',
                            color: lang === 'vi' ? '#fff' : 'var(--text-muted)',
                            borderRadius: '8px',
                            padding: '6px 0',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <span style={{ filter: lang === 'vi' ? 'none' : 'grayscale(100%) opacity(0.5)' }}>🇻🇳</span>
                        VN
                    </button>
                    <button 
                        onClick={() => setLang('en')}
                        style={{ 
                            flex: 1,
                            cursor: 'pointer', 
                            border: 'none', 
                            background: lang === 'en' ? 'var(--accent-blue)' : 'transparent',
                            color: lang === 'en' ? '#fff' : 'var(--text-muted)',
                            borderRadius: '8px',
                            padding: '6px 0',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <span style={{ filter: lang === 'en' ? 'none' : 'grayscale(100%) opacity(0.5)' }}>🇬🇧</span>
                        EN
                    </button>
                </div>

                <div style={{ marginTop: '16px', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                    API-First · Multi-Tenant
                </div>
            </div>
        </aside>
    );
}

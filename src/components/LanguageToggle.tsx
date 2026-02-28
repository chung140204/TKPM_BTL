'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle() {
    const { lang, setLang } = useLanguage();

    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: 'calc(var(--sidebar-width) + 32px)',
            zIndex: 1000,
            display: 'flex',
            padding: '4px',
            background: 'rgba(26, 32, 53, 0.65)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}>
            <button 
                onClick={() => setLang('vi')}
                style={{ 
                    cursor: 'pointer', 
                    border: 'none', 
                    background: lang === 'vi' ? 'var(--accent-blue)' : 'transparent',
                    color: lang === 'vi' ? '#fff' : 'var(--text-secondary)',
                    borderRadius: '9px',
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: lang === 'vi' ? 'var(--accent-blue-glow)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <span style={{ filter: lang === 'vi' ? 'none' : 'grayscale(100%) opacity(0.7)' }}>🇻🇳</span>
                VN
            </button>
            <button 
                onClick={() => setLang('en')}
                style={{ 
                    cursor: 'pointer', 
                    border: 'none', 
                    background: lang === 'en' ? 'var(--accent-blue)' : 'transparent',
                    color: lang === 'en' ? '#fff' : 'var(--text-secondary)',
                    borderRadius: '9px',
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: lang === 'en' ? 'var(--accent-blue-glow)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <span style={{ filter: lang === 'en' ? 'none' : 'grayscale(100%) opacity(0.7)' }}>🇬🇧</span>
                EN
            </button>
        </div>
    );
}

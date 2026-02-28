'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface FilterAreaProps {
    options: string[];
    selectedValues: string[];
    onApply: (values: string[]) => void;
}

export default function FilterArea({
    options,
    selectedValues,
    onApply,
}: FilterAreaProps) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync when external changes happen
    useEffect(() => {
        setTempSelected(selectedValues);
    }, [selectedValues, isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (opt: string) => {
        setTempSelected(prev => 
            prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
        );
    };

    const handleClear = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setTempSelected([]);
        onApply([]);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleApply = () => {
        onApply(tempSelected);
        setIsOpen(false);
    };

    return (
        <div className="filter-area-container" ref={containerRef}>
            <div className="filter-button-group" style={{ display: 'flex', alignItems: 'center' }}>
                <button 
                    className={`filter-btn ${selectedValues.length > 0 ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="icon">📍</span>
                    <span className="label">
                        {t.contracts.filterAreaLabel}
                        {selectedValues.length > 0 && ` (${selectedValues.length})`}
                    </span>
                    <span className="chevron">{isOpen ? '▲' : '▼'}</span>
                </button>
                {selectedValues.length > 0 && (
                    <button 
                        className="quick-clear-btn" 
                        onClick={handleClear}
                        title={t.contracts.filterClear}
                    >
                        ✕
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="filter-dropdown">
                    <div className="filter-search">
                        <input 
                            type="text" 
                            placeholder={t.contracts.filterSearchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-list">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <label key={idx} className="filter-item">
                                    <input 
                                        type="checkbox" 
                                        checked={tempSelected.includes(opt)}
                                        onChange={() => toggleOption(opt)}
                                    />
                                    <span className="opt-label">{opt}</span>
                                </label>
                            ))
                        ) : (
                            <div className="no-result">No results</div>
                        )}
                    </div>

                    <div className="filter-footer">
                        <button className="clear-btn" onClick={handleClear}>
                            {t.contracts.filterClear}
                        </button>
                        <button className="apply-btn" onClick={handleApply}>
                            {t.contracts.filterApply}
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .filter-area-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .filter-button-group {
                    display: flex;
                    align-items: center;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-sm);
                    transition: var(--transition-fast);
                }
                .filter-button-group:hover {
                    border-color: var(--accent-blue);
                }
                .filter-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px 8px 16px;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                }
                .filter-btn.active {
                    color: var(--accent-blue);
                }
                .quick-clear-btn {
                    background: transparent;
                    border: none;
                    border-left: 1px solid var(--border-subtle);
                    color: var(--text-muted);
                    padding: 8px 10px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .quick-clear-btn:hover {
                    color: var(--accent-rose);
                    background: rgba(244, 63, 94, 0.1);
                }
                .filter-btn .chevron {
                    font-size: 0.7rem;
                    opacity: 0.6;
                }
                .filter-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    width: 250px;
                    background: white; /* Shopee style is white */
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    animation: fadeIn 150ms ease-out;
                }
                /* Night mode adjustment if needed, but Shopee is very light. 
                   Since the app is dark, let's keep it consistent but with Shopee vibe. */
                :global(.dark) .filter-dropdown {
                    background: var(--bg-card);
                    border-color: var(--border-subtle);
                    color: var(--text-primary);
                }
                .filter-dropdown {
                    background: var(--bg-card);
                    border-color: var(--border-subtle);
                }

                .filter-search {
                    padding: 12px;
                    border-bottom: 1px solid var(--border-subtle);
                }
                .filter-search input {
                    width: 100%;
                    padding: 8px 12px;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-subtle);
                    border-radius: 4px;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    outline: none;
                }
                .filter-search input:focus {
                    border-color: var(--accent-blue);
                }

                .filter-list {
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 8px 0;
                }
                .filter-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .filter-item:hover {
                    background: var(--bg-card-hover);
                }
                .filter-item input[type="checkbox"] {
                    accent-color: #ee4d2d;
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }
                .opt-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .filter-item:hover .opt-label {
                    color: var(--text-primary);
                }
                
                .no-result {
                    padding: 20px;
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }

                .filter-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    border-top: 1px solid var(--border-subtle);
                    background: var(--bg-secondary);
                }
                .clear-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 0.8rem;
                    cursor: pointer;
                    padding: 4px 8px;
                }
                .clear-btn:hover {
                    color: var(--accent-rose);
                }
                .apply-btn {
                    background: #ee4d2d;
                    color: white;
                    border: none;
                    padding: 6px 16px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .apply-btn:hover {
                    background: #d73211;
                }

                /* Scrollbar */
                .filter-list::-webkit-scrollbar {
                    width: 6px;
                }
                .filter-list::-webkit-scrollbar-thumb {
                    background: var(--border-subtle);
                    border-radius: 3px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                :global(body.vi) .apply-btn { font-size: 0.8rem; }
            `}</style>
        </div>
    );
}

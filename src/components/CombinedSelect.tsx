'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CombinedSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function CombinedSelect({
    options,
    value,
    onChange,
    placeholder = 'Select or type...',
    disabled = false,
    className = '',
}: CombinedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync searchTerm with value when value changes externally
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue);
        setIsOpen(true);
    };

    const handleOptionSelect = (option: string) => {
        setSearchTerm(option);
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className={`combined-select-container ${className}`} ref={containerRef}>
            <div className="input-wrapper">
                <input
                    type="text"
                    className="form-input"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                <button 
                    type="button"
                    className="dropdown-toggle"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    tabIndex={-1}
                >
                    {isOpen ? '▲' : '▼'}
                </button>
            </div>

            {isOpen && !disabled && (
                <div className="dropdown-menu">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                className={`dropdown-item ${option === value ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect(option)}
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        searchTerm && (
                            <div 
                                className="dropdown-item custom-value"
                                onClick={() => setIsOpen(false)}
                            >
                                Use: "{searchTerm}"
                            </div>
                        )
                    )}
                </div>
            )}

            <style jsx>{`
                .combined-select-container {
                    position: relative;
                    width: 100%;
                }
                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .input-wrapper input {
                    padding-right: 36px;
                    width: 100%;
                }
                .dropdown-toggle {
                    position: absolute;
                    right: 8px;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    font-size: 0.7rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    transition: var(--transition-fast);
                }
                .dropdown-toggle:hover {
                    color: var(--text-primary);
                }
                .dropdown-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-elevated);
                    z-index: 1000;
                    max-height: 240px;
                    overflow-y: auto;
                    animation: slideUp 200ms ease-out;
                }
                .dropdown-item {
                    padding: 10px 14px;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }
                .dropdown-item:hover {
                    background: var(--accent-blue-glow);
                    color: var(--text-primary);
                }
                .dropdown-item.selected {
                    background: var(--accent-blue);
                    color: white;
                }
                .custom-value {
                    font-style: italic;
                    color: var(--text-secondary);
                }
                /* Custom Scrollbar */
                .dropdown-menu::-webkit-scrollbar {
                    width: 6px;
                }
                .dropdown-menu::-webkit-scrollbar-track {
                    background: transparent;
                }
                .dropdown-menu::-webkit-scrollbar-thumb {
                    background: var(--border-subtle);
                    border-radius: 3px;
                }
                .dropdown-menu::-webkit-scrollbar-thumb:hover {
                    background: var(--text-muted);
                }
                @keyframes slideUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; name: string; type: string; url: string }[]>([]);
    const router = useRouter();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape') setIsOpen(false);
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const debounce = setTimeout(async () => {
            // Mock search for now, combining various entities
            const res = await Promise.all([
                fetch(`/api/persons?q=${query}`).then(r => r.ok ? r.json() : []),
                fetch(`/api/rooms?q=${query}`).then(r => r.ok ? r.json() : []),
            ]).catch(() => [[], []]);

            const [persons, rooms] = res;
            const combined = [
                ...Array.isArray(persons) ? persons.map(p => ({ id: p.id, name: p.name, type: 'Lead/Person', url: `/leads/${p.id}` })) : [],
                ...Array.isArray(rooms) ? rooms.map(r => ({ id: r.id, name: `Room ${r.number}`, type: 'Room', url: `/rooms/${r.id}` })) : [],
            ].slice(0, 8);

            setResults(combined);
        }, 300);

        return () => clearTimeout(debounce);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="search-overlay" onClick={() => setIsOpen(false)}>
            <div className="search-modal" onClick={e => e.stopPropagation()}>
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        autoFocus
                        placeholder="Search rooms, leads, or contracts... (e.g. '101' or 'John')"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <span className="search-shortcut">ESC</span>
                </div>
                <div className="search-results">
                    {results.map(res => (
                        <div
                            key={res.id}
                            className="search-result-item"
                            onClick={() => {
                                router.push(res.url);
                                setIsOpen(false);
                                setQuery('');
                            }}
                        >
                            <div className="result-info">
                                <div className="result-name">{res.name}</div>
                                <div className="result-type">{res.type}</div>
                            </div>
                            <span className="result-arrow">→</span>
                        </div>
                    ))}
                    {query && results.length === 0 && (
                        <div className="search-empty">No results found for "{query}"</div>
                    )}
                </div>
            </div>
        </div>
    );
}

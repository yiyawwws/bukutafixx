import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = 'Cari buku, penulis, atau ISBN...', className = '' }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) onSearch('');
  };

  return (
    <form className={`search-bar ${className}`} onSubmit={handleSubmit} role="search">
      <div className="search-bar-inner">
        <Search className="search-bar-icon" size={18} />
        <input
          type="search"
          className="search-bar-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari buku"
        />
        {query && (
          <button type="button" className="search-bar-clear" onClick={handleClear} aria-label="Hapus pencarian">
            <X size={16} />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;

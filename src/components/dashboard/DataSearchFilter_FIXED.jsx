import React, { useState } from 'react'
import Button from '../ui/Button'

export default function DataSearchFilter({ 
  tableSchema, 
  onSearch, 
  isSearching,
  searchResults,
  onClearSearch 
}) {
  const [showFilters, setShowFilters] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [operator, setOperator] = useState('contains')
  const [activeFilters, setActiveFilters] = useState([])

  if (!tableSchema || tableSchema.length === 0) {
    return (
      <div style={{ 
        padding: '16px', 
        textAlign: 'center', 
        color: 'var(--text-secondary)',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        No table schema available for searching
      </div>
    )
  }

  const handleAddFilter = () => {
    if (!selectedColumn || !searchValue.trim()) {
      alert('Please select a column and enter a search value')
      return
    }

    const newFilter = {
      id: Date.now(),
      column: selectedColumn,
      operator: operator,
      value: searchValue,
      displayText: `${selectedColumn} ${operator} "${searchValue}"`
    }

    setActiveFilters([...activeFilters, newFilter])
    setSelectedColumn('')
    setSearchValue('')
  }

  const handleRemoveFilter = (filterId) => {
    setActiveFilters(activeFilters.filter(f => f.id !== filterId))
  }

  const handleSearch = () => {
    if (activeFilters.length === 0) {
      alert('Please add at least one filter before searching')
      return
    }
    
    onSearch(activeFilters)
  }

  const handleClearAll = () => {
    setActiveFilters([])
    if (onClearSearch) {
      onClearSearch()
    }
  }

  return (
    <div style={{ 
      padding: '16px', 
      background: 'var(--bg-primary)', 
      border: '1px solid var(--border-color)', 
      borderRadius: '8px',
      marginBottom: '16px',
      color: 'var(--text-primary)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
          🔍 Search & Filter Data
        </h4>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="primary"
          size="sm"
        >
          {showFilters ? 'Hide Filters' : 'Add Filters'}
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Active Filters:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {activeFilters.map((filter) => (
              <div key={filter.id} style={{
                background: 'var(--color-primary)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'white'
              }}>
                {filter.displayText}
                <button 
                  onClick={() => handleRemoveFilter(filter.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Builder */}
      {showFilters && (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '16px', 
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'end' }}>
            {/* Column Selection */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '12px', 
                fontWeight: '500', 
                color: 'var(--text-primary)' 
              }}>
                Column
              </label>
              <select 
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select column...</option>
                {tableSchema.map((col, index) => (
                  <option key={index} value={col.COLUMN_NAME || col.column_name}>
                    {col.COLUMN_NAME || col.column_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Operator Selection */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '12px', 
                fontWeight: '500', 
                color: 'var(--text-primary)' 
              }}>
                Operator
              </label>
              <select 
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
              </select>
            </div>

            {/* Value Input */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '12px', 
                fontWeight: '500', 
                color: 'var(--text-primary)' 
              }}>
                Value
              </label>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Enter search value..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Add Button */}
            <Button
              onClick={handleAddFilter}
              disabled={!selectedColumn || !searchValue.trim()}
              variant="success"
              size="sm"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Button
          onClick={handleSearch}
          disabled={activeFilters.length === 0 || isSearching}
          variant="primary"
          loading={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search Database'}
        </Button>
        
        {(activeFilters.length > 0 || searchResults) && (
          <Button
            onClick={handleClearAll}
            variant="secondary"
          >
            Clear All
          </Button>
        )}

        {searchResults && (
          <span style={{ 
            fontSize: '14px', 
            color: 'var(--color-success)', 
            fontWeight: '500' 
          }}>
            ✅ Found {searchResults.length} results
          </span>
        )}
      </div>
    </div>
  )
}

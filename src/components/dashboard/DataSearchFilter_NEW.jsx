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

  // Debug: Log when component renders
  console.log('🔍 DataSearchFilter rendering - tableSchema columns:', tableSchema?.length || 0)

  if (!tableSchema || tableSchema.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
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

    console.log('✅ Adding filter:', newFilter)
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
    
    console.log('🔍 Executing search with filters:', activeFilters)
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
      background: '#f8f9fa', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{ margin: 0, fontSize: '16px' }}>🔍 Search & Filter Data</h4>
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
          <strong>Active Filters:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {activeFilters.map((filter) => (
              <div key={filter.id} style={{
                background: '#e3f2fd',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {filter.displayText}
                <button 
                  onClick={() => handleRemoveFilter(filter.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f44336',
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
          background: 'white', 
          padding: '16px', 
          border: '1px solid #ddd',
          borderRadius: '6px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'end' }}>
            {/* Column Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Column
              </label>
              <select 
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
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
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Operator
              </label>
              <select 
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
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
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
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
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
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
          <span style={{ fontSize: '14px', color: '#28a745' }}>
            ✅ Found {searchResults.length} results
          </span>
        )}
      </div>
    </div>
  )
}

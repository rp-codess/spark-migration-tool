import React, { useState, useEffect } from 'react'
import Button from '../ui/Button'
import SearchInput from '../ui/SearchInput'

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

  const getColumnDataType = (column) => {
    const dataType = (column.DATA_TYPE || column.data_type || '').toLowerCase()
    
    if (['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real', 'money'].includes(dataType)) {
      return 'number'
    }
    if (['date', 'datetime', 'datetime2', 'smalldatetime', 'time', 'timestamp'].includes(dataType)) {
      return 'date'
    }
    if (['bit', 'boolean'].includes(dataType)) {
      return 'boolean'
    }
    return 'text'
  }

  const getOperatorsForDataType = (dataType) => {
    switch (dataType) {
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' },
          { value: 'greater_equal', label: 'Greater or Equal' },
          { value: 'less_equal', label: 'Less or Equal' },
          { value: 'is_null', label: 'Is NULL' },
          { value: 'is_not_null', label: 'Is Not NULL' }
        ]
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'after', label: 'After' },
          { value: 'before', label: 'Before' },
          { value: 'is_null', label: 'Is NULL' },
          { value: 'is_not_null', label: 'Is Not NULL' }
        ]
      case 'boolean':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'is_null', label: 'Is NULL' },
          { value: 'is_not_null', label: 'Is Not NULL' }
        ]
      default: // text
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does Not Contain' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'ends_with', label: 'Ends With' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'is_null', label: 'Is NULL' },
          { value: 'is_not_null', label: 'Is Not NULL' }
        ]
    }
  }

  const handleAddFilter = () => {
    if (!selectedColumn || (!searchValue.trim() && !['is_null', 'is_not_null'].includes(operator))) {
      return
    }

    const column = tableSchema.find(col => 
      (col.COLUMN_NAME || col.column_name) === selectedColumn
    )
    
    const operatorLabel = getOperatorsForDataType(getColumnDataType(column)).find(op => op.value === operator)?.label || operator
    
    const filter = {
      id: Date.now(),
      column: selectedColumn,
      operator,
      value: searchValue,
      dataType: getColumnDataType(column),
      displayText: `${selectedColumn} ${operatorLabel} ${['is_null', 'is_not_null'].includes(operator) ? '' : searchValue}`
    }

    console.log('Adding filter:', filter)
    setActiveFilters([...activeFilters, filter])
    setSelectedColumn('')
    setSearchValue('')
    setOperator('contains')
  }

  const handleRemoveFilter = (filterId) => {
    setActiveFilters(activeFilters.filter(f => f.id !== filterId))
  }

  const handleSearch = () => {
    if (activeFilters.length === 0) return
    onSearch(activeFilters)
  }

  const handleClearAll = () => {
    setActiveFilters([])
    onClearSearch()
  }

  const renderValueInput = () => {
    if (!selectedColumn) return null

    const column = tableSchema.find(col => 
      (col.COLUMN_NAME || col.column_name) === selectedColumn
    )
    const dataType = getColumnDataType(column)

    if (['is_null', 'is_not_null'].includes(operator)) {
      return null
    }

    switch (dataType) {
      case 'number':
        return (
          <input
            type="number"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Enter number..."
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '14px',
              width: '200px'
            }}
          />
        )
      case 'date':
        return (
          <input
            type="date"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '14px',
              width: '200px'
            }}
          />
        )
      case 'boolean':
        return (
          <select
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '14px',
              width: '200px'
            }}
          >
            <option value="">Select...</option>
            <option value="1">True</option>
            <option value="0">False</option>
          </select>
        )
      default:
        return (
          <SearchInput
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Enter text..."
            size="sm"
          />
        )
    }
  }

  return (
    <div style={{ 
      background: 'var(--bg-secondary)', 
      border: '1px solid var(--border-color)', 
      borderRadius: '8px', 
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
          🔍 Data Search & Filter
        </h4>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="primary"
          size="sm"
          icon={showFilters ? '📝' : '🔽'}
        >
          {showFilters ? 'Hide Filters' : 'Add Filters'}
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Active Filters:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {activeFilters.map(filter => (
              <div
                key={filter.id}
                style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {filter.displayText}
                <button
                  onClick={() => handleRemoveFilter(filter.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0'
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
          background: 'var(--bg-primary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '6px', 
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            {/* Column Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Column
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => {
                  setSelectedColumn(e.target.value)
                  setSearchValue('')
                  setOperator('contains')
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select Column...</option>
                {tableSchema.map((column, index) => {
                  const columnName = column.COLUMN_NAME || column.column_name
                  const dataType = column.DATA_TYPE || column.data_type
                  return (
                    <option key={index} value={columnName}>
                      {columnName} ({dataType})
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Operator Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Operator
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                disabled={!selectedColumn}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {selectedColumn && getOperatorsForDataType(
                  getColumnDataType(tableSchema.find(col => 
                    (col.COLUMN_NAME || col.column_name) === selectedColumn
                  ))
                ).map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Value Input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Value
              </label>
              {renderValueInput()}
            </div>

            {/* Add Filter Button */}
            <Button
              onClick={handleAddFilter}
              disabled={!selectedColumn || (!searchValue.trim() && !['is_null', 'is_not_null'].includes(operator))}
              variant="success"
              size="sm"
              icon="➕"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Search Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button
          onClick={handleSearch}
          disabled={activeFilters.length === 0 || isSearching}
          variant="primary"
          icon={isSearching ? '⏳' : '🔍'}
          loading={isSearching}
        >
          Search Database
        </Button>
        
        {(activeFilters.length > 0 || searchResults) && (
          <Button
            onClick={handleClearAll}
            variant="secondary"
            size="sm"
            icon="🗑️"
          >
            Clear All
          </Button>
        )}

        {searchResults && (
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} (showing top 10)
          </span>
        )}
      </div>
    </div>
  )
}

import React from 'react'

export const getHighlightedTextParts = (text, searchTerm) => {
  if (!searchTerm) return [{ text, highlighted: false }]
  
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, index) => ({
    text: part,
    highlighted: regex.test(part),
    key: index
  }))
}

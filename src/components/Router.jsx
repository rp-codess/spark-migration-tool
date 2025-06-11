import React from 'react'

export default function Router({ currentPage, children }) {
  return (
    <div>
      {children.find(child => child.props.name === currentPage)}
    </div>
  )
}

export function Page({ name, children }) {
  return <div>{children}</div>
}

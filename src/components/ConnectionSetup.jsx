import React, { useState } from 'react'

export default function ConnectionSetup() {
  const [config, setConfig] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  })

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Database Connection Setup</h3>
      <div style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
        <input 
          placeholder="Host" 
          value={config.host}
          onChange={(e) => setConfig({...config, host: e.target.value})}
        />
        <input 
          placeholder="Port" 
          value={config.port}
          onChange={(e) => setConfig({...config, port: e.target.value})}
        />
        <input 
          placeholder="Database" 
          value={config.database}
          onChange={(e) => setConfig({...config, database: e.target.value})}
        />
        <input 
          placeholder="Username" 
          value={config.username}
          onChange={(e) => setConfig({...config, username: e.target.value})}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={config.password}
          onChange={(e) => setConfig({...config, password: e.target.value})}
        />
        <button onClick={() => console.log('Connect', config)}>Connect</button>
      </div>
    </div>
  )
}

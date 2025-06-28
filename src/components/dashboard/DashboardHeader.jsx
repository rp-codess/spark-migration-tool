import React from 'react'
import { Button, Dropdown } from 'antd'
import { 
  DownloadOutlined, 
  DisconnectOutlined,
  FileTextOutlined,
  FolderOutlined,
  DatabaseOutlined,
  UnorderedListOutlined,
  NumberOutlined,
  TableOutlined
} from '@ant-design/icons'
import ThemeToggle from '../ui/ThemeToggle'

export default function DashboardHeader({ 
  config, 
  onDisconnect, 
  downloading, 
  tables, 
  downloadProgress,
  rowCountProgress,
  emptyTablesProgress,
  rowCountCancelled,
  emptyTablesCancelled,
  downloadCancelled,
  onSingleFileDownload,
  onIndividualFilesDownload,
  onSQLDownload,
  onCancelDownload,
  onCancelRowCountDownload,
  onCancelEmptyTablesDownload,
  onDownloadTablesList,
  onDownloadTablesWithRowCount,
  onDownloadEmptyTablesJSON,
  loading // Add loading prop for row count operations
}) {
  const downloadMenuItems = [
    {
      key: 'json-single',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined />
          <span>JSON Single File</span>
        </span>
      ),
      onClick: onSingleFileDownload,
      disabled: downloading || loading || tables.length === 0
    },
    {
      key: 'json-individual',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOutlined />
          <span>JSON Individual Files</span>
        </span>
      ),
      onClick: onIndividualFilesDownload,
      disabled: downloading || loading || tables.length === 0
    },
    {
      key: 'sql-schemas',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DatabaseOutlined />
          <span>SQL Schemas</span>
        </span>
      ),
      onClick: onSQLDownload,
      disabled: downloading || loading || tables.length === 0
    },
    {
      key: 'tables-list',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UnorderedListOutlined />
          <span>Tables List</span>
        </span>
      ),
      onClick: onDownloadTablesList,
      disabled: downloading || loading || tables.length === 0
    },
    {
      key: 'tables-with-rowcount',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NumberOutlined />
          <span>Tables with Row Count</span>
        </span>
      ),
      onClick: onDownloadTablesWithRowCount,
      disabled: downloading || loading || tables.length === 0
    },
    {
      key: 'empty-tables-json',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TableOutlined />
          <span>Empty Tables List</span>
        </span>
      ),
      onClick: onDownloadEmptyTablesJSON,
      disabled: downloading || loading || tables.length === 0
    }
  ]

  return (
    <div className="dashboard-header animate-slideInDown">
      <div className="header-content">
        <div className="header-info">
          <h1 className="header-title">
            📊 Database Explorer
          </h1>
          <p className="header-subtitle">
            {config.type.toUpperCase()} • {config.host} • {config.database}
          </p>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          
          <Dropdown
            menu={{
              items: downloadMenuItems,
              onClick: ({ key }) => {
                const item = downloadMenuItems.find(item => item.key === key)
                if (item && item.onClick) {
                  item.onClick()
                }
              }
            }}
            disabled={downloading || tables.length === 0}
            placement="bottomRight"
          >
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloading || loading}
              disabled={downloading || loading || tables.length === 0}
              style={{
                background: (downloading || loading) ? '#52c41a' : '#1890ff',
                borderColor: (downloading || loading) ? '#52c41a' : '#1890ff'
              }}
            >
              {downloading ? `Downloading (${downloadProgress.current}/${downloadProgress.total})` : 
               rowCountProgress.total > 0 ? `Getting Row Counts (${rowCountProgress.current}/${rowCountProgress.total})` :
               emptyTablesProgress.total > 0 ? `Searching Empty Tables (${emptyTablesProgress.current}/${emptyTablesProgress.total})` :
               loading ? 'Processing Tables...' : 'Download Options'}
            </Button>
          </Dropdown>
          
          <Button
            danger
            icon={<DisconnectOutlined />}
            onClick={onDisconnect}
            style={{ marginLeft: '8px' }}
          >
            Disconnect
          </Button>
        </div>
      </div>
      
      {/* Progress Bar for Main Downloads */}
      {downloading && (
        <div className="progress-section animate-slideInDown">
          <div className="progress-header">
            <span className="progress-text">
              {downloadCancelled ? 'Cancelling...' : `Downloading schemas... (${downloadProgress.current}/${downloadProgress.total})`}
            </span>
            <div className="progress-actions">
              <span className="progress-text">
                {downloadProgress.total > 0 ? Math.round((downloadProgress.current / downloadProgress.total) * 100) : 0}%
              </span>
              <Button
                danger
                size="small"
                loading={downloadCancelled}
                onClick={onCancelDownload}
                disabled={downloadCancelled}
                style={{ marginLeft: '8px' }}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${downloadCancelled ? 'warning' : 'success'}`}
              style={{ 
                width: downloadProgress.total > 0 ? `${(downloadProgress.current / downloadProgress.total) * 100}%` : '0%'
              }}
            />
          </div>
        </div>
      )}

      {/* Progress Bar for Row Count Download */}
      {rowCountProgress.total > 0 && (
        <div className="progress-section animate-slideInDown">
          <div className="progress-header">
            <span className="progress-text">
              {rowCountCancelled ? 'Cancelling row count...' : `Getting row counts... (${rowCountProgress.current}/${rowCountProgress.total})`}
            </span>
            <div className="progress-actions">
              <span className="progress-text">
                {Math.round((rowCountProgress.current / rowCountProgress.total) * 100)}%
              </span>
              <Button
                danger
                size="small"
                loading={rowCountCancelled}
                onClick={onCancelRowCountDownload}
                disabled={rowCountCancelled}
                style={{ marginLeft: '8px' }}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${rowCountCancelled ? 'warning' : 'success'}`}
              style={{ 
                width: `${(rowCountProgress.current / rowCountProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Progress Bar for Empty Tables Search */}
      {emptyTablesProgress.total > 0 && (
        <div className="progress-section animate-slideInDown">
          <div className="progress-header">
            <span className="progress-text">
              {emptyTablesCancelled ? 'Cancelling empty tables search...' : `Searching empty tables... (${emptyTablesProgress.current}/${emptyTablesProgress.total})`}
            </span>
            <div className="progress-actions">
              <span className="progress-text">
                {Math.round((emptyTablesProgress.current / emptyTablesProgress.total) * 100)}%
              </span>
              <Button
                danger
                size="small"
                loading={emptyTablesCancelled}
                onClick={onCancelEmptyTablesDownload}
                disabled={emptyTablesCancelled}
                style={{ marginLeft: '8px' }}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${emptyTablesCancelled ? 'warning' : 'success'}`}
              style={{ 
                width: `${(emptyTablesProgress.current / emptyTablesProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

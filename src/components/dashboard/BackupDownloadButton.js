import React, { useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload } from '@coreui/icons'
import { downloadSchoolBackupZip } from '../../utils/csvBackup'

const BackupDownloadButton = ({
  onBackup,
  onSuccess,
  onError,
  variant = 'outline',
  color = 'secondary',
  size = 'sm',
  className = '',
  label = 'Download full backup (CSV)',
}) => {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      const backupData = await onBackup()
      const { filename, meta } = downloadSchoolBackupZip(backupData)
      onSuccess?.(
        `Backup saved as ${filename} (${meta.studentCount} students, ${meta.paymentCount} payments)`,
        meta,
      )
    } catch (err) {
      console.error('Backup export failed:', err)
      onError?.(err.message || 'Failed to create backup')
    } finally {
      setBusy(false)
    }
  }

  return (
    <CButton
      color={color}
      variant={variant}
      size={size}
      className={className}
      disabled={busy}
      onClick={handleClick}
      title="Export users, students, courses, cohorts, payments, login logs, and public sites as CSV files in a ZIP archive"
    >
      {busy ? (
        <CSpinner size="sm" className="me-1" />
      ) : (
        <CIcon icon={cilCloudDownload} className="me-1" />
      )}
      {busy ? 'Preparing backup…' : label}
    </CButton>
  )
}

export default BackupDownloadButton

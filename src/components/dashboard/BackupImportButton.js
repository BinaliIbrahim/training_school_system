import React, { useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudUpload } from '@coreui/icons'
import { parseBackupZipFile, importSchoolBackupZip, summarizeBackup } from '../../utils/csvImport'

const BackupImportButton = ({
  db,
  profile,
  onComplete,
  onSuccess,
  onError,
  variant = 'outline',
  color = 'warning',
  size = 'sm',
  className = '',
  label = 'Import backup',
}) => {
  const inputRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [summary, setSummary] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)

  const reset = () => {
    setFile(null)
    setParsed(null)
    setSummary(null)
    setConfirmed(false)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const closeModal = () => {
    if (busy) return
    setVisible(false)
    reset()
  }

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0]
    reset()
    if (!selected) return

    if (!selected.name.toLowerCase().endsWith('.zip')) {
      onError?.('Please select a .zip backup file exported from this system.')
      return
    }

    setFile(selected)
    setBusy(true)
    try {
      const data = await parseBackupZipFile(selected)
      setParsed(data)
      setSummary(summarizeBackup(data))
      setVisible(true)
    } catch (err) {
      console.error('Backup parse failed:', err)
      onError?.(err.message || 'Could not read backup file')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async () => {
    if (!parsed || !confirmed || busy) return
    setBusy(true)
    setProgress({ stage: 'starting', detail: 'Starting import…' })
    try {
      const stats = await importSchoolBackupZip(db, profile, parsed, setProgress)
      onSuccess?.(
        `Import complete: ${stats.students} students, ${stats.courses} courses, ${stats.cohorts} cohorts, ${stats.payments} payments restored.` +
          (stats.skipped ? ` (${stats.skipped} rows skipped — out of scope or missing accounts)` : '') +
          (stats.errors.length ? ` ${stats.errors.length} warning(s).` : ''),
        stats,
      )
      onComplete?.()
      closeModal()
    } catch (err) {
      console.error('Backup import failed:', err)
      onError?.(err.message || 'Import failed')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="d-none"
        onChange={handleFileChange}
      />
      <CButton
        color={color}
        variant={variant}
        size={size}
        className={className}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title="Restore data from a ZIP backup exported from this system"
      >
        {busy && !visible ? (
          <CSpinner size="sm" className="me-1" />
        ) : (
          <CIcon icon={cilCloudUpload} className="me-1" />
        )}
        {busy && !visible ? 'Reading file…' : label}
      </CButton>

      <CModal visible={visible} onClose={closeModal} backdrop={busy ? 'static' : true}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilCloudUpload} className="me-2" />
            Import backup
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {file && (
            <p className="mb-3">
              <strong>File:</strong> {file.name}
            </p>
          )}

          {summary && (
            <div className="sms-backup-summary mb-3">
              <div className="small fw-semibold text-muted mb-2">Records in this backup</div>
              <div className="d-flex flex-wrap gap-2">
                {[
                  ['Users', summary.users],
                  ['Students', summary.students],
                  ['Courses', summary.courses],
                  ['Cohorts', summary.cohorts],
                  ['Payments', summary.payments],
                  ['Public sites', summary.publicSites],
                ].map(([label, count]) => (
                  <span key={label} className="badge bg-secondary">
                    {label}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <CAlert color="warning" className="small">
            Import <strong>merges</strong> records by their saved IDs. Existing data with the same ID will be
            updated. This does not create new login accounts — user profiles must already exist in Firebase Auth.
            {profile?.role === 'admin' && (
              <> School admins can only restore data for their account and managed team members.</>
            )}
          </CAlert>

          <CFormCheck
            id="backup-import-confirm"
            className="mt-3"
            label="I understand this will update existing records in the database"
            checked={confirmed}
            disabled={busy}
            onChange={(e) => setConfirmed(e.target.checked)}
          />

          {busy && progress && (
            <div className="mt-3">
              <div className="small text-muted mb-1">{progress.detail || progress.stage}</div>
              <CProgress animated value={100} color="primary" />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeModal} disabled={busy}>
            Cancel
          </CButton>
          <CButton color="warning" disabled={!confirmed || busy} onClick={handleImport}>
            {busy ? (
              <>
                <CSpinner size="sm" className="me-1" /> Importing…
              </>
            ) : (
              'Restore backup'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default BackupImportButton

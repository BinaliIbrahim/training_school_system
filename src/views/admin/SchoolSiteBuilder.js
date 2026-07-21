import React, { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilGlobeAlt, cilSave, cilExternalLink, cilPlus, cilTrash } from '@coreui/icons'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import SchoolSiteView from '../../components/schoolSite/SchoolSiteView'
import { DEFAULT_SCHOOL_SITE, slugify } from '../../utils/schoolSiteDefaults'
import { fileToFirestorePhoto } from '../../utils/profilePhoto'

const SchoolSiteBuilderContent = () => {
  const { user, profile, role, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ ...DEFAULT_SCHOOL_SITE })
  const [savedSlug, setSavedSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const isAllowed = role === 'admin' || role === 'super-admin'

  useEffect(() => {
    if (!user?.uid || !isAllowed) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        const slug = userSnap.data()?.siteSlug
        if (slug) {
          const siteSnap = await getDoc(doc(db, 'publicSites', slug))
          if (siteSnap.exists()) {
            setForm({ ...DEFAULT_SCHOOL_SITE, ...siteSnap.data() })
            setSavedSlug(slug)
          }
        }
        if (!slug && profile?.fullName) {
          setForm((f) => ({
            ...f,
            schoolName: profile.fullName + "'s School",
            slug: slugify(profile.fullName),
            contactEmail: profile.email || user.email || '',
            contactPhone: profile.phone || '',
          }))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid, isAllowed, profile])

  const showMsg = (msg, color = 'success') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 4000)
  }

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const updateListItem = (listKey, index, field, value) => {
    setForm((f) => {
      const list = [...(f[listKey] || [])]
      list[index] = { ...list[index], [field]: value }
      return { ...f, [listKey]: list }
    })
  }

  const addListItem = (listKey, template) => {
    setForm((f) => ({ ...f, [listKey]: [...(f[listKey] || []), { ...template }] }))
  }

  const removeListItem = (listKey, index) => {
    setForm((f) => ({
      ...f,
      [listKey]: (f[listKey] || []).filter((_, i) => i !== index),
    }))
  }

  const handleHeroImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToFirestorePhoto(file)
      updateField('heroImage', dataUrl)
    } catch (err) {
      showMsg(err.message, 'danger')
    }
    e.target.value = ''
  }

  const handlePublish = async () => {
    if (!user?.uid) return
    const slug = slugify(form.slug || form.schoolName)
    if (!slug || slug.length < 3) {
      showMsg('Choose a URL slug (at least 3 characters, letters and numbers only).', 'danger')
      return
    }
    if (!form.schoolName?.trim()) {
      showMsg('School name is required.', 'danger')
      return
    }

    setSaving(true)
    try {
      if (savedSlug && savedSlug !== slug) {
        const oldSnap = await getDoc(doc(db, 'publicSites', savedSlug))
        if (oldSnap.exists() && oldSnap.data().ownerId === user.uid) {
          await deleteDoc(doc(db, 'publicSites', savedSlug))
        }
      }

      const existing = await getDoc(doc(db, 'publicSites', slug))
      if (existing.exists() && existing.data().ownerId !== user.uid) {
        showMsg('This URL slug is already taken. Choose another.', 'danger')
        setSaving(false)
        return
      }

      const payload = {
        ...form,
        slug,
        ownerId: user.uid,
        ownerName: profile?.fullName || '',
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, 'publicSites', slug), payload)
      await setDoc(
        doc(db, 'users', user.uid),
        { siteSlug: slug },
        { merge: true },
      )

      setSavedSlug(slug)
      setForm((f) => ({ ...f, slug }))
      showMsg(form.published ? 'Site published! Share the link with your students.' : 'Draft saved.')
    } catch (err) {
      console.error(err)
      showMsg(
        err.code === 'permission-denied'
          ? 'Permission denied. Deploy the latest firestore.rules (Firebase Console → Firestore → Rules → Publish, or run: firebase deploy --only firestore:rules). Your account must have role admin or super-admin.'
          : 'Failed to save: ' + err.message,
        'danger',
      )
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />
  }

  const publicUrl = savedSlug ? `${window.location.origin}/school/${savedSlug}` : null

  return (
    <div className="sms-site-builder">
      {toast && (
        <CAlert color={toast.color} className="mb-3" dismissible onClose={() => setToast(null)}>
          {toast.msg}
        </CAlert>
      )}

      <div className="sms-page-hero mb-4">
        <div>
          <h1 className="sms-page-title mb-1">
            <CIcon icon={cilGlobeAlt} className="me-2" />
            My School Website
          </h1>
          <p className="sms-page-subtitle mb-0">
            Build a public landing page for your students — showcase your school, programmes, and contact info.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {publicUrl && (
            <CButton color="primary" variant="outline" href={publicUrl} target="_blank" rel="noopener noreferrer">
              <CIcon icon={cilExternalLink} className="me-1" /> View live site
            </CButton>
          )}
          <CButton color="primary" className="sms-btn-glow" onClick={handlePublish} disabled={saving}>
            <CIcon icon={cilSave} className="me-1" />
            {saving ? 'Saving…' : form.published ? 'Save & publish' : 'Save draft'}
          </CButton>
        </div>
      </div>

      <CRow className="g-4">
        <CCol xl={5} lg={6}>
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Basics</h5>
            <div className="mb-3">
              <CFormLabel>School name</CFormLabel>
              <CFormInput
                value={form.schoolName}
                onChange={(e) => {
                  updateField('schoolName', e.target.value)
                  if (!form.slug) updateField('slug', slugify(e.target.value))
                }}
                placeholder="e.g. Ibratech Training Academy"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Tagline</CFormLabel>
              <CFormInput
                value={form.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Short motto under your name"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Public URL slug</CFormLabel>
              <div className="input-group">
                <span className="input-group-text">/school/</span>
                <CFormInput
                  value={form.slug}
                  onChange={(e) => updateField('slug', slugify(e.target.value))}
                  placeholder="your-school-name"
                />
              </div>
              <small className="text-muted">Letters, numbers, and hyphens only.</small>
            </div>
            <CFormCheck
              className="mb-2"
              label="Published — visible to anyone with the link"
              checked={!!form.published}
              onChange={(e) => updateField('published', e.target.checked)}
            />
            {!form.published && (
              <CAlert color="warning" className="small py-2 mb-0">
                Your site is a <strong>draft</strong>. Check &quot;Published&quot; above, then click{' '}
                <strong>Save &amp; publish</strong> — otherwise <code>/school/{form.slug || 'your-slug'}</code>{' '}
                will not work for visitors.
              </CAlert>
            )}
            {form.published && savedSlug && (
              <CBadge color="success" className="mt-2">
                Live at /school/{savedSlug}
              </CBadge>
            )}
          </div>

          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Hero section</h5>
            <div className="mb-3">
              <CFormLabel>Headline</CFormLabel>
              <CFormInput value={form.heroTitle} onChange={(e) => updateField('heroTitle', e.target.value)} />
            </div>
            <div className="mb-3">
              <CFormLabel>Subheadline</CFormLabel>
              <CFormTextarea
                rows={2}
                value={form.heroSubtitle}
                onChange={(e) => updateField('heroSubtitle', e.target.value)}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Hero image (optional)</CFormLabel>
              <CFormInput type="file" accept="image/*" onChange={handleHeroImage} />
              {form.heroImage && (
                <CButton
                  size="sm"
                  color="danger"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => updateField('heroImage', null)}
                >
                  Remove image
                </CButton>
              )}
            </div>
            <div className="mb-3">
              <CFormLabel>Accent colour</CFormLabel>
              <CFormInput
                type="color"
                value={form.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                className="form-control-color"
              />
            </div>
          </div>

          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">About</h5>
            <div className="mb-3">
              <CFormLabel>Heading</CFormLabel>
              <CFormInput value={form.aboutHeading} onChange={(e) => updateField('aboutHeading', e.target.value)} />
            </div>
            <CFormTextarea
              rows={4}
              value={form.aboutBody}
              onChange={(e) => updateField('aboutBody', e.target.value)}
            />
          </div>

          <div className="sms-settings-card mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="sms-settings-card-title mb-0">Highlights</h5>
              <CButton
                size="sm"
                color="primary"
                variant="ghost"
                onClick={() => addListItem('features', { title: '', description: '' })}
              >
                <CIcon icon={cilPlus} /> Add
              </CButton>
            </div>
            {(form.features || []).map((f, i) => (
              <div key={i} className="sms-site-builder-list-item mb-3">
                <CFormInput
                  className="mb-2"
                  placeholder="Title"
                  value={f.title}
                  onChange={(e) => updateListItem('features', i, 'title', e.target.value)}
                />
                <CFormInput
                  placeholder="Description"
                  value={f.description}
                  onChange={(e) => updateListItem('features', i, 'description', e.target.value)}
                />
                <CButton size="sm" color="danger" variant="ghost" onClick={() => removeListItem('features', i)}>
                  <CIcon icon={cilTrash} />
                </CButton>
              </div>
            ))}
          </div>

          <div className="sms-settings-card mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="sms-settings-card-title mb-0">Programmes</h5>
              <CButton
                size="sm"
                color="primary"
                variant="ghost"
                onClick={() => addListItem('programs', { title: '', description: '', fee: '' })}
              >
                <CIcon icon={cilPlus} /> Add
              </CButton>
            </div>
            {(form.programs || []).map((p, i) => (
              <div key={i} className="sms-site-builder-list-item mb-3">
                <CFormInput
                  className="mb-2"
                  placeholder="Programme name"
                  value={p.title}
                  onChange={(e) => updateListItem('programs', i, 'title', e.target.value)}
                />
                <CFormInput
                  className="mb-2"
                  placeholder="Description"
                  value={p.description}
                  onChange={(e) => updateListItem('programs', i, 'description', e.target.value)}
                />
                <CFormInput
                  placeholder="Fee (optional, e.g. MK 55,000)"
                  value={p.fee}
                  onChange={(e) => updateListItem('programs', i, 'fee', e.target.value)}
                />
                <CButton size="sm" color="danger" variant="ghost" onClick={() => removeListItem('programs', i)}>
                  <CIcon icon={cilTrash} />
                </CButton>
              </div>
            ))}
          </div>

          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Contact & CTA</h5>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Phone</CFormLabel>
                <CFormInput value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Address</CFormLabel>
                <CFormInput value={form.contactAddress} onChange={(e) => updateField('contactAddress', e.target.value)} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Button text</CFormLabel>
                <CFormInput value={form.ctaText} onChange={(e) => updateField('ctaText', e.target.value)} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Button link</CFormLabel>
                <CFormInput value={form.ctaLink} onChange={(e) => updateField('ctaLink', e.target.value)} placeholder="/register" />
              </CCol>
            </CRow>
          </div>
        </CCol>

        <CCol xl={7} lg={6}>
          <div className="sms-site-preview-wrap">
            <div className="sms-site-preview-label">Live preview</div>
            <div className="sms-site-preview-frame">
              <SchoolSiteView site={form} preview />
            </div>
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

const SchoolSiteBuilder = () => (
  <ProtectedRoute>
    <SchoolSiteBuilderContent />
  </ProtectedRoute>
)

export default SchoolSiteBuilder

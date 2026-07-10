import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { CSpinner, CAlert, CButton } from '@coreui/react'
import { auth, db } from '../../firebase'
import SchoolSiteView from '../../components/schoolSite/SchoolSiteView'

const PublicSchoolSite = () => {
  const { slug } = useParams()
  const [site, setSite] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [draftPreview, setDraftPreview] = useState(false)
  const [uid, setUid] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid || null))
    return unsub
  }, [])

  useEffect(() => {
    if (!slug) return

    const load = async () => {
      setLoading(true)
      setError(null)
      setSite(null)
      setDraftPreview(false)

      try {
        const snap = await getDoc(doc(db, 'publicSites', slug))

        if (!snap.exists()) {
          setError({
            type: 'not_found',
            title: 'School page not found',
            message: `No website exists at /school/${slug}. The admin may need to create and publish it from My Website.`,
          })
          return
        }

        const data = snap.data()
        const isOwner = uid && data.ownerId === uid

        if (!data.published && !isOwner) {
          setError({
            type: 'unpublished',
            title: 'Not published yet',
            message:
              'This school page has been saved as a draft and is not visible to the public. The school admin must enable "Published" and save.',
          })
          return
        }

        setSite(data)
        setDraftPreview(!data.published && isOwner)
      } catch (err) {
        console.error(err)
        const denied = err.code === 'permission-denied'
        setError({
          type: denied ? 'rules' : 'load',
          title: denied ? 'Access blocked' : 'Could not load',
          message: denied
            ? 'Firestore rules may not be published yet. In Firebase Console → Firestore → Rules, publish the latest rules including publicSites.'
            : 'Something went wrong loading this page. Please try again later.',
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug, uid])

  if (loading) {
    return (
      <div className="sms-site-loading">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="sms-site-loading sms-site-error-page">
        <CAlert color={error.type === 'not_found' ? 'secondary' : 'warning'} className="sms-site-error-alert">
          <h5 className="alert-heading mb-2">{error.title}</h5>
          <p className="mb-3">{error.message}</p>
          <div className="d-flex flex-wrap gap-2">
            <CButton color="primary" as={Link} to="/">
              Go to SMS Pro home
            </CButton>
            <CButton color="secondary" variant="outline" as={Link} to="/admin/site">
              Open My Website builder
            </CButton>
          </div>
        </CAlert>
      </div>
    )
  }

  return (
    <>
      {draftPreview && (
        <div className="sms-site-draft-banner">
          <strong>Draft preview</strong> — only you can see this. Turn on{' '}
          <em>Published</em> in <Link to="/admin/site">My Website</Link> and click Save &amp; publish.
        </div>
      )}
      <SchoolSiteView site={site} />
    </>
  )
}

export default PublicSchoolSite

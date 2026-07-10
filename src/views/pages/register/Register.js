import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCol,
  CContainer,
  CFormInput,
  CRow,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilPhone, cilAt } from '@coreui/icons'
import AppLogo from '../../../components/brand/AppLogo'
import { auth, db } from '../../../firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { COORDINATOR_PERMISSIONS } from '../../../utils/permissions'

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Please fill in all required fields.')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    if (formData.phone && !formData.phone.match(/^\+265(99|88)\d{7}$/)) {
      setError('Please enter a valid Malawi phone number (e.g., +26599XXXXXX).')
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password,
      )
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        fullName: formData.fullName.trim(),
        phone: formData.phone || null,
        role: formData.role,
        roleID: formData.role,
        createdAt: new Date(),
        lastLogin: null,
        active: true,
        profileComplete: false,
        subscriptionstartdate: null,
        subscriptionenddate: null,
        hasUsedTrial: false,
        managedBy: null,
        permissions: { ...COORDINATOR_PERMISSIONS },
        canWrite: true,
      })

      navigate('/login', {
        state: { message: 'Account created successfully! Sign in to continue.' },
      })
    } catch (err) {
      let errorMessage = 'Unable to create account. Please try again.'
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered.'
          break
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.'
          break
        case 'auth/weak-password':
          errorMessage = 'Password must be at least 6 characters long.'
          break
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.'
          break
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.'
          break
        default:
          break
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      icon: cilUser,
      placeholder: 'Your full name',
      autoComplete: 'name',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      icon: cilAt,
      placeholder: 'you@school.com',
      autoComplete: 'email',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone (optional)',
      type: 'tel',
      icon: cilPhone,
      placeholder: '+26599XXXXXX',
      autoComplete: 'tel',
      required: false,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      icon: cilLockLocked,
      placeholder: '••••••••',
      autoComplete: 'new-password',
      required: true,
      minLength: 6,
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      icon: cilLockLocked,
      placeholder: '••••••••',
      autoComplete: 'new-password',
      required: true,
    },
  ]

  return (
    <div className="sms-auth-page" data-coreui-theme="light">
      <CContainer>
        <div className="sms-auth-card">
          <CRow className="g-0">
            <CCol lg={5} className="d-none d-lg-block">
              <div className="sms-auth-brand h-100">
                <AppLogo variant="full" size={160} showText={false} className="sms-auth-brand-logo mb-4" />
                <h2>SMS Pro</h2>
                <p>
                  Join thousands of educators using SMS Pro to manage students, track fees, and
                  run your school efficiently across Malawi.
                </p>
                <ul className="mt-4 ps-0 list-unstyled">
                  {['Free trial available', 'Secure cloud storage', 'Mobile money ready'].map((t) => (
                    <li key={t} className="mb-2 opacity-90">
                      ✓ {t}
                    </li>
                  ))}
                </ul>
              </div>
            </CCol>
            <CCol lg={7}>
              <div className="sms-auth-form">
                <h1>Create account</h1>
                <p className="sms-auth-subtitle">Start managing your school in minutes</p>

                {error && (
                  <CAlert color="danger" dismissible>
                    {error}
                  </CAlert>
                )}

                <form onSubmit={handleSubmit}>
                  {fields.map((field) => (
                    <div className="mb-3" key={field.name}>
                      <label className="form-label small fw-semibold">{field.label}</label>
                      <div className="sms-input-group d-flex align-items-center">
                        <span className="px-3 sms-input-icon">
                          <CIcon icon={field.icon} />
                        </span>
                        <CFormInput
                          className="border-0 shadow-none"
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder}
                          autoComplete={field.autoComplete}
                          value={formData[field.name]}
                          onChange={handleChange}
                          required={field.required}
                          minLength={field.minLength}
                        />
                      </div>
                    </div>
                  ))}

                  <input type="hidden" name="role" value={formData.role} />

                  <CButton
                    type="submit"
                    color="primary"
                    className="w-100 sms-btn-glow mb-3 mt-2"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </CButton>

                  <div className="text-center">
                    <span className="text-muted small">Already have an account? </span>
                    <Link to="/login" className="text-decoration-none fw-semibold">
                      Sign in →
                    </Link>
                  </div>
                </form>
              </div>
            </CCol>
          </CRow>
        </div>
      </CContainer>
    </div>
  )
}

export default Register

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CButton,
  CCol,
  CContainer,
  CFormInput,
  CRow,
  CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';
import AppLogo from '../../../components/brand/AppLogo';
import { auth, db } from '../../../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { isSubscriptionActive } from '../../../utils/subscription';
import { isUserApproved, APPROVAL, COORDINATOR_PERMISSIONS } from '../../../utils/permissions';
import { recordLoginLog } from '../../../utils/loginLogs';

const getHomeRoute = (role) => {
  const routes = {
    'super-admin': '/admin/control',
    admin: '/admin/control',
    teacher: '/team',
  };
  return routes[role] || '/dashboard';
};

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const loginPromise = signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password,
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 12000),
      );

      const userCredential = await Promise.race([loginPromise, timeoutPromise]);
      const user = userCredential.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found in database');
      }

      const userData = userSnap.data();

      if (!isUserApproved(userData)) {
        await signOut(auth).catch(() => {});
        if (userData.approvalStatus === APPROVAL.PENDING) {
          throw new Error('Your account is pending super-admin approval. Please try again later.');
        }
        throw new Error('Your account was not approved. Contact your administrator.');
      }

      // Legacy accounts: set default permissions once (admin/super-admin can revoke later)
      if (
        !userData.permissions &&
        !['admin', 'super-admin'].includes(userData.role)
      ) {
        try {
          await updateDoc(userRef, {
            permissions: { ...COORDINATOR_PERMISSIONS },
            canWrite: true,
          });
          userData.permissions = { ...COORDINATOR_PERMISSIONS };
          userData.canWrite = true;
        } catch (_) {
          /* rules may not be deployed yet — super-admin can set permissions manually */
        }
      } else if (
        userData.permissions?.create === true &&
        userData.canWrite !== true &&
        !['admin', 'super-admin'].includes(userData.role)
      ) {
        try {
          await updateDoc(userRef, { canWrite: true });
          userData.canWrite = true;
        } catch (_) {
          /* requires isCanWriteSync rule or super-admin re-save */
        }
      }

      await updateDoc(userRef, {
        lastLogin: new Date().toISOString(),
      });

      await recordLoginLog(user.uid, userData);

      const currentUser = {
        uid: user.uid,
        email: user.email,
        role: userData.role,
        roleID: userData.roleID || null,
        displayName: userData.fullName || user.displayName || 'User',
        phone: userData.phone || '',
      };

      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      const privilegedRoles = ['super-admin', 'admin', 'teacher'];
      if (privilegedRoles.includes(userData.role)) {
        if (userData.role === 'admin' && !isSubscriptionActive(userData.subscriptionenddate)) {
          navigate('/subscription', {
            state: { message: 'Subscribe to the Admin Plan (MWK 120,000/mo) to access your school dashboard.' },
          });
          return;
        }
        navigate(getHomeRoute(userData.role), {
          state: { message: `Welcome back, ${userData.fullName || 'User'}!` },
        });
        return;
      }

      if (!isSubscriptionActive(userData.subscriptionenddate)) {
        navigate('/subscription', {
          state: {
            message: userData.subscriptionenddate
              ? 'Your subscription has expired. Renew to continue.'
              : 'Start your free trial or subscribe to access SMS Pro.',
          },
        });
        return;
      }

      navigate('/dashboard', { state: { message: 'Welcome back!' } });
    } catch (err) {
      let message = 'Invalid email or password. Please try again.';
      if (err.message.includes('timed out')) {
        message = 'Request timed out. Check your internet connection.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.message.includes('profile not found')) {
        message = 'Account not fully set up. Contact support.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    setError('');
    setSuccess('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, formData.email.trim(), {
        url: 'https://sms.ibratechinnovations.com/login',
      });
      setSuccess('Password reset link sent! Check your email.');
      setFormData((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset link. Try again later.');
      }
    } finally {
      setResetLoading(false);
    }
  };

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
                  Manage students, track payments, and grow your school — all from one beautiful
                  dashboard built for Malawi&apos;s educators.
                </p>
                <ul className="mt-4 ps-0 list-unstyled">
                  {['Real-time tracking', 'Team management', 'Mobile money ready'].map((t) => (
                    <li key={t} className="mb-2 opacity-90">
                      ✓ {t}
                    </li>
                  ))}
                </ul>
              </div>
            </CCol>
            <CCol lg={7}>
              <div className="sms-auth-form">
                <h1>Welcome back</h1>
                <p className="sms-auth-subtitle">Sign in to your account</p>

                {error && (
                  <CAlert color="danger" dismissible>
                    {error}
                  </CAlert>
                )}
                {success && (
                  <CAlert color="success" dismissible>
                    {success}
                  </CAlert>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email</label>
                    <div className="sms-input-group d-flex align-items-center">
                      <span className="px-3 sms-input-icon">
                        <CIcon icon={cilUser} />
                      </span>
                      <CFormInput
                        className="border-0 shadow-none"
                        placeholder="you@school.com"
                        autoComplete="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold">Password</label>
                    <div className="sms-input-group d-flex align-items-center">
                      <span className="px-3 sms-input-icon">
                        <CIcon icon={cilLockLocked} />
                      </span>
                      <CFormInput
                        className="border-0 shadow-none"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <CButton
                    type="submit"
                    color="primary"
                    className="w-100 sms-btn-glow mb-3"
                    disabled={loading || resetLoading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </CButton>

                  <div className="d-flex justify-content-between align-items-center">
                    <CButton
                      color="link"
                      className="px-0 text-decoration-none"
                      onClick={handleForgotPassword}
                      disabled={loading || resetLoading}
                    >
                      {resetLoading ? 'Sending...' : 'Forgot password?'}
                    </CButton>
                    <Link to="/register" className="text-decoration-none fw-semibold">
                      Create account →
                    </Link>
                  </div>
                </form>
              </div>
            </CCol>
          </CRow>
        </div>
      </CContainer>
    </div>
  );
};

export default Login;

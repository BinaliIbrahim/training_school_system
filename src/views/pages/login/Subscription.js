"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import axios from 'axios';
import {
  CButton,
  CFormInput,
  CFormSelect,
  CSpinner,
  CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilPhone,
  cilCreditCard,
  cilShieldAlt,
  cilCheckCircle,
  cilLockLocked,
  cilArrowRight,
} from '@coreui/icons';
import AppLogo from '../../../components/brand/AppLogo';
import {
  TRIAL_MONTHS,
  SUBSCRIPTION_AMOUNT,
  API_BASE_URL,
  formatSubscriptionStatus,
  isSubscriptionActive,
  formatMK,
  getSubscriptionAmount,
  getPlanLabel,
} from '../../../utils/subscription';
import { isUserApproved, APPROVAL } from '../../../utils/permissions';

const FEATURES = [
  'Real-time student & payment tracking',
  'Manage courses, cohorts & enrollments',
  'Role-based team access',
  'Beautiful analytics & PDF reports',
  'Mobile money payments built-in',
  'Priority support from Ibratech',
];

function Subscription() {
  const [user, loadingAuth] = useAuthState(getAuth());
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('');
  const [txRef, setTxRef] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loadingAuth) return;

    if (!user) {
      navigate('/login', {
        state: { message: 'Please sign in to access subscriptions.' },
      });
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, `users/${user.uid}`);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.role === 'super-admin') {
            navigate('/admin/control');
            return;
          }
          if (!isUserApproved(data)) {
            setError(
              data.approvalStatus === APPROVAL.PENDING
                ? 'Your account is pending super-admin approval.'
                : 'Your account was not approved.',
            );
            setLoading(false);
            return;
          }
          setUserData({
            uid: user.uid,
            email: data.email || user.email,
            fullName: data.fullName || 'User',
            role: data.role,
            phone: data.phone || '',
            subscriptionstartdate: data.subscriptionstartdate,
            subscriptionenddate: data.subscriptionenddate,
            hasUsedTrial: data.hasUsedTrial || false,
          });
          setPhone(data.phone || '');
          setHasUsedTrial(data.hasUsedTrial || false);
          setSubscriptionStatus(formatSubscriptionStatus(data));
        } else {
          setError('User profile not found. Please contact support.');
        }
      } catch (err) {
        setError('Failed to load user data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, loadingAuth, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentStatusParam = urlParams.get('status');
    const errorParam = urlParams.get('error');
    if (paymentStatusParam === 'paid') {
      setSuccess('Payment successful! Your subscription has been extended.');
      setPaymentStatus('successful');
      setTxRef(null);
      const userRef = doc(db, `users/${user.uid}`);
      getDoc(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserData((prev) => ({
            ...prev,
            subscriptionenddate: data.subscriptionenddate,
            hasUsedTrial: data.hasUsedTrial || false,
          }));
          setSubscriptionStatus(formatSubscriptionStatus(data));
        }
      });
    } else if (paymentStatusParam === 'not paid' && errorParam) {
      setError(decodeURIComponent(errorParam));
      setPaymentStatus('failed');
    }
  }, [location.search, user]);

  useEffect(() => {
    if (!txRef || !user) return;

    let retries = 10;
    const interval = setInterval(async () => {
      if (retries <= 0) {
        setError('Payment confirmation timed out. Check your phone or try again.');
        setPaymentStatus(null);
        setTxRef(null);
        clearInterval(interval);
        return;
      }

      try {
        const idToken = await user.getIdToken(true);
        const response = await axios.get(`${API_BASE_URL}/api/check-payment/${txRef}`, {
          headers: { Authorization: `Bearer ${idToken}` },
          timeout: 55000,
        });
        const { status, endDate } = response.data;
        setPaymentStatus(status);

        if (status === 'successful') {
          setSuccess(
            `Payment successful! Active until ${new Date(endDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}.`,
          );
          const userRef = doc(db, `users/${user.uid}`);
          const snapshot = await getDoc(userRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUserData((prev) => ({
              ...prev,
              subscriptionenddate: data.subscriptionenddate,
              hasUsedTrial: data.hasUsedTrial || false,
            }));
            setSubscriptionStatus(formatSubscriptionStatus(data));
          }
          await setDoc(doc(db, `users/${user.uid}/subscriptions`, txRef), {
            subscription_date: Timestamp.fromDate(new Date()),
            amount: getSubscriptionAmount(userData?.role),
            status: 'active',
          });
          await setDoc(doc(db, 'payments', txRef), {
            userId: user.uid,
            amount: getSubscriptionAmount(userData?.role),
            status: 'success',
            tx_ref: txRef,
            paymentType: 'tuition',
          });
          clearInterval(interval);
        } else if (status === 'failed') {
          setError('Payment failed. Please try again.');
          setPaymentStatus(null);
          setTxRef(null);
          clearInterval(interval);
        }
      } catch (err) {
        setError(
          'Error checking payment: ' +
            (err.code === 'ECONNABORTED' ? 'Request timed out.' : err.message),
        );
        setPaymentStatus(null);
        setTxRef(null);
        clearInterval(interval);
      }
      retries--;
    }, 10000);

    return () => clearInterval(interval);
  }, [txRef, user]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleStartTrial = async () => {
    if (hasUsedTrial) {
      setError('You already used your free trial. Subscribe to continue.');
      return;
    }

    setTrialLoading(true);
    setError('');
    setSuccess('');

    try {
      const idToken = await user.getIdToken(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/start-free-trial`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` }, timeout: 55000 },
      );

      if (response.status === 200) {
        const endDate = new Date(response.data.endDate);
        await updateDoc(doc(db, `users/${user.uid}`), {
          subscriptionstartdate: Timestamp.fromDate(new Date()),
          subscriptionenddate: Timestamp.fromDate(endDate),
          hasUsedTrial: true,
        });
        await setDoc(doc(db, `users/${user.uid}/subscriptions`, `trial-${user.uid}`), {
          subscription_date: Timestamp.fromDate(new Date()),
          amount: 0,
          status: 'active',
        });
        setSuccess(
          `${TRIAL_MONTHS}-month free trial started! Enjoy full access until ${endDate.toLocaleDateString('en-GB')}.`,
        );
        setHasUsedTrial(true);
        setUserData((prev) => ({
          ...prev,
          subscriptionenddate: endDate,
          hasUsedTrial: true,
        }));
        setSubscriptionStatus(formatSubscriptionStatus({ subscriptionenddate: endDate, hasUsedTrial: true }));
      }
    } catch (err) {
      setError(
        'Failed to start trial: ' + (err.response?.data?.message || err.message),
      );
    } finally {
      setTrialLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!phone.match(/^\+265(99|88)\d{7}$/)) {
      setError('Enter a valid Malawi number (e.g. +26599XXXXXX).');
      return;
    }
    if (!provider) {
      setError('Select Airtel or TNM.');
      return;
    }

    setPaymentLoading(true);
    setError('');
    setSuccess('');
    setPaymentStatus('pending');

    try {
      const idToken = await user.getIdToken(true);
      const planAmount = getSubscriptionAmount(userData?.role);
      const response = await axios.post(
        `${API_BASE_URL}/api/charge-mobile-money`,
        { amount: planAmount, currency: 'MWK', phone, provider },
        { headers: { Authorization: `Bearer ${idToken}` }, timeout: 55000 },
      );

      if (!response.data.checkout_url) {
        throw new Error('No checkout URL received.');
      }

      setTxRef(response.data.tx_ref);
      setCheckoutUrl(response.data.checkout_url);
      setSuccess(response.data.message || 'Check your phone to approve payment.');
    } catch (err) {
      setError('Payment failed: ' + (err.response?.data?.message || err.message));
      setPaymentStatus(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDashboardClick = () => {
    if (!isSubscriptionActive(userData?.subscriptionenddate)) {
      setError('Start a trial or subscribe first.');
      return;
    }
    const role = userData?.role;
    if (role === 'admin') navigate('/admin/overview');
    else if (role === 'super-admin') navigate('/admin/control');
    else if (role === 'teacher') navigate('/team');
    else navigate('/dashboard');
  };

  const planAmount = getSubscriptionAmount(userData?.role);
  const planLabel = getPlanLabel(userData?.role);
  const isActive = isSubscriptionActive(userData?.subscriptionenddate);
  const canStartTrial =
    !hasUsedTrial &&
    (!userData?.subscriptionenddate || !isActive);

  if (loading || loadingAuth) {
    return (
      <div className="sms-sub-page d-flex align-items-center justify-content-center">
        <div className="text-center">
          <CSpinner color="light" />
          <p className="mt-3 text-secondary">Loading your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sms-sub-page">
      <div className="sms-sub-hero">
        <AppLogo variant="full" size={100} showText={false} className="mb-3 mx-auto" />
        <h1>Unlock SMS Pro</h1>
        <p>
          The smartest way to run your school. Track students, payments, and growth — all in one
          beautiful dashboard.
        </p>
        <div
          className={`sms-status-pill ${isActive ? 'active' : 'expired'}`}
        >
          <CIcon icon={isActive ? cilCheckCircle : cilShieldAlt} />
          {subscriptionStatus}
        </div>
      </div>

      {error && (
        <div className="mx-auto mb-3" style={{ maxWidth: 480 }}>
          <CAlert color="danger">{error}</CAlert>
        </div>
      )}
      {success && (
        <div className="mx-auto mb-3" style={{ maxWidth: 480 }}>
          <CAlert color="success">{success}</CAlert>
        </div>
      )}

      <div className="sms-pricing-grid">
        <div className="sms-pricing-card">
          <h3 className="text-white mb-2">Free Trial</h3>
          <div className="sms-price">
            MWK 0 <span>/ {TRIAL_MONTHS} months</span>
          </div>
          <ul className="sms-feature-list">
            <li>Full access to every feature</li>
            <li>No credit card required</li>
            <li>Cancel anytime</li>
          </ul>
          {canStartTrial && (
            <CButton
              color="light"
              className="w-100 sms-btn-glow"
              onClick={handleStartTrial}
              disabled={trialLoading || paymentStatus === 'pending'}
            >
              {trialLoading ? 'Starting...' : `Start ${TRIAL_MONTHS}-Month Trial`}
            </CButton>
          )}
          {hasUsedTrial && !isActive && (
            <p className="text-muted small mb-0">Trial already used — choose Pro below.</p>
          )}
        </div>

        <div className="sms-pricing-card featured">
          <h3 className="text-white mb-2">{planLabel}</h3>
          <div className="sms-price">
            {formatMK(planAmount).replace('MWK', 'MWK ')}{' '}
            <span>/ month</span>
          </div>
          {userData?.role === 'admin' && (
            <p className="small text-warning mb-2">
              Admin schools manage their own subscription — only you can pay for this plan.
            </p>
          )}
          <ul className="sms-feature-list">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="small text-secondary mb-0">
            Pay securely with Airtel Money or TNM Mpamba
          </p>
        </div>
      </div>

      <div className="sms-pay-panel">
        <h4 className="text-white mb-3 d-flex align-items-center gap-2">
          <CIcon icon={cilCreditCard} />
          Complete Payment
        </h4>

        <div className="mb-3">
          <label className="form-label text-secondary small">Mobile Number</label>
          <div className="sms-input-group d-flex align-items-center bg-dark">
            <span className="px-3 text-secondary">
              <CIcon icon={cilPhone} />
            </span>
            <CFormInput
              className="border-0 bg-transparent text-white"
              placeholder="+26599XXXXXX"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label text-secondary small">Provider</label>
          <CFormSelect
            className="bg-dark text-white border-secondary"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="">Select provider</option>
            <option value="airtel">Airtel Money</option>
            <option value="tnm">TNM Mpamba</option>
          </CFormSelect>
        </div>

        <CButton
          color="primary"
          className="w-100 sms-btn-glow sms-pulse-cta mb-3"
          onClick={handlePayment}
          disabled={paymentLoading || paymentStatus === 'pending'}
        >
          {paymentLoading
            ? 'Processing...'
            : `Pay ${planAmount.toLocaleString()} MWK Now`}
        </CButton>

        {checkoutUrl && (
          <CButton
            color="light"
            className="w-100 mb-3"
            onClick={() => {
              window.open(checkoutUrl, '_blank');
              setCheckoutUrl(null);
            }}
          >
            Open Checkout Page
          </CButton>
        )}

        {paymentStatus === 'pending' && !checkoutUrl && (
          <p className="text-info small text-center mb-3">
            Waiting for confirmation — enter your PIN on your phone.
          </p>
        )}

        {isActive && (
          <CButton color="success" variant="outline" className="w-100" onClick={handleDashboardClick}>
            Go to Dashboard
            <CIcon icon={cilArrowRight} className="ms-2" />
          </CButton>
        )}
      </div>

      <div className="sms-trust-row">
        <span className="sms-trust-item">
          <CIcon icon={cilLockLocked} /> Secure payments
        </span>
        <span className="sms-trust-item">
          <CIcon icon={cilShieldAlt} /> Data protected
        </span>
        <span className="sms-trust-item">
          <CIcon icon={cilCheckCircle} /> Instant activation
        </span>
      </div>
    </div>
  );
}

export default Subscription;

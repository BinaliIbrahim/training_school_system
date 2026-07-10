import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CForm, CFormInput, CFormTextarea, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilChartLine,
  cilShieldAlt,
  cilPhone,
  cilEnvelopeClosed,
  cilLocationPin,
  cilStar,
  cilCheckCircle,
  cilUserPlus,
  cilArrowRight,
  cilMenu,
  cilMoney,
  cilGlobeAlt,
  cilDescription,
  cilLockLocked,
} from '@coreui/icons'
import {
  TRIAL_MONTHS,
  SUBSCRIPTION_AMOUNT,
  ADMIN_SUBSCRIPTION_AMOUNT,
} from '../../../utils/subscription'
import AppLogo from '../../../components/brand/AppLogo'
import { BRAND_NAME } from '../../../constants/brand'

const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'contact', label: 'Contact' },
]

const FEATURES = [
  {
    icon: cilPeople,
    color: 'rgba(99, 102, 241, 0.2)',
    iconColor: '#a5b4fc',
    title: 'Student & Cohort Management',
    desc: 'Register students, organise them into cohorts and courses, and keep every record in one secure workspace.',
  },
  {
    icon: cilMoney,
    color: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#34d399',
    title: 'Fee Collection & Payments',
    desc: 'Track payments, send reminders, and accept mobile money via Airtel Money and TNM Mpamba through PayChangu.',
  },
  {
    icon: cilShieldAlt,
    color: 'rgba(6, 182, 212, 0.2)',
    iconColor: '#67e8f9',
    title: 'Role-Based Permissions',
    desc: 'Admins control who can create, edit, or delete data. Give your team exactly the access they need.',
  },
  {
    icon: cilChartLine,
    color: 'rgba(251, 191, 36, 0.2)',
    iconColor: '#fbbf24',
    title: 'Analytics & PDF Reports',
    desc: 'Visual dashboards and exportable reports so you always know enrolment, revenue, and outstanding fees.',
  },
  {
    icon: cilGlobeAlt,
    color: 'rgba(244, 114, 182, 0.2)',
    iconColor: '#f472b6',
    title: 'Custom School Website',
    desc: 'Admins publish a branded public page at your own URL — showcase programmes, contact info, and more.',
  },
  {
    icon: cilLockLocked,
    color: 'rgba(139, 92, 246, 0.2)',
    iconColor: '#c4b5fd',
    title: 'Secure Cloud Platform',
    desc: 'Built with real-time sync. Access your school data anywhere, on any device.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'SMS Pro replaced our spreadsheets overnight. Fee tracking and student records are finally in one place.',
    name: 'Grace Mwale',
    role: 'School Administrator, Lilongwe',
  },
  {
    quote:
      'Mobile money payments through the platform saved us hours every week. Parents love the convenience.',
    name: 'James Phiri',
    role: 'Training Centre Director, Blantyre',
  },
  {
    quote:
      'The permission system lets me delegate to coordinators without worrying about data being deleted.',
    name: 'Mercy Banda',
    role: 'Institution Owner, Mzuzu',
  },
]

const formatMwk = (amount) => `MK ${amount.toLocaleString()}`

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId)
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 72
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMenuOpen(false)
  }

  return (
    <div className="sms-landing">
      <header className="sms-landing-nav">
        <div className="sms-landing-nav-inner">
          <a href="#home" className="sms-landing-brand" onClick={(e) => { e.preventDefault(); scrollToSection('home') }}>
            <AppLogo variant="mark" size={36} showText subtitle="SMS Pro" className="sms-landing-brand-logo" />
          </a>

          <ul className="sms-landing-nav-links">
            {NAV_ITEMS.map(({ id, label }) => (
              <li key={id}>
                <button type="button" className="sms-landing-nav-link" onClick={() => scrollToSection(id)}>
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="sms-landing-nav-actions">
            <Link to="/login" className="sms-landing-btn-ghost py-2 px-3">
              Login
            </Link>
            <Link to="/register" className="sms-landing-btn-primary py-2 px-3">
              <CIcon icon={cilUserPlus} className="me-1" />
              Get Started
            </Link>
            <button
              type="button"
              className="sms-landing-menu-btn"
              aria-label="Open menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <CIcon icon={cilMenu} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="sms-landing-mobile-nav">
            {NAV_ITEMS.map(({ id, label }) => (
              <button key={id} type="button" className="sms-landing-nav-link" onClick={() => scrollToSection(id)}>
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <section id="home" className="sms-landing-hero">
        <div className="sms-landing-hero-inner">
          <div>
            <div className="sms-landing-hero-badge">
              <CIcon icon={cilStar} size="sm" />
              Built for Malawian schools & training centres
            </div>
            <h1>
              Run your school with <span>clarity & control</span>
            </h1>
            <p className="sms-landing-hero-lead">
              SMS Pro is Ibratech Innovation&apos;s all-in-one platform for managing students, cohorts,
              courses, and fee payments — with mobile money, team permissions, and analytics built in.
            </p>
            <div className="sms-landing-hero-actions">
              <Link to="/register" className="sms-landing-btn-primary">
                Start Free Trial
                <CIcon icon={cilArrowRight} className="ms-2" />
              </Link>
              <button type="button" className="sms-landing-btn-ghost" onClick={() => scrollToSection('how-it-works')}>
                See How It Works
              </button>
            </div>
            <div className="sms-landing-hero-stats">
              <div className="sms-landing-stat">
                <div className="sms-landing-stat-val">{TRIAL_MONTHS} mo</div>
                <div className="sms-landing-stat-lbl">Free trial</div>
              </div>
              <div className="sms-landing-stat">
                <div className="sms-landing-stat-val">100%</div>
                <div className="sms-landing-stat-lbl">Cloud based</div>
              </div>
              <div className="sms-landing-stat">
                <div className="sms-landing-stat-val">MWK</div>
                <div className="sms-landing-stat-lbl">Mobile money</div>
              </div>
            </div>
          </div>

          <div className="sms-landing-preview" aria-hidden="true">
            <div className="sms-landing-preview-bar">
              <span className="sms-landing-preview-dot" />
              <span className="sms-landing-preview-dot" />
              <span className="sms-landing-preview-dot" />
            </div>
            <div className="sms-landing-preview-body">
              <div className="sms-landing-preview-kpis">
                <div className="sms-landing-preview-kpi">
                  <span>Active students</span>
                  <strong>248</strong>
                </div>
                <div className="sms-landing-preview-kpi">
                  <span>Collected this month</span>
                  <strong>MK 1.2M</strong>
                </div>
              </div>
              <div className="sms-landing-preview-rows">
                <div className="sms-landing-preview-row">
                  <span>Chisomo B. — Web Dev Cohort</span>
                  <span className="paid">Paid</span>
                </div>
                <div className="sms-landing-preview-row">
                  <span>Thokozani K. — Data Science</span>
                  <span className="paid">Paid</span>
                </div>
                <div className="sms-landing-preview-row">
                  <span>Patricia M. — Business Admin</span>
                  <span style={{ color: '#fbbf24' }}>Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="sms-landing-section">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>What is SMS Pro?</h2>
            <p>
              A school management system designed for institutions that need more than spreadsheets —
              from enrolment and cohort tracking to fee collection and team collaboration.
            </p>
          </div>
          <div className="sms-landing-pillars">
            <article className="sms-landing-pillar">
              <div className="sms-landing-pillar-icon sms-landing-pillar-icon--purple">
                <CIcon icon={cilPeople} />
              </div>
              <h3>Centralise your operations</h3>
              <p>
                Students, courses, cohorts, and payment history live in one dashboard. No more scattered
                files or duplicate records across staff.
              </p>
            </article>
            <article className="sms-landing-pillar">
              <div className="sms-landing-pillar-icon sms-landing-pillar-icon--cyan">
                <CIcon icon={cilMoney} />
              </div>
              <h3>Get paid faster</h3>
              <p>
                Accept Airtel Money and TNM Mpamba payments online. Automatic subscription billing keeps
                your institution running without manual follow-ups.
              </p>
            </article>
            <article className="sms-landing-pillar">
              <div className="sms-landing-pillar-icon sms-landing-pillar-icon--green">
                <CIcon icon={cilShieldAlt} />
              </div>
              <h3>Control who does what</h3>
              <p>
                Admins assign create, edit, and delete permissions per user. Coordinators work efficiently
                without risking sensitive data.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="sms-landing-section">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>How it works</h2>
            <p>Go from sign-up to a fully running school workspace in four simple steps.</p>
          </div>
          <div className="sms-landing-steps">
            <div className="sms-landing-step">
              <div className="sms-landing-step-num">1</div>
              <h3>Create your account</h3>
              <p>Register as an admin or coordinator and start your {TRIAL_MONTHS}-month free trial instantly.</p>
            </div>
            <div className="sms-landing-step">
              <div className="sms-landing-step-num">2</div>
              <h3>Set up your workspace</h3>
              <p>Add courses, cohorts, and students. Invite team members with the permissions they need.</p>
            </div>
            <div className="sms-landing-step">
              <div className="sms-landing-step-num">3</div>
              <h3>Collect fees online</h3>
              <p>Track payments and accept mobile money. Generate PDF reports for accounting and audits.</p>
            </div>
            <div className="sms-landing-step">
              <div className="sms-landing-step-num">4</div>
              <h3>Grow your presence</h3>
              <p>Admins publish a custom school website so prospective students can learn about your programmes.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="sms-landing-section sms-landing-features">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>Everything your school needs</h2>
            <p>Powerful tools that match how Malawian institutions actually operate day to day.</p>
          </div>
          <div className="sms-landing-features-grid">
            {FEATURES.map(({ icon, color, iconColor, title, desc }) => (
              <article key={title} className="sms-landing-feature">
                <div className="sms-landing-feature-top">
                  <div className="sms-landing-feature-icon" style={{ background: color, color: iconColor }}>
                    <CIcon icon={icon} />
                  </div>
                  <h3>{title}</h3>
                </div>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="sms-landing-section">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>Simple, transparent pricing</h2>
            <p>
              Every new account gets a {TRIAL_MONTHS}-month free trial. Choose the plan that fits your role.
            </p>
          </div>
          <div className="sms-landing-pricing-grid">
            <article className="sms-landing-price-card">
              <div className="sms-landing-price-label">Pro Plan</div>
              <div className="sms-landing-price-amount">
                {formatMwk(SUBSCRIPTION_AMOUNT)}
                <small>/month</small>
              </div>
              <p className="sms-landing-price-desc">For coordinators and staff managing day-to-day operations.</p>
              <ul className="sms-landing-price-list">
                <li><CIcon icon={cilCheckCircle} size="sm" className="text-success" /> Student & cohort management</li>
                <li><CIcon icon={cilCheckCircle} size="sm" className="text-success" /> Payment tracking</li>
                <li><CIcon icon={cilCheckCircle} size="sm" className="text-success" /> Analytics & reports</li>
              </ul>
              <Link to="/register" className="sms-landing-btn-ghost w-100 justify-content-center">
                Get Started
              </Link>
            </article>
            <article className="sms-landing-price-card sms-landing-price-card--featured">
              <div className="sms-landing-price-label">Admin Plan</div>
              <div className="sms-landing-price-amount">
                {formatMwk(ADMIN_SUBSCRIPTION_AMOUNT)}
                <small>/month</small>
              </div>
              <p className="sms-landing-price-desc">Full control — team permissions, school website, and more.</p>
              <ul className="sms-landing-price-list">
                <li><CIcon icon={cilCheckCircle} size="sm" className="text-success" /> Everything in Pro</li>
                <li><CIcon icon={cilCheckCircle} size="sm" className="text-success" /> Manage users & permissions</li>
                <li><CIcon icon={cilCheckCircle} size="sm" className="text-success" /> Custom school website</li>
              </ul>
              <Link to="/register" className="sms-landing-btn-primary w-100 justify-content-center">
                Start Free Trial
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="sms-landing-section">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>Who is it for?</h2>
            <p>SMS Pro adapts to different roles within your institution.</p>
          </div>
          <div className="sms-landing-audience">
            <article className="sms-landing-audience-card">
              <h3>School & Training Centre Admins</h3>
              <ul>
                <li>Full workspace ownership</li>
                <li>Invite and manage team members</li>
                <li>Publish your public school website</li>
                <li>Oversee payments and subscriptions</li>
              </ul>
            </article>
            <article className="sms-landing-audience-card">
              <h3>Coordinators & Staff</h3>
              <ul>
                <li>Manage students, courses, and cohorts</li>
                <li>Record and track fee payments</li>
                <li>Generate reports for leadership</li>
                <li>Permissions tailored to your role</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="testimonials" className="sms-landing-section sms-landing-features">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>Trusted by educators</h2>
            <p>Schools across Malawi are simplifying operations with SMS Pro.</p>
          </div>
          <div className="sms-landing-testimonials">
            {TESTIMONIALS.map(({ quote, name, role }) => (
              <article key={name} className="sms-landing-testimonial">
                <div className="sms-landing-testimonial-stars">
                  {[...Array(5)].map((_, i) => (
                    <CIcon key={i} icon={cilStar} size="sm" />
                  ))}
                </div>
                <q>{quote}</q>
                <div className="sms-landing-testimonial-author">{name}</div>
                <div className="sms-landing-testimonial-role">{role}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sms-landing-cta">
        <h2>Ready to modernise your school?</h2>
        <p>
          Join institutions using SMS Pro to manage students, collect fees, and grow — all from one
          beautiful dashboard.
        </p>
        <Link to="/register" className="sms-landing-btn-primary">
          Create Free Account
          <CIcon icon={cilArrowRight} className="ms-2" />
        </Link>
        <p className="sms-landing-cta-note">
          {TRIAL_MONTHS}-month free trial · No credit card required · Cancel anytime
        </p>
      </section>

      <section id="contact" className="sms-landing-section">
        <div className="sms-landing-container">
          <div className="sms-landing-section-head">
            <h2>Get in touch</h2>
            <p>Have questions? Our team at Ibratech Innovations is here to help.</p>
          </div>
          <div className="sms-landing-contact-grid">
            <div>
              <div className="sms-landing-contact-item">
                <div className="sms-landing-contact-icon">
                  <CIcon icon={cilEnvelopeClosed} />
                </div>
                <div>
                  <strong>Email</strong>
                  <div className="text-muted small">ibratechinnovations@gmail.com</div>
                </div>
              </div>
              <div className="sms-landing-contact-item">
                <div className="sms-landing-contact-icon">
                  <CIcon icon={cilPhone} />
                </div>
                <div>
                  <strong>Phone</strong>
                  <div className="text-muted small">+265 990 40 10 74</div>
                </div>
              </div>
              <div className="sms-landing-contact-item">
                <div className="sms-landing-contact-icon">
                  <CIcon icon={cilLocationPin} />
                </div>
                <div>
                  <strong>Location</strong>
                  <div className="text-muted small">Blantyre, Malawi</div>
                </div>
              </div>
              <div className="sms-landing-contact-item">
                <div className="sms-landing-contact-icon">
                  <CIcon icon={cilDescription} />
                </div>
                <div>
                  <strong>Already registered?</strong>
                  <div>
                    <Link to="/login" className="text-info">Sign in to your dashboard →</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="sms-landing-contact-form">
              <CForm>
                <div className="mb-3">
                  <CFormInput type="text" placeholder="Your name" />
                </div>
                <div className="mb-3">
                  <CFormInput type="email" placeholder="Email address" />
                </div>
                <div className="mb-3">
                  <CFormTextarea rows={4} placeholder="How can we help you?" />
                </div>
                <CButton color="primary" className="w-100 rounded-pill">
                  Send Message
                </CButton>
              </CForm>
            </div>
          </div>
        </div>
      </section>

      <footer className="sms-landing-footer">
        <div className="sms-landing-footer-inner">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <AppLogo variant="mark" size={36} showText={false} />
            <span className="sms-landing-footer-tag">School Management System</span>
          </div>
          <div>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

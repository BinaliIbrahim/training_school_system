import React from 'react'
import { Link } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import {
  cilSchool,
  cilPhone,
  cilEnvelopeClosed,
  cilLocationPin,
  cilArrowRight,
  cilCheckCircle,
  cilBook,
} from '@coreui/icons'
import { DEFAULT_SCHOOL_SITE } from '../../utils/schoolSiteDefaults'

const SchoolSiteView = ({ site, preview = false }) => {
  const data = { ...DEFAULT_SCHOOL_SITE, ...site }
  const accent = data.accentColor || '#6366f1'

  return (
    <div className={`sms-school-site${preview ? ' sms-school-site--preview' : ''}`} style={{ '--site-accent': accent }}>
      <header className="sms-site-nav">
        <div className="sms-site-nav-inner">
          <div className="sms-site-brand">
            <span className="sms-site-brand-icon">
              <CIcon icon={cilSchool} />
            </span>
            <div>
              <div className="sms-site-brand-name">{data.schoolName || 'Your School'}</div>
              <div className="sms-site-brand-tag">{data.tagline}</div>
            </div>
          </div>
          {!preview && (
            <div className="sms-site-nav-actions">
              <a href="#about" className="sms-site-nav-link">About</a>
              <a href="#programs" className="sms-site-nav-link">Programs</a>
              <a href="#contact" className="sms-site-nav-link">Contact</a>
              <Link to={data.ctaLink || '/register'} className="sms-site-cta-btn">
                {data.ctaText || 'Register'} <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="sms-site-hero">
        <div className="sms-site-hero-inner">
          <div className="sms-site-hero-copy">
            <span className="sms-site-hero-badge">Admissions open</span>
            <h1>{data.heroTitle}</h1>
            <p>{data.heroSubtitle}</p>
            {!preview && (
              <Link to={data.ctaLink || '/register'} className="sms-site-cta-btn sms-site-cta-btn--lg">
                {data.ctaText || 'Register now'}
              </Link>
            )}
          </div>
          {data.heroImage ? (
            <div className="sms-site-hero-visual">
              <img src={data.heroImage} alt="" />
            </div>
          ) : (
            <div className="sms-site-hero-visual sms-site-hero-visual--placeholder">
              <CIcon icon={cilSchool} size="3xl" />
            </div>
          )}
        </div>
      </section>

      <section className="sms-site-features">
        <div className="sms-site-container">
          <div className="sms-site-features-grid">
            {(data.features || []).map((f, i) => (
              <div className="sms-site-feature-card" key={i}>
                <CIcon icon={cilCheckCircle} className="sms-site-feature-icon" />
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="sms-site-about">
        <div className="sms-site-container sms-site-about-inner">
          <h2>{data.aboutHeading}</h2>
          <p>{data.aboutBody}</p>
        </div>
      </section>

      <section id="programs" className="sms-site-programs">
        <div className="sms-site-container">
          <h2 className="sms-site-section-title">Our programmes</h2>
          <div className="sms-site-programs-grid">
            {(data.programs || []).map((p, i) => (
              <div className="sms-site-program-card" key={i}>
                <CIcon icon={cilBook} className="mb-2" />
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                {p.fee && <span className="sms-site-program-fee">{p.fee}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="sms-site-contact">
        <div className="sms-site-container sms-site-contact-inner">
          <h2>Get in touch</h2>
          <div className="sms-site-contact-list">
            {data.contactPhone && (
              <a href={`tel:${data.contactPhone}`} className="sms-site-contact-item">
                <CIcon icon={cilPhone} /> {data.contactPhone}
              </a>
            )}
            {data.contactEmail && (
              <a href={`mailto:${data.contactEmail}`} className="sms-site-contact-item">
                <CIcon icon={cilEnvelopeClosed} /> {data.contactEmail}
              </a>
            )}
            {data.contactAddress && (
              <div className="sms-site-contact-item">
                <CIcon icon={cilLocationPin} /> {data.contactAddress}
              </div>
            )}
          </div>
          {!preview && (
            <Link to={data.ctaLink || '/register'} className="sms-site-cta-btn sms-site-cta-btn--outline">
              {data.ctaText || 'Register now'}
            </Link>
          )}
        </div>
      </section>

      <footer className="sms-site-footer">
        <div className="sms-site-container">
          © {new Date().getFullYear()} {data.schoolName || 'School'} · Powered by SMS Pro
        </div>
      </footer>
    </div>
  )
}

export default SchoolSiteView

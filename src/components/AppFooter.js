import React from 'react'
import { CFooter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHeart } from '@coreui/icons'
import AppLogo from './brand/AppLogo'
import { PRODUCT_NAME } from '../constants/brand'

const AppFooter = () => {
  const currentYear = new Date().getFullYear()

  return (
    <CFooter className="sms-footer d-none d-lg-flex">
      <div className="sms-footer-inner">
        <div className="sms-footer-brand">
          <AppLogo variant="mark" size={40} showText subtitle={PRODUCT_NAME} />
          <div className="sms-footer-copy">
            <span className="sms-footer-muted">
              © {currentYear} · School Management System
            </span>
          </div>
        </div>

        <div className="sms-footer-powered">
          <span className="sms-footer-muted">Built with</span>
          <CIcon icon={cilHeart} className="sms-footer-heart" size="sm" aria-hidden="true" />
          <a
            href="https://ibratechinnovations.com"
            target="_blank"
            rel="noopener noreferrer"
            className="sms-footer-credit"
          >
            Ibratech Innovations
          </a>
        </div>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)

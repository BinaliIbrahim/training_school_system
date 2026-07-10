import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { BRAND_NAME, PRODUCT_NAME, LOGO_FULL, LOGO_ICON } from '../../constants/brand'

/**
 * Ibratech Innovations logo
 * - mark: circular icon mark
 * - full: complete logo with IBRATECH INNOVATIONS text
 */
const AppLogo = ({
  variant = 'mark',
  size = 40,
  showText = false,
  className,
  subtitle,
}) => {
  const isFull = variant === 'full'
  const src = isFull ? LOGO_FULL : LOGO_ICON
  const imgStyle = isFull
    ? { width: `${size}px`, height: 'auto', maxWidth: `${size}px` }
    : { width: `${size}px`, height: `${size}px` }

  return (
    <span
      className={classNames(
        'sms-app-logo',
        isFull ? 'sms-app-logo--full' : 'sms-app-logo--mark',
        className,
      )}
    >
      <img
        src={src}
        alt={`${BRAND_NAME} — ${PRODUCT_NAME}`}
        className={classNames('sms-app-logo-img', isFull && 'sms-app-logo-img--full')}
        width={isFull ? Math.round(size * 1.05) : size}
        height={size}
        style={imgStyle}
        loading="eager"
        decoding="async"
      />
      {showText && !isFull && (
        <span className="sms-app-logo-text">
          <span className="sms-app-logo-name">{BRAND_NAME}</span>
          {subtitle !== false && (
            <span className="sms-app-logo-sub">{subtitle || PRODUCT_NAME}</span>
          )}
        </span>
      )}
      {showText && isFull && subtitle !== false && (
        <span className="sms-app-logo-text sms-app-logo-text--solo">
          <span className="sms-app-logo-sub">{subtitle || PRODUCT_NAME}</span>
        </span>
      )}
    </span>
  )
}

AppLogo.propTypes = {
  variant: PropTypes.oneOf(['mark', 'full', 'icon']),
  size: PropTypes.number,
  showText: PropTypes.bool,
  className: PropTypes.string,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
}

export default AppLogo

import React, { useMemo } from 'react'
import { CPagination, CPaginationItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilArrowRight } from '@coreui/icons'

/** Shows Prev / Next + windowed page numbers (max 7 visible). */
const SmartPagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = useMemo(() => {
    if (totalPages <= 1) return []
    const delta = 2
    const range = []
    const rangeWithDots = []
    let l

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i)
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1)
        else if (i - l !== 1) rangeWithDots.push('…')
      }
      rangeWithDots.push(i)
      l = i
    }
    return rangeWithDots
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  return (
    <div className="sms-pagination-wrap">
      <div className="sms-pagination-info">
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </div>
      <CPagination className="sms-pagination mb-0">
        <CPaginationItem
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="sms-page-btn"
        >
          <CIcon icon={cilArrowLeft} /> Prev
        </CPaginationItem>
        {pages.map((page, idx) =>
          page === '…' ? (
            <CPaginationItem key={`dot-${idx}`} disabled className="sms-page-ellipsis">
              …
            </CPaginationItem>
          ) : (
            <CPaginationItem
              key={page}
              active={page === currentPage}
              onClick={() => onPageChange(page)}
              className="sms-page-num"
            >
              {page}
            </CPaginationItem>
          ),
        )}
        <CPaginationItem
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="sms-page-btn"
        >
          Next <CIcon icon={cilArrowRight} />
        </CPaginationItem>
      </CPagination>
    </div>
  )
}

export default SmartPagination

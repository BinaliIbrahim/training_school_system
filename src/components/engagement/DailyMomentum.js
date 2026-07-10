import React, { useEffect, useMemo, useState } from 'react'
import { CProgress } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBolt, cilStar } from '@coreui/icons'
import { useAuth } from '../../hooks/useAuth'
import {
  loadEngagement,
  getDailyProgress,
  getMotivation,
  DAILY_ACTION_GOAL,
} from '../../utils/engagement'

const DailyMomentum = ({ compact = false }) => {
  const { user } = useAuth()
  const [stats, setStats] = useState(() => loadEngagement(user?.uid))

  useEffect(() => {
    setStats(loadEngagement(user?.uid))
    const onUpdate = () => setStats(loadEngagement(user?.uid))
    window.addEventListener('sms-engagement-update', onUpdate)
    return () => window.removeEventListener('sms-engagement-update', onUpdate)
  }, [user?.uid])

  const progress = useMemo(() => getDailyProgress(stats.actionsToday), [stats.actionsToday])
  const message = useMemo(
    () => getMotivation({ streak: stats.streak, actionsToday: stats.actionsToday, progress }),
    [stats.streak, stats.actionsToday, progress],
  )

  if (!user?.uid) return null

  if (compact) {
    return (
      <div className="sms-momentum sms-momentum--compact">
        <CIcon icon={cilBolt} className="sms-momentum-bolt" />
        <span className="sms-momentum-streak">{stats.streak || 0}d streak</span>
        <span className="sms-momentum-dot">·</span>
        <span>{stats.actionsToday}/{DAILY_ACTION_GOAL} today</span>
      </div>
    )
  }

  return (
    <div className="sms-momentum sms-momentum--card">
      <div className="sms-momentum-top">
        <div className="sms-momentum-fire">
          <CIcon icon={cilBolt} size="lg" />
          <div>
            <div className="sms-momentum-streak-val">{stats.streak || 0}</div>
            <div className="sms-momentum-streak-lbl">day streak</div>
          </div>
        </div>
        <div className="sms-momentum-today">
          <CIcon icon={cilStar} className="me-1" />
          <strong>{stats.actionsToday}</strong>
          <span className="text-muted"> / {DAILY_ACTION_GOAL} actions today</span>
        </div>
      </div>
      <CProgress
        className="sms-momentum-bar mb-2"
        color={progress >= 100 ? 'success' : 'primary'}
        value={progress}
      />
      <p className="sms-momentum-msg mb-0">{message}</p>
    </div>
  )
}

export default DailyMomentum

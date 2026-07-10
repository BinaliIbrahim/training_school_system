import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'

export const useNotifications = (maxItems = 20) => {
  const [uid, setUid] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setUid(user?.uid || null))
    return unsubAuth
  }, [])

  useEffect(() => {
    if (!uid) {
      setNotifications([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.() || null,
          })),
        )
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [uid, maxItems])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = async (notificationId) => {
    if (!uid) return
    await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read: true })
  }

  const markAllRead = async () => {
    if (!uid) return
    const batch = writeBatch(db)
    notifications.filter((n) => !n.read).forEach((n) => {
      batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true })
    })
    await batch.commit()
  }

  return { notifications, unreadCount, loading, markRead, markAllRead }
}

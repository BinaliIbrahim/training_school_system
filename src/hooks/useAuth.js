import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(firebaseUser)

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) {
          const data = snap.data()
          const profileData = { id: firebaseUser.uid, email: firebaseUser.email, ...data }
          setProfile(profileData)
          localStorage.setItem(
            'currentUser',
            JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role,
              displayName: data.fullName || 'User',
              phone: data.phone || '',
            }),
          )
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoading(false)
      }
    })

    return unsub
  }, [])

  return {
    user,
    profile,
    loading,
    role: profile?.role || null,
    isAdmin: profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'super-admin',
  }
}

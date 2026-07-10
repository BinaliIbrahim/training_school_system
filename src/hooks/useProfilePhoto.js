import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { fileToFirestorePhoto } from '../utils/profilePhoto'

const MAX_FILE_BYTES = 5 * 1024 * 1024

export const useProfilePhoto = () => {
  const [userData, setUserData] = useState(null)
  const [photoURL, setPhotoURL] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let unsubDoc = () => {}

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubDoc()
      if (!firebaseUser) {
        setUserData(null)
        setPhotoURL(null)
        return
      }

      const uid = firebaseUser.uid
      const userRef = doc(db, 'users', uid)

      unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          const data = snap.exists() ? snap.data() : {}
          setUserData({
            uid,
            email: data.email || firebaseUser.email,
            fullName: data.fullName || firebaseUser.displayName || 'User',
          })
          setPhotoURL(data.photoURL || null)
        },
        (err) => {
          console.error('Profile photo snapshot error', err)
          setError('Could not load profile photo from Firestore.')
        },
      )
    })

    return () => {
      unsubAuth()
      unsubDoc()
    }
  }, [])

  const uploadPhoto = async (file) => {
    setError(null)

    const firebaseUser = auth.currentUser
    if (!file || !firebaseUser) {
      setError('You must be signed in to upload a photo.')
      return { success: false, error: 'Not signed in' }
    }

    if (!file.type?.startsWith('image/')) {
      const msg = 'Please choose a JPG, PNG, GIF, or WebP image.'
      setError(msg)
      return { success: false, error: msg }
    }

    if (file.size > MAX_FILE_BYTES) {
      const msg = 'Image must be 5 MB or smaller.'
      setError(msg)
      return { success: false, error: msg }
    }

    setUploading(true)

    try {
      const dataUrl = await fileToFirestorePhoto(file)
      const userRef = doc(db, 'users', firebaseUser.uid)

      await updateDoc(userRef, {
        photoURL: dataUrl,
        photoUpdatedAt: serverTimestamp(),
      })

      setPhotoURL(dataUrl)
      return { success: true, url: dataUrl }
    } catch (err) {
      console.error('Profile photo save error', err)
      let msg = 'Failed to save profile photo.'
      if (err.code === 'permission-denied') {
        msg = 'Save blocked. Publish firestore.rules in Firebase Console, then try again.'
      } else if (err.message) {
        msg = err.message
      }
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setUploading(false)
    }
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return { success: false }
    return uploadPhoto(file)
  }

  return {
    userData,
    photoURL,
    uploading,
    error,
    fileInputRef,
    openFilePicker,
    handleFileChange,
    uploadPhoto,
    clearError: () => setError(null),
  }
}

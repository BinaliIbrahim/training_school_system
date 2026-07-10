import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDSY5qE0F9PIsggCGd4PlX46jKyNHq1g6Y',
  authDomain: 'hostelrentalapp.firebaseapp.com',
  projectId: 'hostelrentalapp',
  storageBucket: 'hostelrentalapp.firebasestorage.app',
  messagingSenderId: '347443024230',
  appId: '1:347443024230:web:7ddce67ec9b6079ec7f8a7',
}

/** Secondary Firebase app so admins can create users without signing out. */
const secondaryApp =
  getApps().find((app) => app.name === 'Secondary') ||
  initializeApp(firebaseConfig, 'Secondary')

export const secondaryAuth = getAuth(secondaryApp)

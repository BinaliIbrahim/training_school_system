import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const SUBCOLLECTIONS = ['students', 'courses', 'cohorts', 'payments']
const BATCH_LIMIT = 400

/**
 * Move all school data from one user to another (preserves doc IDs, updates owner fields).
 */
export async function transferUserData(fromUid, toUid, targetProfile) {
  const ownerName = targetProfile.fullName || targetProfile.email || 'User'
  const ownerType = targetProfile.role || 'student'
  let transferred = 0

  for (const sub of SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', fromUid, sub))
    if (snap.empty) continue

    let batch = writeBatch(db)
    let ops = 0

    for (const docSnap of snap.docs) {
      const data = docSnap.data()
      const updated = {
        ...data,
        ownerId: toUid,
        ownerName,
        ownerType,
        transferredFrom: fromUid,
        transferredAt: new Date().toISOString(),
      }

      batch.set(doc(db, 'users', toUid, sub, docSnap.id), updated)
      batch.delete(doc(db, 'users', fromUid, sub, docSnap.id))
      ops += 2
      transferred += 1

      if (ops >= BATCH_LIMIT) {
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
      }
    }

    if (ops > 0) await batch.commit()
  }

  return transferred
}

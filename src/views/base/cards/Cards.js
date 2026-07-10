import { Navigate } from 'react-router-dom'

/** Legacy platform route — user management lives in ManageUsers */
const Cards = () => <Navigate to="/admin/users" replace />

export default Cards

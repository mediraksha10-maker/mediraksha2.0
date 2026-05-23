import { Toaster } from "react-hot-toast"
import { Route, Routes } from "react-router"

import DoctorPage from "./doc/DoctorPage"
import DoctorAuth from "./pages/DoctorAuth"

import Auth from "./pages/Auth"
import UserPage from "./user/UserPage"

function App() {
  return (
    <>
      <div><Toaster/></div>
      <div>
        <Routes>
            <Route path="/" element={<UserPage />} />
            <Route path="/doctor" element={<DoctorPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/doctor-auth" element={<DoctorAuth />} />
        </Routes>
      </div>

    </>
  )
}

export default App

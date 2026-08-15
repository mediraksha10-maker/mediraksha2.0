import { Toaster } from "react-hot-toast"
import { Navigate, Route, Routes } from "react-router"
import { useEffect, useState } from "react"

import DoctorPage from "./doc/DoctorPage"
import DoctorProfile from "./doc/DoctorProfile"

import Services from "./components/Services"
import UserProfile from './user/UserProfile'

import Splash from './components/Splash'

import Auth from "./pages/Auth"
import DoctorAuth from "./pages/DoctorAuth"

import UserPage from "./user/UserPage"
import Upload from "./service/Upload"
import Records from "./service/Records"
import RecordDetail from "./service/RecordDetail"
import CollectionDetail from "./service/CollectionDetail"
import Map from "./service/Map"
import Hospital from "./service/Hospital"
// import Health from "./service/Health" removing
import Disease from "./service/Disease"
import Chat from "./service/Chat"
import Appointment from "./service/Appointment"
import AddDoctor from "./service/AddDoctor"

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <Splash />;
  }
  return (
    <>
      <div><Toaster /></div>
      <div>
        <Routes>
          {/* Doctor Routes */}
          <Route path="/doctor" element={<DoctorPage />} />
          <Route path="/doctorprofile" element={<DoctorProfile />} />

          {/* Auth Routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/doctor-auth" element={<DoctorAuth />} />

          {/* User Routes */}
          <Route path="/" element={<UserPage />} />
          <Route path="/userprofile" element={<UserProfile />} />

          <Route path="/services" element={<Services />} />
          {/* Login not require */}
          <Route path="/map" element={<Map />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/hospital" element={<Hospital />} />
          <Route path="/disease" element={<Disease />} />

          {/* Login require */}
          <Route path="/upload" element={<Upload />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/doctoravailability" element={<Navigate to="/appointment" replace />} />
          <Route path="/adddoctor" element={<AddDoctor />} />


        </Routes>
      </div>

    </>
  )
}

export default App

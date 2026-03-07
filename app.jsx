import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./components/Login";
import UserDashboard from "./dashboards/UserDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import PoliceDashboard from "./dashboards/PoliceDashboard";
import StaffDashboard from "./dashboards/StaffDashboard";


export default function App() {
return (
<BrowserRouter>
<Routes>
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/user" element={<UserDashboard />} />
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/police" element={<PoliceDashboard />} />
<Route path="/staff" element={<StaffDashboard />} />
</Routes>
</BrowserRouter>
);
}
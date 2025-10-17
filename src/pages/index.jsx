import Layout from "./Layout.jsx";
import Login from "./Login";
import ProtectedRoute from "@/components/ProtectedRoute";

import Dashboard from "./Dashboard";

import Profile from "./Profile";

import Delegates from "./Delegates";

import Meetings from "./Meetings";

import Chat from "./Chat";

import Venues from "./Venues";

import Admin from "./Admin";

import Schedule from "./Schedule";

import Rooms from "./Rooms";

import RoomDetail from "./RoomDetail";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Profile: Profile,
    
    Delegates: Delegates,
    
    Meetings: Meetings,
    
    Chat: Chat,
    
    Venues: Venues,
    
    Admin: Admin,
    
    Schedule: Schedule,
    
    Rooms: Rooms,
    
    RoomDetail: RoomDetail,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    // Public route: Login page
    if (location.pathname === '/login') {
        return <Login />;
    }
    
    // All other routes are protected
    return (
        <ProtectedRoute>
            <Layout currentPageName={currentPage}>
                <Routes>            
                    
                        <Route path="/" element={<Dashboard />} />
                    
                    
                    <Route path="/Dashboard" element={<Dashboard />} />
                    
                    <Route path="/Profile" element={<Profile />} />
                    
                    <Route path="/Delegates" element={<Delegates />} />
                    
                    <Route path="/Meetings" element={<Meetings />} />
                    
                    <Route path="/Chat" element={<Chat />} />
                    
                    <Route path="/Venues" element={<Venues />} />
                    
                    <Route path="/Admin" element={<Admin />} />
                    
                    <Route path="/Schedule" element={<Schedule />} />
                    
                    <Route path="/Rooms" element={<Rooms />} />
                    
                    <Route path="/RoomDetail" element={<RoomDetail />} />
                    
                </Routes>
            </Layout>
        </ProtectedRoute>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
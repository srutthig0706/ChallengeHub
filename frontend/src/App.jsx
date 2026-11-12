import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CreateChallenge from "./pages/CreateChallenge";
import EditChallenge from "./pages/EditChallenge";
import MyChallenges from "./pages/MyChallenges";
import ChallengeDetails from "./pages/ChallengeDetails";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import Challenges from "./pages/Challenges";
import JoinedChallenges from "./pages/JoinedChallenges";
import SubmissionReview from "./pages/SubmissionReview";
import UserProfile from "./pages/UserProfile";
import ChallengeStats from "./pages/ChallengeStats";
import Notifications from "./pages/Notifications";
import NotificationBell from "./components/NotificationBell";
import { NotificationProvider } from "./context/NotificationContext";
import "./App.css";

function Nav() {
    const { isAuthenticated, logout, loading } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    if (loading) return null;

    return (
        <header className="header">
            <Link to="/" className="logo">ChallengeHub</Link>
            <nav>
                <ul className="nav-links">
                    <li><Link to="/">Home</Link></li>
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/dashboard">Dashboard</Link></li>
                            <li><Link to="/challenges">Explore</Link></li>
                            <li><Link to="/my-challenges">My Challenges</Link></li>
                            <li><Link to="/joined-challenges">Joined</Link></li>
                            <li><Link to="/communities">Communities</Link></li>
                            <li><Link to="/profile">Profile</Link></li>
                            <li><NotificationBell /></li>
                            <li><button onClick={handleLogout}>Logout</button></li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/challenges">Explore</Link></li>
                            <li><Link to="/login">Login</Link></li>
                            <li><Link to="/register">Register</Link></li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
}

function HomePage() {
    const { isAuthenticated } = useAuth();
    return (
        <main>
            <section className="hero">
                <h1>ChallengeHub</h1>
                <p className="slogan">Create. Challenge. Complete.</p>
                <p className="description">
                    Create challenges. Bring people together. Track progress. Complete goals.
                </p>
                {isAuthenticated && (
                    <Link to="/dashboard" className="btn-primary hero-cta">Go to Dashboard</Link>
                )}
                {!isAuthenticated && (
                    <Link to="/challenges" className="btn-primary hero-cta">Explore Challenges</Link>
                )}
            </section>
        </main>
    );
}

function AppLayout() {
    return (
        <div className="app">
            <Nav />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/create-challenge" element={<ProtectedRoute><CreateChallenge /></ProtectedRoute>} />
                <Route path="/my-challenges" element={<ProtectedRoute><MyChallenges /></ProtectedRoute>} />
                <Route path="/challenges/:id" element={<ChallengeDetails />} />
                <Route path="/challenges/:id/edit" element={<ProtectedRoute><EditChallenge /></ProtectedRoute>} />
                <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
                <Route path="/communities/:id" element={<ProtectedRoute><CommunityDetail /></ProtectedRoute>} />
                <Route path="/joined-challenges" element={<ProtectedRoute><JoinedChallenges /></ProtectedRoute>} />
                <Route path="/challenges/:id/review" element={<ProtectedRoute><SubmissionReview /></ProtectedRoute>} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/users/:id" element={<UserProfile />} />
                <Route path="/challenges/:id/stats" element={<ProtectedRoute><ChallengeStats /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            </Routes>
            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} ChallengeHub. All rights reserved.</p>
            </footer>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <NotificationProvider>
                    <AppLayout />
                </NotificationProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    useEffect(() => {
        const restore = async () => {
            const stored = localStorage.getItem("token");
            if (!stored) {
                setLoading(false);
                return;
            }
            try {
                const { data } = await api.get("/auth/me");
                setUser(data.user);
                setToken(stored);
            } catch {
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        restore();
    }, []);

    const login = async (identifier, password) => {
        const { data } = await api.post("/auth/login", { identifier, password });
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const register = async (formData) => {
        const { data } = await api.post("/auth/register", formData);
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout, register, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

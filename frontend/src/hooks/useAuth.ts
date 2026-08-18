"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@/types/chat";
import { api } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(() => {
    try {
      const storedToken = localStorage.getItem("ai_token");
      const storedUser = localStorage.getItem("ai_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => checkAuth();
    window.addEventListener("auth_change", handleAuthChange);
    return () => window.removeEventListener("auth_change", handleAuthChange);
  }, [checkAuth]);

  const login = async (passcode: string) => {
    const data = await api.verifyPasscode(passcode);
    localStorage.setItem("ai_token", data.token);
    localStorage.setItem("ai_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    window.dispatchEvent(new Event("auth_change"));
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ai_token");
    localStorage.removeItem("ai_user");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("auth_change"));
  };

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    login,
    logout,
  };
}

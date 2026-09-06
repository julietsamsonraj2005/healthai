import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, AuthTokens } from "@/types/models";
import { loginUser as apiLogin, registerUser as apiRegister } from "@/api/services";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, age: number, gender: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("healthai_user");
    const token = localStorage.getItem("healthai_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user, tokens } = await apiLogin(email, password);
      setUser(user);
      localStorage.setItem("healthai_user", JSON.stringify(user));
      localStorage.setItem("healthai_token", tokens.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, age: number, gender: string) => {
    setIsLoading(true);
    try {
      const { user, tokens } = await apiRegister(name, email, password, age, gender);
      setUser(user);
      localStorage.setItem("healthai_user", JSON.stringify(user));
      localStorage.setItem("healthai_token", tokens.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("healthai_user");
    localStorage.removeItem("healthai_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

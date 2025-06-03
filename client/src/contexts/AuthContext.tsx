// UPDATED AuthContext.tsx with better persistence
// --- SECTION: Imports ---
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser, registerUser, logoutUser, isAuthenticated } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// --- SECTION: Interface Definitions ---
interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  gradeLevel?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User }>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    gradeLevel?: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) => Promise<{ user: User }>;
  logout: () => void;
}

// --- SECTION: Context Creation ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- SECTION: AuthProvider Component ---
export function AuthProvider({ children }: { children: ReactNode }) {
  // --- SUB-SECTION: State and QueryClient ---
  const [user, setUser] = useState<User | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const queryClient = useQueryClient();

  // ✅ IMPROVED: Better authentication query with token persistence
  // --- SUB-SECTION: Authentication Query (useQuery) ---
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, user not authenticated");
        return null;
      }
      
      console.log("Token found, fetching user data...");
      const response = await fetch("/api/auth/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        console.log("Failed to fetch user, token might be expired");
        // ✅ DON'T clear token immediately, let user stay logged in for UX
        if (response.status === 401) {
          console.log("Token expired, will need re-login");
          localStorage.removeItem("token");
        }
        throw new Error("Failed to fetch user");
      }
      
      const userData = await response.json();
      console.log("User data fetched successfully:", userData);
      return userData;
    },
    retry: 1, // ✅ Retry once instead of multiple times
    staleTime: 10 * 60 * 1000, // ✅ 10 minutes instead of 5
    refetchOnWindowFocus: false,
    refetchOnMount: false, // ✅ Don't refetch on every mount
    enabled: !!localStorage.getItem("token"), // ✅ Only run if token exists
  });

  // ✅ IMPROVED: Better user state management with initial check
  // --- SUB-SECTION: Effects ---
  // --- Effect: User State Management from API Data ---
  useEffect(() => {
    console.log("AuthContext - Data:", data);
    console.log("AuthContext - Loading:", isLoading);
    console.log("AuthContext - Error:", error);
    
    if (data && data.user) {
      console.log("Setting user from API data:", data.user);
      setUser(data.user);
      setInitialCheckDone(true);
    } else if (!isLoading && error) {
      console.log("Error occurred, but keeping user logged in temporarily");
      // ✅ Don't immediately clear user on error - let them stay logged in
      setInitialCheckDone(true);
    } else if (!isLoading && !data) {
      console.log("No data and not loading, clearing user state");
      setUser(null);
      setInitialCheckDone(true);
    }
  }, [data, isLoading, error]);

  // ✅ NEW: Keep user logged in from localStorage until API confirms
  // --- Effect: Restore User from localStorage ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    
    if (token && savedUser && !user) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log("Restoring user from localStorage:", parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.log("Failed to parse saved user data");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // --- SUB-SECTION: Auth Functions ---
  const login = async (email: string, password: string) => {
    console.log("AuthContext - Login attempt for:", email);
    const response = await loginUser(email, password);
    console.log("AuthContext - Login successful:", response.user);
    
    // ✅ Save user to localStorage for persistence
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    
    // ✅ IMPROVED: Invalidate queries after a small delay to avoid race conditions
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }, 500);
    
    return { user: response.user };
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    gradeLevel?: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) => {
    console.log("AuthContext - Register attempt for:", userData.email);
    const response = await registerUser(userData);
    console.log("AuthContext - Registration successful:", response.user);
    
    // ✅ Save user to localStorage for persistence
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    
    // ✅ IMPROVED: Invalidate queries after a small delay for registration too
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }, 500);
    
    return { user: response.user };
  };

  const logout = () => {
    console.log("AuthContext - Logout");
    logoutUser();
    
    // ✅ Clear both token and user from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  // ✅ IMPROVED: Better loading state
  // --- SUB-SECTION: Loading State Calculation ---
  const contextLoading = isLoading && !initialCheckDone;

  // ✅ DEBUG: Log current auth state
  // --- SUB-SECTION: Debug Logging ---
  console.log("AuthContext - Current state:", {
    user: user ? `${user.firstName} ${user.lastName} (${user.role})` : null,
    loading: contextLoading,
    hasToken: !!localStorage.getItem("token"),
    initialCheckDone
  });

  // --- SUB-SECTION: Provider Return ---
  return (
    <AuthContext.Provider
      value={{
        user,
        loading: contextLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --- SECTION: useAuth Hook ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import { createContext, useContext, useState, useEffect } from "react";

// Create a shared authentication context
const AuthContext = createContext();

// Read the logged-in user from local storage
function getSavedUser() {
  const savedUser = localStorage.getItem("user");

  try {
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

// Share authentication information with the application
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);

  useEffect(() => {
    // Update user details when login or logout happens
    const updateUser = () => {
      setUser(getSavedUser());
    };

    window.addEventListener("userLogin", updateUser);
    window.addEventListener("userLogout", updateUser);
    window.addEventListener("userUpdate", updateUser);

    return () => {
      window.removeEventListener("userLogin", updateUser);
      window.removeEventListener("userLogout", updateUser);
      window.removeEventListener("userUpdate", updateUser);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to access authentication information
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
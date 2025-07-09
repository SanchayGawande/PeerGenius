import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import "../firebase"; // Initializes Firebase
import { addUserToDB } from "../utils/firebaseUserSync";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    let tokenRefreshInterval = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 Auth state changed:", firebaseUser ? `User logged in: ${firebaseUser.email}` : "User logged out");
      
      // Clear any existing interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }
      
      if (firebaseUser) {
        try {
          setUser(firebaseUser);
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          localStorage.setItem("token", idToken);
          console.log("✅ Token obtained for:", firebaseUser.email);
          
          // Set up token refresh
          const refreshToken = async () => {
            try {
              const newToken = await firebaseUser.getIdToken(true);
              setToken(newToken);
              localStorage.setItem("token", newToken);
            } catch (error) {
              console.error("Token refresh failed:", error);
              // If refresh fails, log user out
              await logout();
            }
          };

          // Refresh token every 50 minutes (tokens expire in 1 hour)
          tokenRefreshInterval = setInterval(refreshToken, 50 * 60 * 1000);
        } catch (error) {
          console.error("❌ Error getting token:", error);
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
        console.log("🚪 User logged out, token cleared");
      }
      setLoading(false);
      console.log("🏁 Auth loading completed");
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, []); // Remove user dependency to prevent infinite re-renders

  const login = async (email, password) => {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await addUserToDB();
    return userCredential;
  };

  const signup = async (email, password) => {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await addUserToDB();
    return userCredential;
  };

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      currentUser: user, 
      loading, 
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

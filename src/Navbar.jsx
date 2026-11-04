
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navigation.css";

function Navbar() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const navigate = useNavigate();

  useEffect(() => {
    const updateUser = () => {
      const savedUser = localStorage.getItem("user");
      setUser(savedUser ? JSON.parse(savedUser) : null);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    window.dispatchEvent(new Event("userLogout"));

    alert("Logged out successfully");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h2 className="navbar-logo">
        <Link to="/">DEV@Deakin</Link>
      </h2>

      <div className="nav-links">
        <a href="#about">About</a>
        <a href="#work">Work</a>
        <a href="#gallery">Gallery</a>
        <a href="#contact">Contact</a>

        <Link to="/pricing">Pricing</Link>
        <Link to="/post">Create Post</Link>
        <Link to="/browse-posts">Browse Posts</Link>

        {user ? (
          <>
           <span>
            Hi, {user.name} ({user.plan || "Free"} Plan)
          </span>

            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

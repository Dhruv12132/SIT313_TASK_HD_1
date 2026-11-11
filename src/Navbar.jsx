
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./Navigation.css";

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

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
        <a href="/#about">About</a>
        <a href="/#work">Work</a>
        <a href="/#gallery">Gallery</a>
        <a href="/#contact">Contact</a>

        {isAdmin ? (
          <Link to="/admin">Admin Dashboard</Link>
        ) : (
          <Link to="/pricing">Pricing</Link>
        )}

        {user && !isAdmin && (
          <Link to="/post">Create Post</Link>
        )}

        <Link to="/browse-posts">Browse Posts</Link>

        {user ? (
          <>
            <span className="navbar-user">
              {isAdmin
                ? "Hi, Admin"
                : `Hi, ${user.name} (${user.plan || "Free"} Plan)`}
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

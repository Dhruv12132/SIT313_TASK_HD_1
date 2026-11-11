
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../AuthContext";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    freeUsers: 0,
    paidUsers: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load dashboard statistics when the page opens
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:3000/admin/stats",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load statistics");
        }

        setStats(data);

      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "admin") {
      loadStats();
    }
  }, [user]);

  // Calculate subscription percentages
  const subscriptionPercentages = useMemo(() => {
    const total = stats.freeUsers + stats.paidUsers;

    if (total === 0) {
      return { free: 0, paid: 0 };
    }

    return {
      free: Math.round((stats.freeUsers / total) * 100),
      paid: Math.round((stats.paidUsers / total) * 100)
    };
  }, [stats.freeUsers, stats.paidUsers]);

  if (!user || user.role !== "admin") {
    return (
      <div className="admin-message">
        <h2>Access Denied</h2>
        <p>You are not authorised to view this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user.name || "Admin"}!</p>
        </div>

        <span className="admin-label">Administrator</span>
      </div>

      {loading && <p>Loading dashboard statistics...</p>}

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="admin-cards">
            <div className="admin-card">
              <h3>Total Users</h3>
              <p>{stats.totalUsers}</p>
            </div>

            <div className="admin-card">
              <h3>Total Posts</h3>
              <p>{stats.totalPosts}</p>
            </div>

            <div className="admin-card">
              <h3>Free Accounts</h3>
              <p>{stats.freeUsers}</p>
            </div>

            <div className="admin-card">
              <h3>Paid Accounts</h3>
              <p>{stats.paidUsers}</p>
            </div>
          </div>

          <div className="admin-management">
            <h2>Subscription Overview</h2>

            <p>Free accounts: {subscriptionPercentages.free}%</p>
            <p>Paid accounts: {subscriptionPercentages.paid}%</p>
          </div>
        </>
      )}

      <div className="admin-management">
        <h2>Platform Management</h2>

        {/* Manage Posts */}
        <div className="admin-management-card">
          <h3>Manage Posts</h3>
          <p>View and manage Free and Paid posts.</p>

          <Link
            to="/admin/posts"
            className="admin-action-button"
          >
            Manage Posts
          </Link>
        

        {/* Manage Users */}
        <div className="management-card">
          <h3>Manage Users</h3>
          <p>View and manage registered platform users.</p>

          <Link
            to="/admin/users"
            className="admin-action-button"
          >
            Manage Users
          </Link>
        </div>

      </div>
    </div>
    </div>
  );
}

export default AdminDashboard;


import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./ManageUsers.css";

function ManageUsers() {
    const { user } = useAuth();

    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [plan, setPlan] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);

    
// Fetch users when search, plan or page changes
useEffect(() => {
    let ignore = false;

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:3000/admin/users?search=${encodeURIComponent(search)}&plan=${plan}&page=${page}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch users");
            }

            if (!ignore) {
                setUsers(data.users || []);
                setTotalUsers(data.totalUsers || 0);
                setTotalPages(data.totalPages || 1);
                setError("");
            }

        } catch (err) {
            if (!ignore) {
                setError(err.message);
                setUsers([]);
                setTotalUsers(0);
                setTotalPages(1);
            }
        } finally {
            if (!ignore) {
                setLoading(false);
            }
        }
    };

    loadUsers();

    return () => {
        ignore = true;
    };
}, [search, plan, page]);


    // Handle search
    const handleSearch = (value) => {
        setLoading(true);
        setError("");
        setSearch(value);
        setPage(1);
    };

    // Handle subscription filter
    const handlePlanChange = (value) => {
        setLoading(true);
        setError("");
        setPlan(value);
        setPage(1);
    };

    // Handle pagination
    const handlePageChange = (newPage) => {
        setLoading(true);
        setError("");
        setPage(newPage);
    };

    // Check admin access
    if (!user || user.role !== "admin") {
        return (
            <div className="manage-users-page">
                <div className="users-message">
                    You are not authorised to access this page.
                    <br />
                    <Link to="/login">Go to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-users-page">
            <div className="manage-users-container">

                {/* Page Header */}
                <div className="users-header">
                    <div>
                        <Link to="/admin" className="users-back-link">
                            ← Back to Dashboard
                        </Link>

                        <h1>Manage Users</h1>
                        <p>View and manage registered platform users.</p>
                    </div>

                    <div className="users-total-card">
                        <span>Total Users</span>
                        <strong>{totalUsers}</strong>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="users-toolbar">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />

                    <select
                        value={plan}
                        onChange={(e) => handlePlanChange(e.target.value)}
                    >
                        <option value="All">All Plans</option>
                        <option value="Free">Free Plan</option>
                        <option value="Paid">Paid Plan</option>
                    </select>
                </div>

                {/* Users Table */}
                <div className="users-table-card">
                    {loading ? (
                        <div className="users-message">
                            Loading users...
                        </div>
                    ) : error ? (
                        <div className="users-error">
                            {error}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="users-message">
                            No users found.
                        </div>
                    ) : (
                        <div className="users-table-wrapper">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email Address</th>
                                        <th>Subscription</th>
                                        <th>Role</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {users.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="user-name-cell">
                                                    <div className="user-avatar">
                                                        {(item.name || "U")
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <span>{item.name}</span>
                                                </div>
                                            </td>

                                            <td>{item.email}</td>

                                            <td>
                                                <span
                                                    className={`user-plan-badge ${
                                                        item.plan === "Paid"
                                                            ? "paid"
                                                            : "free"
                                                    }`}
                                                >
                                                    {item.plan}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="user-role">
                                                    {item.role || "user"}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    className="user-view-button"
                                                    onClick={() =>
                                                        setSelectedUser(item)
                                                    }
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && totalUsers > 0 && (
                    <div className="users-pagination">
                        <span>
                            Page {page} of {totalPages}
                        </span>

                        <div>
                            <button
                                disabled={page <= 1}
                                onClick={() => handlePageChange(page - 1)}
                            >
                                Previous
                            </button>

                            <button
                                disabled={page >= totalPages}
                                onClick={() => handlePageChange(page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* User Details Modal */}
                {selectedUser && (
                    <div
                        className="user-modal-overlay"
                        onClick={() => setSelectedUser(null)}
                    >
                        <div
                            className="user-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="user-modal-close"
                                onClick={() => setSelectedUser(null)}
                            >
                                ×
                            </button>

                            <div className="user-modal-avatar">
                                {(selectedUser.name || "U")
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <h2>{selectedUser.name}</h2>

                            <p className="user-modal-subtitle">
                                User Information
                            </p>

                            <div className="user-detail-row">
                                <span>Email</span>
                                <strong>{selectedUser.email}</strong>
                            </div>

                            <div className="user-detail-row">
                                <span>Subscription Plan</span>
                                <strong>{selectedUser.plan}</strong>
                            </div>

                            <div className="user-detail-row">
                                <span>Account Role</span>
                                <strong>
                                    {selectedUser.role || "user"}
                                </strong>
                            </div>

                            <div className="user-detail-row">
                                <span>User ID</span>
                                <strong className="user-id">
                                    {selectedUser.id}
                                </strong>
                            </div>

                            <button
                                className="user-modal-done"
                                onClick={() => setSelectedUser(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default ManageUsers;

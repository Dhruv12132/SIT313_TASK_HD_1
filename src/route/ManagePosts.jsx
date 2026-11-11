
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import "../ManagePosts.css";

function ManagePosts() {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPost, setSelectedPost] = useState(null);
  const [deletePost, setDeletePost] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch posts whenever the search, filter or page changes
  useEffect(() => {
    const controller = new AbortController();

    async function fetchPosts() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        const params = new URLSearchParams({
          search: search,
          plan: planFilter,
          page: currentPage
        });

        const response = await fetch(
          `http://localhost:3000/admin/posts?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load posts");
        }

        setPosts(data.posts || []);
        setTotalPosts(data.totalPosts || 0);
        setTotalPages(data.totalPages || 1);

      } catch (error) {
        if (error.name !== "AbortError") {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (user?.role === "admin") {
      fetchPosts();
    }

    return () => controller.abort();
  }, [user, search, planFilter, currentPage]);

  // Delete a post from Firestore
  async function handleDelete() {
    if (!deletePost) return;

    try {
      setDeleting(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:3000/admin/posts/${deletePost.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete post");
      }

      // Remove the deleted post from the current screen
      const updatedPosts = posts.filter(
        (post) => post.id !== deletePost.id
      );

      setPosts(updatedPosts);
      setTotalPosts((previous) => Math.max(0, previous - 1));

      setDeletePost(null);

      // If the current page becomes empty, go to the previous page
      if (updatedPosts.length === 0 && currentPage > 1) {
        setCurrentPage((previous) => previous - 1);
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  // Prevent non-admin users from accessing this page
  if (!user || user.role !== "admin") {
    return (
      <div className="manage-access-denied">
        <h2>Access Denied</h2>
        <p>You are not authorised to view this page.</p>
      </div>
    );
  }

  return (
    <div className="manage-posts-page">

      {/* Page heading */}
      <div className="manage-posts-header">
        <div>
          <p className="manage-eyebrow">ADMINISTRATION</p>
          <h1>Manage Posts</h1>
          <p className="manage-subtitle">
            View, search and manage posts published on DEV@Deakin.
          </p>
        </div>

        <div className="total-posts-box">
          <span>Total Posts</span>
          <strong>{totalPosts}</strong>
        </div>
      </div>

      {/* Search and filter section */}
      <div className="manage-toolbar">

        <div className="manage-search">
          <span className="search-symbol">⌕</span>

          <input
            type="text"
            placeholder="Search posts by title..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <select
          className="manage-filter"
          value={planFilter}
          onChange={(event) => {
            setPlanFilter(event.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Posts</option>
          <option value="Free">Free Posts</option>
          <option value="Paid">Paid Posts</option>
        </select>

      </div>

      {/* Error message */}
      {error && (
        <div className="manage-error">
          {error}
        </div>
      )}

      {/* Posts section */}
      <div className="posts-section">

        <div className="posts-section-heading">
          <div>
            <h2>Published Posts</h2>
            <p>Manage the content available on your platform.</p>
          </div>

          <span className="results-count">
            {totalPosts} results
          </span>
        </div>

        {loading ? (
          <div className="manage-empty-state">
            <div className="loading-spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="manage-empty-state">
            <h3>No posts found</h3>
            <p>
              Try changing your search or selecting another filter.
            </p>
          </div>
        ) : (
          <div className="posts-table-wrapper">
            <table className="manage-posts-table">

              <thead>
                <tr>
                  <th>Post Details</th>
                  <th>Author</th>
                  <th>Post Type</th>
                  <th>Plan</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>

                    <td className="post-title-cell">
                      <strong>{post.title}</strong>
                      <span>
                        {post.createdAt
                          ? new Date(post.createdAt).toLocaleDateString()
                          : "Date unavailable"}
                      </span>
                    </td>

                    <td>{post.author || "Unknown"}</td>

                    <td>
                      <span className="post-type-label">
                        {post.type || "Post"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          (post.plan || "Free") === "Paid"
                            ? "plan-badge paid-badge"
                            : "plan-badge free-badge"
                        }
                      >
                        {post.plan || "Free"}
                      </span>
                    </td>

                    <td>
                      <div className="post-action-buttons">

                        <button
                          type="button"
                          className="details-button"
                          onClick={() => setSelectedPost(post)}
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => setDeletePost(post)}
                        >
                          Delete
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPosts > 0 && (
          <div className="manage-pagination">

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <div>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </button>
            </div>

          </div>
        )}

      </div>

      {/* View post details modal */}
      {selectedPost && (
        <div
          className="manage-modal-backdrop"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="manage-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manage-modal-header">
              <div>
                <p className="manage-eyebrow">POST INFORMATION</p>
                <h2>Post Details</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedPost(null)}
              >
                ×
              </button>
            </div>

            <h3 className="modal-post-title">
              {selectedPost.title}
            </h3>

            <div className="modal-details">
              <p>
                <strong>Author:</strong>{" "}
                {selectedPost.author || "Unknown"}
              </p>

              <p>
                <strong>Post Type:</strong>{" "}
                {selectedPost.type || "Post"}
              </p>

              <p>
                <strong>Plan:</strong>{" "}
                {selectedPost.plan || "Free"}
              </p>

              <p>
                <strong>Published:</strong>{" "}
                {selectedPost.createdAt
                  ? new Date(selectedPost.createdAt).toLocaleString()
                  : "Date unavailable"}
              </p>

              <p>
                <strong>Tags:</strong>{" "}
                {Array.isArray(selectedPost.tags) &&
                selectedPost.tags.length > 0
                  ? selectedPost.tags.join(", ")
                  : "No tags"}
              </p>
            </div>

            <div className="modal-content">
              <strong>
                {selectedPost.type === "Article"
                  ? "Abstract"
                  : "Description"}
              </strong>

              <p>
                {selectedPost.type === "Article"
                  ? selectedPost.abstract || "No abstract available."
                  : selectedPost.description || "No description available."}
              </p>

              {selectedPost.articleText && (
                <>
                  <strong>Article Content</strong>
                  <p>{selectedPost.articleText}</p>
                </>
              )}
            </div>

            <button
              type="button"
              className="modal-done-button"
              onClick={() => setSelectedPost(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletePost && (
        <div className="manage-modal-backdrop">
          <div className="manage-confirm-modal">

            <div className="delete-icon">!</div>

            <h2>Delete this post?</h2>

            <p>
              Are you sure you want to delete
              {" "}
              <strong>{deletePost.title}</strong>?
              This action cannot be undone.
            </p>

            <div className="confirm-buttons">

              <button
                type="button"
                className="cancel-button"
                disabled={deleting}
                onClick={() => setDeletePost(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-button"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default ManagePosts;

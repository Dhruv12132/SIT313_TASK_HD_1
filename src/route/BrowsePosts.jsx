
import { useEffect, useState } from "react";
import "./BrowsePosts.css";

function BrowsePosts() {
  const [posts, setPosts] = useState([]);
  const [userPlan, setUserPlan] = useState("Visitor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtering states
  const [typeFilter, setTypeFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Hide and expand states
  const [hiddenIds, setHiddenIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);

  // Get posts from the backend
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = {};

        if (token) {
          headers.Authorization = "Bearer " + token;
        }

        const response = await fetch(
          "http://localhost:3000/posts",
          { headers }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load posts");
        }

        setPosts(data.posts || []);
        setUserPlan(data.userPlan || "Visitor");

      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Hide a post from the current page
  const handleHide = (postId) => {
    setHiddenIds((previous) => [...previous, postId]);
  };

  // Expand or collapse a post
  const handleExpand = (postId) => {
    if (expandedIds.includes(postId)) {
      setExpandedIds(
        expandedIds.filter((id) => id !== postId)
      );
    } else {
      setExpandedIds([...expandedIds, postId]);
    }
  };

  // Reset filters and hidden posts
  const handleReset = () => {
    setTypeFilter("All");
    setPlanFilter("All");
    setTagFilter("");
    setDateFilter("");
    setHiddenIds([]);
    setExpandedIds([]);
  };

  // Apply filters to the posts already received
  const filteredPosts = posts.filter((post) => {

    if (hiddenIds.includes(post.id)) {
      return false;
    }

    if (
      typeFilter !== "All" &&
      post.type !== typeFilter
    ) {
      return false;
    }

    if (
      planFilter !== "All" &&
      (post.plan || "Free") !== planFilter
    ) {
      return false;
    }

    if (tagFilter) {
      const tags = Array.isArray(post.tags)
        ? post.tags
        : [];

      const hasTag = tags.some((tag) =>
        String(tag).toLowerCase().includes(
          tagFilter.toLowerCase()
        )
      );

      if (!hasTag) {
        return false;
      }
    }

    if (
      dateFilter &&
      String(post.createdAt || "").slice(0, 10) !== dateFilter
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="browse-page">

      <div className="browse-header">
        <div>
          <h1>Browse Posts</h1>
          <p>Explore questions and articles shared by users.</p>
        </div>

        <div className="browse-user-plan">
          Viewing as: <strong>{userPlan}</strong>
        </div>
      </div>

      {/* Filtering section */}
      <div className="browse-filters">

        <label>
          Post Type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Question">Questions</option>
            <option value="Article">Articles</option>
          </select>
        </label>

        <label>
          Post Plan
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="All">All Plans</option>
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
          </select>
        </label>

        <label>
          Search Tag
          <input
            type="text"
            placeholder="Enter a tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
        </label>

        <label>
          Created Date
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>

      </div>

      <button
        className="browse-reset"
        onClick={handleReset}
        type="button"
      >
        Reset Filters and Hidden Posts
      </button>

      {/* Post list */}
      {loading && <p>Loading posts...</p>}

      {error && <p className="browse-error">{error}</p>}

      {!loading && !error && filteredPosts.length === 0 && (
        <p>No posts found.</p>
      )}

      <div className="browse-post-list">

        {filteredPosts.map((post) => {

          const isExpanded = expandedIds.includes(post.id);

          const preview =
            post.type === "Article"
              ? (post.abstract || "")
              : (post.description || "");

          const canExpand =
            post.type === "Article" ||
            preview.length > 180;

          return (
            <div className="browse-post-card" key={post.id}>

              <div className="browse-post-meta">
                <span>{post.type}</span>
                <span>{post.plan || "Free"} Plan</span>
              </div>

              <h2>{post.title}</h2>

              <p className="browse-author">
                Posted by: {post.author || "Unknown"}
              </p>

              <p className="browse-date">
                {post.createdAt
                  ? new Date(post.createdAt).toLocaleString()
                  : "Date unavailable"}
              </p>

              <p className="browse-content">
                {isExpanded
                  ? preview
                  : preview.length > 180
                    ? preview.slice(0, 180) + "..."
                    : preview}
              </p>

              {post.type === "Article" && isExpanded && (
                <div className="browse-full-article">
                  <h3>Full Article</h3>
                  <p>{post.articleText}</p>
                </div>
              )}

              <div className="browse-tags">
                {Array.isArray(post.tags) &&
                  post.tags.map((tag, index) => (
                    <span key={index}>#{tag}</span>
                  ))}
              </div>

              <div className="browse-actions">

                {canExpand && (
                  <button
                    type="button"
                    onClick={() => handleExpand(post.id)}
                  >
                    {isExpanded ? "Show Less" : "Read Full Post"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleHide(post.id)}
                >
                  Hide
                </button>

              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}

export default BrowsePosts;

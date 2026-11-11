
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import "./BrowsePosts.css";


function BrowsePosts() {
const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [userPlan, setUserPlan] = useState("Visitor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtering states
  const [typeFilter, setTypeFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Store the cursor needed to open each page
  const [cursorByPage, setCursorByPage] = useState({ 1: null });

  // Hide and expand states
  const [hiddenIds, setHiddenIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);

  // Check whether any filters are being used
  const hasFilters =
    search.trim() !== "" ||
    typeFilter !== "All" ||
    planFilter !== "All" ||
    tagFilter.trim() !== "" ||
    dateFilter !== "";

  // Prepare the request parameters
  const getRequestParams = (page, cursor) => {
    const params = new URLSearchParams({
      page: page,
      search: search,
      type: typeFilter,
      plan: planFilter,
      tag: tagFilter,
      date: dateFilter,
      sort: sortOrder
    });

    if (!hasFilters && cursor) {
      params.set("cursor", cursor);
    }

    return params;
  };

  // Load posts whenever the page or filters change
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const headers = {};

        if (token) {
          headers.Authorization = "Bearer " + token;
        }

        const cursor = cursorByPage[currentPage];

        const params = getRequestParams(currentPage, cursor);

        const response = await fetch(
          `http://localhost:3000/posts?${params.toString()}`,
          { headers }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load posts");
        }

        setPosts(data.posts || []);
        setUserPlan(data.userPlan || "Visitor");
        setTotalPages(data.totalPages || 1);
        setTotalPosts(data.totalPosts || 0);

        // Remember the cursor for the next page
        if (data.paginationMode === "cursor" && data.nextCursorId) {
          setCursorByPage((previous) => ({
            ...previous,
            [currentPage + 1]: data.nextCursorId
          }));
        }

      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [
    currentPage,
    cursorByPage[currentPage],
    search,
    typeFilter,
    planFilter,
    tagFilter,
    dateFilter,
    sortOrder
  ]);

  // Reset pagination when filters change
  const resetPagination = () => {
    setCurrentPage(1);
    setCursorByPage({ 1: null });
    setExpandedIds([]);
  };

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

  // Change the page and collect missing cursors if needed
  const handlePageChange = async (page) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    // Filtered results use normal numbered pagination
    if (hasFilters) {
      setCurrentPage(page);
      setExpandedIds([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const headers = {};

      if (token) {
        headers.Authorization = "Bearer " + token;
      }

      // Find the cursor needed to open the selected page
      const newCursors = { ...cursorByPage };

      for (let nextPage = 2; nextPage <= page; nextPage++) {
        if (newCursors[nextPage]) {
          continue;
        }

        const previousCursor = newCursors[nextPage - 1];

        const params = getRequestParams(
          nextPage - 1,
          previousCursor
        );

        const response = await fetch(
          `http://localhost:3000/posts?${params.toString()}`,
          { headers }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load page");
        }

        if (!data.nextCursorId) {
          break;
        }

        newCursors[nextPage] = data.nextCursorId;
      }

      setCursorByPage(newCursors);

      if (page === 1 || newCursors[page]) {
        setCurrentPage(page);
        setExpandedIds([]);
      } else {
        setError("Could not find the selected page.");
      }

    } catch (error) {
      setError(error.message);
    }
  };

  // Reset all filters
  const handleReset = () => {
    setTypeFilter("All");
    setPlanFilter("All");
    setTagFilter("");
    setDateFilter("");
    setSearch("");
    setSortOrder("newest");

    setCurrentPage(1);
    setCursorByPage({ 1: null });
    setHiddenIds([]);
    setExpandedIds([]);
  };

  // Remove hidden posts from the current page
  const visiblePosts = posts.filter(
    (post) => !hiddenIds.includes(post.id)
  );

  return (
    <div className="browse-page">

      <div className="browse-header">
        <div>
          <h1>Browse Posts</h1>
          <p>Explore questions and articles shared by users.</p>
        </div>

       <div className="browse-user-plan">
        Viewing as: <strong>
            {user?.role === "admin"
                ? "Admin"
                : userPlan}
        </strong>
</div>
      </div>

      {/* Search section */}
      <div className="browse-search">
        <input
          type="text"
          placeholder="Search posts by title..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPagination();
          }}
        />
      </div>

      {/* Filtering section */}
      <div className="browse-filters">

        <label>
          Post Type
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              resetPagination();
            }}
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
            onChange={(e) => {
              setPlanFilter(e.target.value);
              resetPagination();
            }}
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
            onChange={(e) => {
              setTagFilter(e.target.value);
              resetPagination();
            }}
          />
        </label>

        <label>
          Created Date
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              resetPagination();
            }}
          />
        </label>

        <label>
          Sort By
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              resetPagination();
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </label>

      </div>

      <button
        className="browse-reset"
        onClick={handleReset}
        type="button"
      >
        Reset Filters
      </button>

      {/* Post count */}
      {!loading && !error && (
        <p className="browse-count">
          Showing {totalPosts === 0 ? 0 : (currentPage - 1) * 5 + 1}
          {" - "}
          {Math.min(currentPage * 5, totalPosts)}
          {" of "}
          {totalPosts} posts
        </p>
      )}

      {/* Post list */}
      {loading && <p>Loading posts...</p>}

      {error && (
        <p className="browse-error">{error}</p>
      )}

      {!loading && !error && visiblePosts.length === 0 && (
        <p>No posts found.</p>
      )}

      <div className="browse-post-list">

        {visiblePosts.map((post) => {
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

      {/* Numbered pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="browse-pagination">

          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => index + 1
          ).map((page) => (
            <button
              type="button"
              key={page}
              className={
                currentPage === page ? "active" : ""
              }
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </button>

        </div>
      )}

    </div>
  );
}

export default BrowsePosts;


import { useState } from "react";
import "./Post.css";

function Post() {
  const [postType, setPostType] = useState("Question");
  const [postPlan, setPostPlan] = useState("Free");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [abstract, setAbstract] = useState("");
  const [articleText, setArticleText] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async (event) => {
    event.preventDefault();

    if (!title.trim() || !tags.trim()) {
      alert("Please enter a title and tags");
      return;
    }

    if (postType === "Question" && !description.trim()) {
      alert("Please describe your question");
      return;
    }

    if (
      postType === "Article" &&
      (!abstract.trim() || !articleText.trim())
    ) {
      alert("Please complete your article");
      return;
    }

    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      alert("Please log in before creating a post");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          type: postType,
          title: title,
          description: description,
          abstract: abstract,
          articleText: articleText,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          plan: postPlan,  
        })
      });

      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (tagList.length === 0 || tagList.length > 3) {
        alert("Please enter between 1 and 3 tags");
        return;
         }

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not save the post");
        return;
      }

      alert("Post saved successfully!");

      setTitle("");
      setDescription("");
      setAbstract("");
      setArticleText("");
      setTags("");
    } catch (error) {
      alert("Could not connect to the backend");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-container">
      <h2 className="heading">New Post</h2>

      <div className="post">
        <span>Select Post Type:</span>

        <label>
          <input
            type="radio"
            name="postType"
            value="Question"
            checked={postType === "Question"}
            onChange={(event) => setPostType(event.target.value)}
          />
          Question
        </label>

        <label>
          <input
            type="radio"
            name="postType"
            value="Article"
            checked={postType === "Article"}
            onChange={(event) => setPostType(event.target.value)}
          />
          Article
        </label>
      </div>

      <div className="post-plan">
  <span>Select Post Plan:</span>

  <label>
    <input
      type="radio"
      name="postPlan"
      value="Free"
      checked={postPlan === "Free"}
      onChange={(event) => setPostPlan(event.target.value)}
    />
    Free
  </label>

  <label>
    <input
      type="radio"
      name="postPlan"
      value="Paid"
      checked={postPlan === "Paid"}
      onChange={(event) => setPostPlan(event.target.value)}
    />
    Paid
  </label>
</div>

      <form onSubmit={handlePost}>
        <h2>
          {postType === "Question" ? "Question Form" : "Article Form"}
        </h2>

        <h3>What do you want to ask or share?</h3>

        <label>
          Title:
          <textarea
            placeholder="Enter a title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        {postType === "Question" ? (
          <label>
            Describe your problem:
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>
        ) : (
          <>
            <label>
              Abstract:
              <textarea
                placeholder="Write a short summary"
                value={abstract}
                onChange={(event) => setAbstract(event.target.value)}
                required
              />
            </label>

            <label>
              Article Text:
              <textarea
                placeholder="Write your article here"
                value={articleText}
                onChange={(event) => setArticleText(event.target.value)}
                required
              />
            </label>
          </>
        )}

        <label>
          Tags:
          <textarea
            placeholder="Add up to 3 tags, separated by commas"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Post"}
        </button>
      </form>
    </div>
  );
}

export default Post;

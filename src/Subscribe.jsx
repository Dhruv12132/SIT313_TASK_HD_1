
import { useState } from "react"
import "./Subscribe.css"

function Subscribe() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function subscribe() {
    if (email.trim() === "") {
      setMessage("Please enter your email")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("http://localhost:3000/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const result = await response.text()

      if (response.ok) {
        setMessage(result)
        setEmail("")
      } else {
        setMessage(result)
      }
    } catch {
      setMessage("Unable to connect to the backend. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="subscribe" className="subscribe-section">
      <div className="subscribe-content">
        <span className="subscribe-tag">STAY CONNECTED</span>

        <h2>Sign Up For Our Daily Insider</h2>

        <p>
          Get the latest updates, interesting posts and news
          delivered straight to your inbox.
        </p>

        <div className="subscribe-form">
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button onClick={subscribe} disabled={loading}>
            {loading ? "Subscribing..." : "Subscribe"}
          </button>
        </div>

        {message && (
          <p className="subscribe-message" aria-live="polite">
            {message}
          </p>
        )}

        <span className="subscribe-note">
          We respect your privacy. Unsubscribe anytime.
        </span>
      </div>
    </section>
  )
}

export default Subscribe

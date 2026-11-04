
import { useState } from "react";
import "./Pricing.css";

function Pricing() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [showModal, setShowModal] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    if (!user) {
      alert("Please log in to upgrade your plan");
      return;
    }

    if (user.plan === "Paid") {
      alert("You are already using the Paid plan");
      return;
    }

    setShowModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    if (
      cardName.trim() === "" ||
      cardNumber.replace(/\s/g, "").length !== 16 ||
      !/^\d{2}\/\d{2}$/.test(expiry) ||
      !/^\d{3,4}$/.test(cvv)
    ) {
      alert("Please enter valid payment details");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Upgrade failed");
        return;
      }

      const updatedUser = { ...user, plan: "Paid" };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event("userUpdate"));
      setShowModal(false);

      alert("Your plan has been upgraded successfully");
    } catch (error) {
      alert("Could not connect to the server");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-container">
      <h1>Choose Your Plan</h1>
      <p>Choose the plan that works best for you.</p>

      <div className="pricing-plans">
        <div className="pricing-card">
          <h2>Free Plan</h2>
          <h3>$0</h3>
          <p>For users getting started with DEV@Deakin.</p>

          <ul>
            <li>Access to the basic platform</li>
            <li>Create and view posts</li>
            <li>Browse shared content</li>
          </ul>

          <button type="button" disabled={user?.plan === "Free"}>
            {user?.plan === "Free" ? "Current Plan" : "Free Plan"}
          </button>
        </div>

        <div className="pricing-card">
          <h2>Paid Plan</h2>
          <h3>Paid Subscription</h3>
          <p>For users who want a paid membership.</p>

          <ul>
            <li>All Free plan features</li>
            <li>Access to paid plan benefits</li>
            <li>Upgrade your membership</li>
          </ul>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={user?.plan === "Paid"}
          >
            {user?.plan === "Paid" ? "Current Plan" : "Upgrade Plan"}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="payment-overlay">
          <div className="payment-modal">
  <button
    type="button"
    className="close-modal"
    onClick={() => setShowModal(false)}
    aria-label="Close payment window"
  >
    &times;
  </button>
            <h2>Upgrade to Paid</h2>
            <p>Enter the payment details for this demonstration.</p>

            <form onSubmit={handlePayment}>
              <label>Name on card</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
              />

              <label>Card number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="19"
                placeholder="16-digit test number"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(e.target.value.replace(/[^\d ]/g, ""))
                }
                required
              />

              <label>Expiry (MM/YY)</label>
              <input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                required
              />

              <label>CVV</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="4"
                value={cvv}
                onChange={(e) =>
                  setCvv(e.target.value.replace(/\D/g, ""))
                }
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Confirm Upgrade"}
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pricing;

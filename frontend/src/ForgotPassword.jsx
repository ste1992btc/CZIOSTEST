import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    if (!email) {
      setError("Inserisci la tua email");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://app.carbozen.it/reset-password",
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Ti abbiamo inviato una mail per reimpostare la password!");
    }

    setLoading(false);
  };

  return (
    <div className="container">
    <a href="https://carbozen.it">
      <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
    </a>
      <div className="card-section card-green">
        <h2 className="titlesec">PASSWORD DIMENTICATA</h2>
        <p>INSERISCI LA TUA MAIL E TI INVIEREMO UN LINK PER REIMPOSTARE LA TUA PASSWORD.</p>

        <form onSubmit={handleSubmit}>
          <label className="form-label">
            EMAIL:
            <input
              type="email"
              placeholder="Inserisci la tua email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glicemia-input"
            />
          </label>
          <br />
          <button type="submit" className="custom-button" disabled={loading}>
            {loading ? "Invio in corso..." : "Invia email"}
          </button>
        </form>

        {message && <p style={{ color: "green", marginTop: "1rem" }}>{message}</p>}
        {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
      </div>
    </div>
  );
};

export default ForgotPassword;
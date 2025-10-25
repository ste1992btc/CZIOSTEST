import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");

    if (!access_token) {
      setError("Token di reset non trovato.");
      setLoading(false);
      return;
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setError("Token non valido o scaduto.");
        setLoading(false);
      });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Compila entrambi i campi.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage(
        "Password aggiornata con successo! Verrai reindirizzato al login..."
      );
      setTimeout(() => {
        navigate("/"); // cambia con il path della login
      }, 3000);
    }
  };

  if (loading) return <p>Caricamento...</p>;

  return (
    <div className="container">
      <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
      <div className="card-section card-green">
        <h2 className="titlesec">REIMPOSTA LA TUA PASSWORD</h2>
        {successMessage ? (
          <p style={{ color: "green" }}>{successMessage}</p>
        ) : (
          <form onSubmit={handleReset}>
            <label className="form-label">
              Nuova password:
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nuova password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glicemia-input"
                />
                <span
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    fontSize: "1.2em",
                    color: "#555",
                  }}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
            </label>

            <label className="form-label">
              CONFERMA PASSWORD:
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Conferma password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glicemia-input"
              />
            </label>

            <br />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button type="submit" className="custom-button">
              REIMPOSTA PASSWORD
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
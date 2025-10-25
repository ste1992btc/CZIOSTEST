import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";

const Auth = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [wizardStarted, setWizardStarted] = useState(false);

  const nextStep = () => {
    setError("");
    if (!wizardStarted) {
      if (!email || !password || !confirmPassword) {
        setError("Compila tutti i campi prima di continuare.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Le password non corrispondono.");
        return;
      }
      setWizardStarted(true);
    }
  };

  const prevStep = () => {
    setWizardStarted(false);
  };

  const handleAuth = async () => {
    setError("");
    setResendMessage("");
    try {
      if (isRegistering) {
        if (!wizardStarted) {
          setError("Completa prima la compilazione dei dati.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.user.email_confirmed_at) {
          setIsRegistered(true);
          return;
        }
        onLogin(data.user);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes("Email not confirmed")) {
            setError("Devi prima confermare la tua email.");
            return;
          }
          throw signInError;
        }
        if (!data.user) throw new Error("Accesso fallito. Controlla le credenziali.");
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || "Errore durante l'autenticazione.");
    }
  };

  const handleResendEmail = async () => {
    setResendMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) throw resendError;
      setResendMessage("Email di conferma inviata di nuovo! 📧");
    } catch (err) {
      setResendMessage(err.message || "Errore durante l'invio della mail di conferma.");
    }
  };

  if (isRegistered) {
    return (
      <div className="container">
        <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
        <div className="card-section card-green">
          <h2 className="titlesec">REGISTRAZIONE COMPLETATA 🎉</h2>
          <p className="instructions">
            ABBIAMO INVIATO UNA MAIL DI CONFERMA A <strong>{email}</strong>.<br />
            CONTROLLA LA TUA CASELLA DI POSTA E CLICCA SUL LINK PER CONFERMARE.
          </p>
          <div className="wizard-buttons">
            <button onClick={handleResendEmail} className="custom-button">REINVIA MAIL DI CONFERMA</button>
            <button onClick={() => setIsRegistered(false)} className="custom-button">TORNA AL LOGIN</button>
          </div>
          {resendMessage && <p style={{ marginTop: "1rem", color: "green" }}>{resendMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <a href="https://carbozen.it">
        <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
      </a>
      <p className="instructions">
        {isRegistering
          ? "Crea un nuovo account."
          : "Accedi per stimare i carboidrati dei tuoi piatti."}
      </p>
      <div className="card-section card-green">
        <h2 className="titlesec">{isRegistering ? "Registrazione" : "Accesso"}</h2>

        {!isRegistering && (
          <>
            <label className="form-label">
              INSERISCI MAIL:
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="glicemia-input2" />
            </label>
            <br />
            <label className="form-label">
              INSERISCI PASSWORD:
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="glicemia-input2" style={{ paddingRight: "35px" }} />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#555" }}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
            </label>
            <br />
            <div className="wizard-buttons">
              <button onClick={handleAuth} className="custom-button">Accedi</button>
            </div>
          </>
        )}

        {isRegistering && !wizardStarted && (
          <>
            <label className="form-label">
              INSERISCI MAIL:
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="glicemia-input2" />
            </label>
            <br />
            <label className="form-label">
              INSERISCI PASSWORD:
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="glicemia-input2" style={{ paddingRight: "35px" }} />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#555" }}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
            </label>
            <br />
            <label className="form-label">
              CONFERMA PASSWORD:
              <div style={{ position: "relative" }}>
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Conferma password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="glicemia-input2" style={{ paddingRight: "35px" }} />
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#555" }}>
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
            </label>
            <br />
            <div className="wizard-buttons">
              <button onClick={nextStep} className="custom-button">Avanti</button>
            </div>
          </>
        )}

        {isRegistering && wizardStarted && (
          <div className="wizard-buttons">
            <button onClick={prevStep} className="custom-button">INDIETRO</button>
            <button onClick={handleAuth} className="custom-button">REGISTRATI</button>
          </div>
        )}

        <div className="wizard-buttons" style={{ marginTop: "1rem" }}>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setWizardStarted(false);
            }}
            className="custom-button"
          >
            {isRegistering ? "Hai già un account?" : "Registrati ora"}
          </button>
        </div>

        {!isRegistering && (
          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            <a href="/forgot-password" className="form-label">PASSWORD DIMENTICATA?</a>
          </p>
        )}

        {error && <p className="error" style={{ marginTop: "1rem", color: "red" }}>{error}</p>}
      </div>
    </div>
  );
};

export default Auth;

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
  const [annoNascita, setAnnoNascita] = useState("");
  const [citta, setCitta] = useState("");
  const [peso, setPeso] = useState("");
  const [altezza, setAltezza] = useState("");
  const [error, setError] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [wizardStarted, setWizardStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);


  const registrationSteps = [
    { label: "In che anno sei nato?", value: annoNascita, setter: setAnnoNascita, type: "number", placeholder: "Anno di nascita" },
    { label: "In che città vivi?", value: citta, setter: setCitta, type: "text", placeholder: "Città" },
    { label: "Quanto pesi?", value: peso, setter: setPeso, type: "number", placeholder: "Peso (kg)" },
    { label: "Quanto sei alto?", value: altezza, setter: setAltezza, type: "number", placeholder: "Altezza (cm)" },
    { label: "Disclaimer", type: "disclaimer" }
  ];

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
      setCurrentStep(0);
    } else {
      if (currentStep < registrationSteps.length - 1) setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (wizardStarted && currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleAuth = async () => {
    setError("");
    setResendMessage("");
    try {
      if (isRegistering) {
        if (!wizardStarted || currentStep !== registrationSteps.length - 1) {
          setError("Completa prima la compilazione dei dati.");
          return;
        }
        if (!disclaimerAccepted) {
          setError("Devi accettare le condizioni del Disclaimer per procedere.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const userId = data.user?.id;
        if (!userId) throw new Error("Registrazione fallita: nessun userId disponibile");
        const { error: insertError } = await supabase.from("users").insert({
          id: userId,
          email,
          anno_nascita: annoNascita ? parseInt(annoNascita) : null,
          citta,
          peso: peso ? parseFloat(peso) : null,
          altezza: altezza ? parseFloat(altezza) : null,
        });
        if (insertError) throw insertError;
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
          <h2 className="titlesec">Registrazione completata 🎉</h2>
          <p className="instructions">
            Abbiamo inviato una mail di conferma a <strong>{email}</strong>.<br />
            Controlla la casella di posta e clicca sul link per attivare il tuo account.
          </p>
          <div className="wizard-buttons">
            <button onClick={handleResendEmail} className="custom-button">Reinvia email di conferma</button>
            <button onClick={() => setIsRegistered(false)} className="custom-button">Torna al login</button>
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
          ? "Crea un nuovo account e inserisci i tuoi parametri per il calcolo automatico dell’insulina."
          : "Accedi per iniziare a stimare i carboidrati e calcolare le unità di insulina."}
      </p>
      <div className="card-section card-green">
        <h2 className="titlesec">{isRegistering ? "Registrazione" : "Accesso"}</h2>

        {!isRegistering && (
          <>
            <label className="form-label">
              Inserisci mail:
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="glicemia-input2" />
            </label>
            <br />
            <label className="form-label">
              Inserisci password:
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
              Inserisci mail:
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="glicemia-input2" />
            </label>
            <br />
            <label className="form-label">
              Inserisci password:
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="glicemia-input2" style={{ paddingRight: "35px" }} />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#555" }}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
            </label>
            <br />
            <label className="form-label">
              Conferma password:
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
          <>
            {registrationSteps[currentStep].type === "disclaimer" ? (
              <>
                <h3 className="titlesec">Disclaimer</h3>
                <div style={{ marginTop: "1rem" }}>
                  <input type="checkbox" id="disclaimer" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} />
                  <label className="form-label" htmlFor="disclaimer" style={{ marginLeft: "0.5rem" }}>
                    Dichiaro di avere letto le condizioni nella sezione{" "}
                    <a href="https://carbozen.it/disclaimer" target="_blank" rel="noopener noreferrer">Disclaimer</a>{" "}
                    del sito
                  </label>
                </div>
              </>
            ) : (
              <>
                <h3 className="titlesec">Dati utente</h3>
                <label className="form-label">
                  {registrationSteps[currentStep].label}
                  <input type={registrationSteps[currentStep].type} placeholder={registrationSteps[currentStep].placeholder} value={registrationSteps[currentStep].value} onChange={(e) => registrationSteps[currentStep].setter(e.target.value)} className="glicemia-input2" />
                </label>
              </>
            )}

            <div className="wizard-buttons">
              {currentStep > 0 && <button onClick={prevStep} className="custom-button">Indietro</button>}
              {currentStep < registrationSteps.length - 1 ? (
                <button onClick={nextStep} className="custom-button">Avanti</button>
              ) : (
                <button onClick={handleAuth} className="custom-button">Registrati</button>
              )}
            </div>
          </>
        )}

        <div className="wizard-buttons" style={{ marginTop: "1rem" }}>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setWizardStarted(false);
              setCurrentStep(0);
            }}
            className="custom-button"
          >
            {isRegistering ? "Hai già un account?" : "Registrati ora"}
          </button>
        </div>

        {!isRegistering && (
          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            <a href="/forgot-password" className="form-label">Password dimenticata?</a>
          </p>
        )}

        {error && <p className="error" style={{ marginTop: "1rem", color: "red" }}>{error}</p>}
      </div>
    </div>
  );
};

export default Auth;

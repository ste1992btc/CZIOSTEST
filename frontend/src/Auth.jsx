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

  const [icMattino, setIcMattino] = useState("");
  const [icPomeriggio, setIcPomeriggio] = useState("");
  const [icSera, setIcSera] = useState("");

  const [fsi, setFsi] = useState("");
  const [target, setTarget] = useState("");
  const [annoScoperta, setAnnoScoperta] = useState("");
  const [annoNascita, setAnnoNascita] = useState("");
  const [citta, setCitta] = useState("");
  const [peso, setPeso] = useState("");
  const [altezza, setAltezza] = useState("");
  const [device, setDevice] = useState("");
  const [centro, setCentro] = useState("");
  const [error, setError] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [wizardStarted, setWizardStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const normalizeIC = (value) => {
    if (!value) return null;
    const trimmed = value.trim();
    const match = trimmed.match(/^1[\/\-.](\d{1,3})$/);
    if (match) return parseFloat(match[1]);
    return parseFloat(trimmed);
  };

  const registrationSteps = [
    { label: "Inserisci rapporto I/C mattino (dalle 6 alle 10)", value: icMattino, setter: setIcMattino, type: "text", placeholder: "I/C mattino" },
    { label: "Inserisci rapporto I/C pomeriggio (dalle 10 alle 16)", value: icPomeriggio, setter: setIcPomeriggio, type: "text", placeholder: "I/C pomeriggio" },
    { label: "Inserisci rapporto I/C sera (dalle 16 alle 22)", value: icSera, setter: setIcSera, type: "text", placeholder: "I/C sera" },
    { label: "Inserisci fattore sensibilità insulinica (mg/dl)", value: fsi, setter: setFsi, type: "number", placeholder: "FSI" },
    { label: "Inserisci glicemia target", value: target, setter: setTarget, type: "number", placeholder: "Glicemia target" },
    { label: "In che anno hai scoperto la malattia?", value: annoScoperta, setter: setAnnoScoperta, type: "number", placeholder: "Anno scoperta malattia" },
    { label: "In che anno sei nato?", value: annoNascita, setter: setAnnoNascita, type: "number", placeholder: "Anno di nascita" },
    { label: "In che città vivi?", value: citta, setter: setCitta, type: "text", placeholder: "Città" },
    { label: "Quanto pesi?", value: peso, setter: setPeso, type: "number", placeholder: "Peso (kg)" },
    { label: "Quanto sei alto?", value: altezza, setter: setAltezza, type: "number", placeholder: "Altezza (cm)" },
    { label: "Che dispositivo utilizzi per insulina?", value: device, setter: setDevice, type: "text", placeholder: "Device per insulina" },
    { label: "Presso quale centro sei in cura?", value: centro, setter: setCentro, type: "text", placeholder: "Centro diabetologico" },
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
          ic_mattino: icMattino ? normalizeIC(icMattino) : null,
          ic_pomeriggio: icPomeriggio ? normalizeIC(icPomeriggio) : null,
          ic_sera: icSera ? normalizeIC(icSera) : null,
          fsi: fsi ? parseFloat(fsi) : null,
          glicemia_target: target ? parseFloat(target) : null,
          anno_scoperta: annoScoperta ? parseInt(annoScoperta) : null,
          anno_nascita: annoNascita ? parseInt(annoNascita) : null,
          citta,
          peso: peso ? parseFloat(peso) : null,
          altezza: altezza ? parseFloat(altezza) : null,
          device,
          centro_diabetologico: centro,
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
          ? "Crea un nuovo account e inserisci i tuoi parametri per il calcolo automatico dell’insulina."
          : "Accedi per iniziare a stimare i carboidrati e calcolare le unità di insulina."}
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
          <>
            {registrationSteps[currentStep].type === "disclaimer" ? (
              <>
                <h3 className="titlesec">DISCLAIMER</h3>
                <div style={{ marginTop: "1rem" }}>
                  <input type="checkbox" id="disclaimer" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} />
                  <label className="form-label" htmlFor="disclaimer" style={{ marginLeft: "0.5rem" }}>
                    DICHIARO DI AVERE LETTO LE CONDIZIONI NELLA SEZIONE {" "}
                    <a href="https://carbozen.it/disclaimer" target="_blank" rel="noopener noreferrer">DISCLAIMER</a>{" "}
                    DEL SITO
                  </label>
                </div>
              </>
            ) : (
              <>
                <h3 className="titlesec">DATI UTENTE</h3>
                <label className="form-label">
                  {registrationSteps[currentStep].label}
                  <input type={registrationSteps[currentStep].type} placeholder={registrationSteps[currentStep].placeholder} value={registrationSteps[currentStep].value} onChange={(e) => registrationSteps[currentStep].setter(e.target.value)} className="glicemia-input2" />
                </label>
              </>
            )}

            <div className="wizard-buttons">
              {currentStep > 0 && <button onClick={prevStep} className="custom-button">INDIETRO</button>}
              {currentStep < registrationSteps.length - 1 ? (
                <button onClick={nextStep} className="custom-button">AVANTI</button>
              ) : (
                <button onClick={handleAuth} className="custom-button">REGISTRATI</button>
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
            <a href="/forgot-password" className="form-label">PASSWORD DIMENTICATA?</a>
          </p>
        )}

        {error && <p className="error" style={{ marginTop: "1rem", color: "red" }}>{error}</p>}
      </div>
    </div>
  );
};

export default Auth;

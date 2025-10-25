import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";

const Auth = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ic, setIc] = useState("");
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

  const handleAuth = async () => {
    setError("");
    setResendMessage("");

    if (isRegistering && !disclaimerAccepted) {
      setError("Devi accettare le condizioni del Disclaimer per procedere.");
      return;
    }

    try {
      if (isRegistering) {
        // REGISTRAZIONE
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const userId = data.user?.id; // ottieni l'id utente
        if (!userId) {
          throw new Error("Registrazione fallita: nessun userId disponibile");
        }

        // 🔥 INSERISCI SUBITO NELLA TABELLA USERS
        const { error: insertError } = await supabase.from("users").insert({
          id: userId,
          email,
          ic: ic ? parseFloat(ic) : null,
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

        // Se l'email NON è confermata, mostra schermata verifica
        if (!data.user.email_confirmed_at) {
          setIsRegistered(true);
          return; // ⛔ non loggare subito
        }

        // Caso raro: email già confermata (o conferma disattivata in dev)
        onLogin(data.user);

      } else {
        // LOGIN
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          if (signInError.message.includes("Email not confirmed")) {
            setError("Devi prima confermare la tua email.");
            return;
          }
          throw signInError;
        }

        if (!data.user)
          throw new Error("Accesso fallito. Controlla le credenziali.");

        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || "Errore durante l'autenticazione.");
    }
  };


  const handleResendEmail = async () => {
    setResendMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) throw resendError;
      setResendMessage("Email di conferma inviata di nuovo! 📧");
    } catch (err) {
      setResendMessage(
        err.message || "Errore durante l'invio della mail di conferma."
      );
    }
  };

  // Se registrato ma in attesa di conferma email
  if (isRegistered) {
    return (
      <div className="container">
        <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
        <div className="card-section card-green">
          <h2 className="titlesec">Registrazione completata 🎉</h2>
          <p className="instructions">
            Abbiamo inviato una mail di conferma a <strong>{email}</strong>.
            <br />
            Controlla la casella di posta e clicca sul link per attivare il tuo
            account.
          </p>
          <button onClick={handleResendEmail} className="custom-button">
            Reinvia email di conferma
          </button>
          {resendMessage && (
            <p style={{ marginTop: "1rem", color: "green" }}>{resendMessage}</p>
          )}

          {/* 🔙 nuovo bottone per tornare al login */}
          <button
            onClick={() => setIsRegistered(false)}
            className="custom-button mt-5"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
      <p className="instructions">
        {isRegistering
          ? "Crea un nuovo account e inserisci i tuoi parametri per il calcolo automatico dell’insulina."
          : "Accedi per iniziare a stimare i carboidrati e calcolare le unità di insulina."}
      </p>

      <div className="card-section card-green">
        <h2 className="titlesec">
          {isRegistering ? "Registrazione" : "Accesso"}
        </h2>
        <label className="form-label">
          Inserisci mail:
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glicemia-input"
          />
        </label>
        <br />
        <label className="form-label">
          Inserisci password:
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glicemia-input"
              style={{ paddingRight: "35px" }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#555",
              }}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>
        </label>
        <br />

        {isRegistering && (
          <>
            <h3 className="titlesec">Dati utente </h3>
            <label className="form-label">
              Inserisci rapporto I/C (chiedere al proprio medico)
              <input
                type="number"
                placeholder="Rapporto I/C"
                value={ic}
                onChange={(e) => setIc(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              Inserisci FSI (chiedere al proprio medico)
              <input
                type="number"
                placeholder="FSI"
                value={fsi}
                onChange={(e) => setFsi(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              Inserisci glicemia target (chiedere al proprio medico)
              <input
                type="number"
                placeholder="Glicemia target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              In che anno hai scoperto la malattia?
              <input
                type="number"
                placeholder="Anno scoperta malattia"
                value={annoScoperta}
                onChange={(e) => setAnnoScoperta(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              In che anno sei nato?
              <input
                type="number"
                placeholder="Anno di nascita"
                value={annoNascita}
                onChange={(e) => setAnnoNascita(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              In che città vivi?
              <input
                type="text"
                placeholder="Città"
                value={citta}
                onChange={(e) => setCitta(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              Quanto pesi?
              <input
                type="number"
                placeholder="Peso (kg)"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              Quanto sei alto?
              <input
                type="number"
                placeholder="Altezza (cm)"
                value={altezza}
                onChange={(e) => setAltezza(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              Che dispositivo utilizzi somministrazione insulina?
              <input
                type="text"
                placeholder="Device per insulina (penna, microinfusore...)"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="glicemia-input"
              />
            </label>
            <label className="form-label">
              Presso quale centro sei in cura?
              <input
                type="text"
                placeholder="Centro diabetologico"
                value={centro}
                onChange={(e) => setCentro(e.target.value)}
                className="glicemia-input"
              />
            </label>

            {/* Checkbox Disclaimer - solo in registrazione */}
            <div style={{ marginTop: "1rem" }}>
              <input
                type="checkbox"
                id="disclaimer"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              />
              <label
                className="form-label"
                htmlFor="disclaimer"
                style={{ marginLeft: "0.5rem" }}
              >
                Dichiaro di avere letto le condizioni nella sezione{" "}
                <a
                  href="https://carbozen.it/disclaimer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Disclaimer
                </a>{" "}
                del sito
              </label>
            </div>
          </>
        )}

        <button onClick={handleAuth} className="custom-button">
          {isRegistering ? "Registrati" : "Accedi"}
        </button>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="custom-button"
        >
          {isRegistering ? "Hai già un account?" : "Registrati ora"}
        </button>

        {error && (
          <p className="error" style={{ marginTop: "1rem", color: "red" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;


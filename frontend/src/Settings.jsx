import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

const Settings = ({ userId }) => {
  const [settings, setSettings] = useState({
    anno_nascita: "",
    citta: "",
    peso: "",
    altezza: "",
    timezone: "" // aggiornato
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Lista dei fusi orari supportati
  const timeZones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [
          "Europe/Rome",
          "Europe/London",
          "America/New_York",
          "America/Los_Angeles",
          "Asia/Tokyo",
          "Australia/Sydney"
        ];

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          "anno_nascita, citta, peso, altezza, timezone"
        )
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Errore nel recupero dei parametri:", error.message);
        return;
      }

      setSettings({
        anno_nascita: data.anno_nascita ?? "",
        citta: data.citta ?? "",
        peso: data.peso ?? "",
        altezza: data.altezza ?? "",
        timezone: data.timezone ?? "Europe/Rome"
      });

      setLoading(false);
    };

    if (userId) fetchSettings();
  }, [userId]);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase
      .from("users")
      .update({
        anno_nascita: settings.anno_nascita ? parseInt(settings.anno_nascita) : null,
        citta: settings.citta,
        peso: settings.peso ? parseFloat(settings.peso) : null,
        altezza: settings.altezza ? parseFloat(settings.altezza) : null,
        timezone: settings.timezone // aggiornato
      })
      .eq("id", userId);

    if (error) {
      console.error("Errore nell'aggiornamento:", error.message);
      setMessage("❌ Errore nel salvataggio.");
    } else {
      setMessage("✅ Impostazioni aggiornate con successo.");
    }
  };

  // --- NUOVO: funzione di logout ---
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/"; // ritorna alla home dopo il logout
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  };

  return (
    <div className="container">
      <div className="header-with-button">
        <h1 className="title">⚙️ IMPOSTAZIONI</h1>
        <p className="instructions">
          RICORDATI SEMPRE CHE CARBOZEN NON E' UN DISPOSITIVO MEDICO, I CALCOLI FORNITI HANNO SOLO SCOPO INFORMATIVO E NON SOSTITUISCONO IL PARERE DI UN MEDICO. CONSULTARE SEMPRE UN PROFESSIONISTA SANITARIO PRIMA DI PRENDERE DECISIONI RIGUARDANTI LA PROPRIA SALUTE.PER MAGGIORI INFORMAZIONI SULLE FORMULE UTILIZZATE CONSULTARE LA SEZIONE{" "}
          <a href="https://www.carbozen.it/disclaimer" target="_blank" rel="noopener noreferrer">
            DISCLAIMER
          </a>.
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="custom-button2"
        >
          ⬅️ TORNA ALLA HOME
        </button>
      </div>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : (
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="card-section card-green">
            <h1 className="titlesec">MODIFICA IMPOSTAZIONI</h1>

            <label className="form-label">
              ANNO DI NASCITA
              <input
                type="number"
                name="anno_nascita"
                value={settings.anno_nascita}
                onChange={handleChange}
                className="form-input"
              />
            </label>

            <label className="form-label">
              CITTA'
              <input
                type="text"
                name="citta"
                value={settings.citta}
                onChange={handleChange}
                className="form-input"
              />
            </label>

            <label className="form-label">
              PESO (kg)
              <input
                type="number"
                name="peso"
                value={settings.peso}
                onChange={handleChange}
                className="form-input"
                step="0.1"
              />
            </label>

            <label className="form-label">
              ALTEZZA (cm)
              <input
                type="number"
                name="altezza"
                value={settings.altezza}
                onChange={handleChange}
                className="form-input"
                step="0.1"
              />
            </label>

            {/* --- NUOVO: TIMEZONE --- */}
            <label className="form-label">
              FUSO ORARIO
              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                className="form-input"
                required
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="custom-button2">
              💾 SALVA IMPOSTAZIONI
            </button>
            {message && <p style={{ marginTop: "10px" }}>{message}</p>}
          </div>
        </form>
      )}

      {/* --- NUOVO: Pulsante LOGOUT --- */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button className="custom-button3" onClick={handleLogout}>
          LOGOUT
        </button>
      </div>
    </div>
  );
};

export default Settings;

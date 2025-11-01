import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import Statistics from "./statistics";
import Settings from "./Settings";
import LoadingMessage from "./LoadingMessage";
import LogDetail from "./LogDetail";
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";
import "./App.css";
import TypeWriterEffect from "react-typewriter-effect";
import BottomNav from "./BottomNav";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts"; // 🆕 import grafico
import LiquidEtherWrapper from "./LiquidEtherWrapper";
import i18n from "./i18n";
import { useTranslation } from "react-i18next";


const App = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [result, setResult] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [proteins, setProteins] = useState("");
  const [fats, setFats] = useState("");
  const [calories, setCalories] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [insulinUnits, setInsulinUnits] = useState("");
  const [loading, setLoading] = useState(false);
  const [icRatio, setIcRatio] = useState("");
  const [fsi, setFsi] = useState("");
  const [targetGlycemia, setTargetGlycemia] = useState("");
  const [note, setNote] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [timezone, setTimezone] = useState("Europe/Rome");
  const [step, setStep] = useState(1);
  const [lastLogId, setLastLogId] = useState(null);
  const [kowalskaInsulin, setKowalskaInsulin] = useState(null);
  const [kowalskaEquivalent, setKowalskaEquivalent] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [language, setLanguage] = useState("it");
  const { t } = useTranslation();

  const navigate = useNavigate();

  const liquidColors = ['#c5ff27ff', '#ffd24d', '#e9ec18ff'];
  const liquidStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 1,
    };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);  

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
        await fetchTimezone(session.user.id);
      }
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchTimezone(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTimezone = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("timezone")
      .eq("id", userId)
      .single();
    if (!error && data?.timezone) {
      setTimezone(data.timezone);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const options = {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: timezone,
        };
        setCurrentTime(new Intl.DateTimeFormat("en-GB", options).format(now));
      } catch (e) {
        console.error("Errore nel calcolo orario con fuso:", e);
        setCurrentTime(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [timezone]);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select(
        "ic_mattino, ic_pomeriggio, ic_sera, fsi, glicemia_target, timezone"
      )
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
      setFsi(data.fsi || "");
      setTargetGlycemia(data.glicemia_target || "");

      const now = new Date();
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: data.timezone || "Europe/Rome" })
      );
      const hour = userTime.getHours();

      let ic;
      if (hour >= 6 && hour < 10) ic = data.ic_mattino;
      else if (hour >= 10 && hour < 16) ic = data.ic_pomeriggio;
      else if (hour >= 16 && hour < 22) ic = data.ic_sera;
      else ic = data.ic_pomeriggio;
      setIcRatio(ic || "");
    }
  };

  const resizeImage = (base64Str, maxWidth = 800) =>
    new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resizedBase64 = await resizeImage(reader.result);
        setPhoto(resizedBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendToAI = async () => {
    if (!photo) {
      alert("Carica una foto del piatto.");
      return;
    }
    if (!bloodSugar.trim()) {
      alert("Inserisci la glicemia attuale prima di continuare.");
      return;
    }

    const safeDescription = description.trim()
      ? description
      : "Stima i valori nutrizionali (carboidrati, proteine, grassi, calorie) di questo piatto.";

    setStep(3);
    setLoading(true);
    setResult("");
    setCarbohydrates("");
    setProteins("");
    setFats("");
    setCalories("");
    setInsulinUnits("");

    try {
      const fileName = `photo_${Date.now()}.jpg`;
      const base64Data = photo.split(",")[1];
      const file = new File(
        [Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))],
        fileName,
        { type: "image/jpeg" }
      );

      const { error: uploadError } = await supabase.storage
        .from("mealphotos")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error("Errore upload immagine su Supabase");
      }

      const { data: publicUrlData } = supabase.storage
        .from("mealphotos")
        .getPublicUrl(fileName);

      setImageUrl(publicUrlData.publicUrl);

      const response = await fetch("https://carbozentest.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: publicUrlData.publicUrl, 
          description: safeDescription,
          language 
        }),
      });


      const data = await response.json();
      const { nutrients, fullAnalysis } = data;

      setResult(fullAnalysis);

      if (nutrients) {
        setCarbohydrates(nutrients.carbohydrates?.toFixed(1) || "");
        setProteins(nutrients.proteins?.toFixed(1) || "");
        setFats(nutrients.fats?.toFixed(1) || "");
        setCalories(nutrients.calories?.toFixed(0) || "");
      }
    } catch (error) {
      console.error("Errore durante l'invio:", error);
      setResult("Errore durante l'analisi.");
    } finally {
      setLoading(false);
    }
  };

  const roundHalf = (num) => Math.round(num * 2) / 2;

  const calculateInsulin = async () => {
    if (!carbohydrates || !bloodSugar || !icRatio || !fsi || !targetGlycemia) {
      alert("Inserisci tutti i dati richiesti.");
      return;
    }

    try {
      const carbs = parseFloat(carbohydrates);
      const bg = parseFloat(bloodSugar);
      const ic = parseFloat(icRatio);
      const f = parseFloat(fsi);
      const t = parseFloat(targetGlycemia);

      // 🔹 Calcolo insulina standard lato client
      const mealInsulin = carbs / ic;
      const correctionInsulin = (bg - t) / f;
      const total = Math.max(mealInsulin + correctionInsulin, 0);
      const rounded = Math.round(total * 10) / 10;
      setInsulinUnits(rounded);

      // 🔹 Calcolo formula di Kowalska lato server
      const kowalskaRes = await fetch("https://carbozentest.onrender.com/calculate-kowalska", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proteins: parseFloat(proteins),
          fats: parseFloat(fats),
        }),
      });

      const kowalskaData = await kowalskaRes.json();
      setKowalskaInsulin(parseFloat(kowalskaData.additionalBolus)); // 💉 solo il bolo extra
      setKowalskaEquivalent(null);

      let finalImageUrl = imageUrl;

      // 🔹 Salva log nel DB Supabase
      const { data: insertData, error } = await supabase
        .from("insulin_logs")
        .insert({
          user_id: session.user.id,
          glicemia: bg,
          carboidrati: carbs,
          proteine: proteins,
          grassi: fats,
          calorie: calories,
          insulina_calcolata: rounded,
          insulina_kowalska: kowalskaData.additionalBolus,
          cho_equivalenti_kowalska: null,
          image_url: finalImageUrl,
          risultato_ai: result,
          descrizione_inserita: description,
        })
        .select()
        .single();

      if (!error && insertData?.id) setLastLogId(insertData.id);

      setStep(4); // Passa allo step dei risultati
    } catch (error) {
      console.error("Errore durante il calcolo:", error);
      setInsulinUnits("Errore durante il calcolo.");
    }
  };


  const resetWizard = async () => {
    if (lastLogId && note.trim()) {
      try {
        await supabase
          .from("insulin_logs")
          .update({ note: note })
          .eq("id", lastLogId);
      } catch (error) {
        console.error("Errore durante il salvataggio della nota:", error);
      }
    }

    setStep(1);
    setDescription("");
    setPhoto(null);
    setPhotoFile(null);
    setResult("");
    setCarbohydrates("");
    setProteins("");
    setFats("");
    setCalories("");
    setBloodSugar("");
    setInsulinUnits("");
    setNote("");
    setLastLogId(null);
    setKowalskaInsulin(null);
    setKowalskaEquivalent(null);
    setImageUrl(null);
  };

  // 🆕 Dati per il grafico a torta
  const pieData = [
    { name: "Carboidrati", value: parseFloat(carbohydrates) || 0 },
    { name: "Proteine", value: parseFloat(proteins) || 0 },
    { name: "Grassi", value: parseFloat(fats) || 0 },
  ];

  const COLORS = ["#3390B3", "#2ECC71", "#E67E22"];

  if (!session) {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="*"
          element={<Auth onLogin={(user) => setSession({ user })} />}
        />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Routes>
        <Route
          path="/"
          element={
            <div className="container">
              <a href="https://carbozen.it">
                <img src="/logo.png" alt="CarboZen Logo" className="logo-image" />
              </a>
              <p className="instructions">
                {t("fraseSottoLogo")}
              </p>
              <div className="language-selector">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="language-dropdown"
                >
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>

              <div className="wizard-card" style={{ position: "relative", minHeight: "400px" }}>
                {/* LiquidEtherWrapper sempre presente, visibile solo durante loading */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                  opacity: step === 3 && loading ? 1 : 0,
                  pointerEvents: step === 3 && loading ? "auto" : "none",
                  transition: "opacity 0.6s ease",
                }}
              >
                <LiquidEtherWrapper
                  colors={liquidColors}
                  mouseForce={20}
                  pointerEvents="auto"
                  cursorSize={60}
                  isViscous={false}
                  viscous={30}
                  iterationsViscous={32}
                  iterationsPoisson={32}
                  resolution={0.5}
                  isBounce={false}
                  autoDemo={true}
                  autoSpeed={0.25}
                  autoIntensity={1.5}
                  takeoverDuration={0.25}
                  autoResumeDelay={100}
                  autoRampDuration={0.6}
                  className="liquid-ether-wrapper"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              

                <div className="wizard-card-content" style={{ position: "relative", zIndex: 2 }}>
                  {step === 1 && (
                    <div>
                      {!photo ? (
                        <>
                          <h1 className="titlesec">{t("caricaImmagine")}</h1>
                          <label className="upload-button">
                            {t("scegliImmagine")}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="file-input-hidden"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="upload-button">
                            {t("scegliImmagine")}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="file-input-hidden"
                            />
                          </label>
                          <img src={photo} alt="Anteprima" className="preview-image" />
                          <textarea
                            className="description-input"
                            placeholder="Descrizione (facoltativa)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h1 className="titlesec">{t("inserisciParametri")}</h1>
                      <p><b>GLICEMIA ATTUALE</b></p>
                      <input
                        type="number"
                        placeholder="mg/dL"
                        value={bloodSugar}
                        onChange={(e) => setBloodSugar(e.target.value)}
                        onBlur={() => {
                          if (bloodSugar && parseFloat(bloodSugar) < 70) {
                            alert("⚠️ La tua glicemia è bassa, ricordati la regola del 15, assumi 15g di carboidrati e aspetta 15 minuti prima di assumere il bolo.");
                          }
                        }}
                        className={`small-number-input ${!bloodSugar ? "pulse-border" : ""}`}
                      />

                      <p><b>I/C:</b></p>
                      <input
                        type="number"
                        value={icRatio}
                        onChange={(e) => setIcRatio(e.target.value)}
                        className="small-number-input"
                      />

                      <p><b>FSI:</b></p>
                      <input
                        type="number"
                        value={fsi}
                        onChange={(e) => setFsi(e.target.value)}
                        className="small-number-input"
                      />

                      <p><b>GLICEMIA TARGET:</b></p>
                      <input
                        type="number"
                        value={targetGlycemia}
                        onChange={(e) => setTargetGlycemia(e.target.value)}
                        className="small-number-input"
                      />
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h1 className="titlesec">ANALISI AI</h1>

                      {loading && <LoadingMessage />}

                      {!loading && result && (
                        <>
                          <p className="instructions">
                            <b>RISULTATO:</b>
                            <TypeWriterEffect
                              textStyle={{
                                fontSize: "inherit",
                                color: "inherit",
                                textAlign: "inherit",
                              }}
                              startDelay={100}
                              cursorColor="#3390B3"
                              text={result}
                              typeSpeed={20}
                            />
                          </p>

                          {carbohydrates && (
                            <p className="instructions">
                              <b>CARBOIDRATI:</b> {carbohydrates} g
                            </p>
                          )}

                          {proteins && fats && calories && (
                            <div className="instructions">
                              <p><b>PROTEINE:</b> {proteins} g</p>
                              <p><b>GRASSI:</b> {fats} g</p>
                              <p><b>CALORIE:</b> {calories} kcal</p>
                            </div>
                          )}

                          {/* Grafico macronutrienti */}
                          {carbohydrates && proteins && fats && (
                            <div
                              className="chart-container"
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                flexDirection: "column",
                                width: "100%",
                                marginTop: "1rem",
                              }}
                            >
                              <h2 style={{ textAlign: "center", color: "#3390B3" }}>
                                DISTRIBUZIONE MACRONUTRIENTI
                              </h2>
                              <PieChart width={260} height={260}>
                                <Pie
                                  data={[
                                    { name: "CHO", value: parseFloat(carbohydrates) },
                                    { name: "Proteine", value: parseFloat(proteins) },
                                    { name: "Grassi", value: parseFloat(fats) },
                                  ]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={90}
                                  label={({ name, value }) => `${name}: ${value}g`}
                                >
                                  <Cell fill="#3390B3" />
                                  <Cell fill="#33B37A" />
                                  <Cell fill="#FF7F50" />
                                </Pie>
                                <Tooltip formatter={(value) => `${value} g`} />
                                <Legend verticalAlign="bottom" />
                              </PieChart>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {step === 4 && (
                    <div>
                      <h1 className="titlesec">UNITA' INSULINA</h1>
                      {insulinUnits && (
                        <>
                          <div className="insulin-results">
                            <div className="result-card">
                              <h3>CALCOLO STANDARD</h3>
                              <p>
                                <b>UNITA' CONSIGLIATE:</b>{" "}
                                <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3390B3" }}>
                                  {roundHalf(insulinUnits)}
                                </span>
                              </p>
                              <p>BASATO SU <b>{carbohydrates}g</b> DI CARBOIDRATI.</p>
                              <p className="instructions">
                                Bolo da assumere prima del pasto calcolato considerando la tua glicemia attuale, i tuoi parametri I/C e FSI e i grammi di carboidrati del pasto.
                              </p>
                            </div>

                            {kowalskaInsulin && (
                              <div className="result-card" style={{ marginTop: "1.5rem" }}>
                                <h3>FORMULA MODIFICATA DI PANKOWSKA</h3>
                                <p>
                                  <b>UNITA' AGGIUNTIVE PER GRASSI E PROTEINE:</b>{" "}
                                  <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3390B3" }}>
                                    {roundHalf(kowalskaInsulin)}
                                  </span>
                                </p>
                                <p>
                                  BASATO SU <b>{proteins}g</b> PROTEINE E <b>{fats}g</b> GRASSI <br />
                                  ({(proteins * 4 + fats * 9).toFixed(0)} kcal, si consiglia 1 UI ogni 200 kcal)
                                </p>
                                <p className="instructions">
                                  Anche proteine e grassi influenzano la glicemia, il bolo calcolato con la formula modificata di Pankowska va assunto 1,5/2 ore dopo il pasto e ti aiuterà a mantenere sempre in range la tua glicemia.
                                </p>
                              </div>
                            )}
                          </div>

                          <img src={photo} alt="Anteprima" className="preview-image" />

                          <div className="note-section">
                            <p><b>HAI QUALCHE NOTA?</b></p>
                            <textarea
                              placeholder="Scrivi qui..."
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Pulsanti */}
                <div className="wizard-buttons">
                  {step > 1 && step < 4 && (
                    <button className="back-button" onClick={() => setStep(step - 1)}>INDIETRO</button>
                  )}
                  {step === 1 && photo && (
                    <button className="custom-button4" onClick={() => setStep(2)}>AVANTI</button>
                  )}
                  {step === 2 && (
                    <button className="custom-button4" onClick={sendToAI}>ANALIZZA</button>
                  )}
                  {step === 3 && !loading && result && (
                    <button className="custom-button4" onClick={calculateInsulin}>CALCOLA INSULINA</button>
                  )}
                  {step === 4 && (
                    <button className="custom-button4" onClick={resetWizard}>CONCLUDI ANALISI</button>
                  )}
                </div>
              </div>

            </div>
          }
        />

      <Route path="/stats" element={<Statistics userId={session?.user?.id} />} />
      <Route
        path="/settings"
        element={<Settings userId={session?.user?.id} />}
      />
      <Route path="/log/:id" element={<LogDetail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
    </Routes>
    <BottomNav />
    </div>
  );
};

export default App;

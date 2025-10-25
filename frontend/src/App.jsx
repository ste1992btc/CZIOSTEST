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
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts"; // grafico

const App = () => {
  const [session, setSession] = useState(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [result, setResult] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [proteins, setProteins] = useState("");
  const [fats, setFats] = useState("");
  const [calories, setCalories] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [lastLogId, setLastLogId] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // sendToAI ripulito: nessun riferimento a glicemia/insulina/orari/notes
  const sendToAI = async () => {
    if (!photo) {
      alert("Carica una foto del piatto.");
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

    try {
      // upload immagine su Supabase
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

      // chiamata al server di analisi
      const response = await fetch("https://carbozentest.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: publicUrlData.publicUrl,
          description: safeDescription,
        }),
      });

      const data = await response.json();
      const { nutrients, fullAnalysis } = data;

      setResult(fullAnalysis || "");

      // se ci sono nutrienti, aggiorno stati e salvo il log (solo nutrizionali e testo)
      if (nutrients) {
        const carbs = nutrients.carbohydrates?.toFixed(1) || null;
        const prot = nutrients.proteins?.toFixed(1) || null;
        const fat = nutrients.fats?.toFixed(1) || null;
        const kcal = nutrients.calories?.toFixed(0) || null;

        setCarbohydrates(carbs);
        setProteins(prot);
        setFats(fat);
        setCalories(kcal);

        const { data: insertData, error } = await supabase
          .from("insulin_logs") // rimane la tabella storica (ora usata come meal log)
          .insert({
            user_id: session?.user?.id || null,
            carboidrati: carbs,
            proteine: prot,
            grassi: fat,
            calorie: kcal,
            risultato_ai: fullAnalysis,
            descrizione_inserita: safeDescription,
            image_url: publicUrlData.publicUrl,
          })
          .select()
          .single();

        if (error) {
          console.error("Errore salvataggio Supabase:", error);
        } else {
          setLastLogId(insertData?.id || null);
        }
      }
    } catch (error) {
      console.error("Errore durante l'invio:", error);
      setResult("Errore durante l'analisi.");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = async () => {
    // non salvo note (nota rimossa)
    setStep(1);
    setDescription("");
    setPhoto(null);
    setPhotoFile(null);
    setResult("");
    setCarbohydrates("");
    setProteins("");
    setFats("");
    setCalories("");
    setLastLogId(null);
    setImageUrl(null);
  };

  // dati per il grafico a torta (invariati)
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
                STIMA I CARBOIDRATI E I MACRONUTRIENTI PRESENTI NEI TUOI PIATTI CON UNA PRECISIONE MAI VISTA.
              </p>

              <div className="wizard-card">
                <div className="wizard-card-content">
                  {step === 1 && (
                    <div>
                      {!photo ? (
                        <>
                          <h1 className="titlesec">CARICA IMMAGINE</h1>
                          <label className="upload-button">
                            📤 SCEGLI UN'IMMAGINE
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
                            📤 SCEGLI UN'IMMAGINE
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="file-input-hidden"
                            />
                          </label>
                          <img
                            src={photo}
                            alt="Anteprima"
                            className="preview-image"
                          />
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
                          {!loading && carbohydrates && proteins && fats && (
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
                </div>

                {/* Pulsanti */}
                <div className="wizard-buttons">
                  {step > 1 && step < 4 && (
                    <button
                      className="back-button"
                      onClick={() => setStep(step - 1)}
                    >
                      INDIETRO
                    </button>
                  )}
                  {step === 1 && photo && (
                    <button
                      className="custom-button4"
                      onClick={() => sendToAI()}
                    >
                      ANALIZZA
                    </button>
                  )}
                  {step === 2 && (
                    <button className="custom-button4" onClick={sendToAI}>
                      ANALIZZA
                    </button>
                  )}
                  {step === 3 && !loading && result && (
                    <button className="custom-button4" onClick={resetWizard}>
                      NUOVA ANALISI
                    </button>
                  )}
                  {step === 4 && (
                    <button className="custom-button4" onClick={resetWizard}>
                      CONCLUDI ANALISI
                    </button>
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

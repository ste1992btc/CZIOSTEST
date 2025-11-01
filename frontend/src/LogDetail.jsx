import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import "./App.css";

const LogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const fetchLog = async () => {
      const { data, error } = await supabase
        .from("insulin_logs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Errore nel recupero del log:", error.message);
      } else {
        setLog(data);
        if (data.image_url) setImageUrl(data.image_url);
      }
    };

    fetchLog();
  }, [id]);

  const roundHalf = (num) => Math.round(num * 2) / 2;

  const formatTime = (isoString) => {
    const utcString = isoString.endsWith("Z") ? isoString : isoString + "Z";
    const dateUTC = new Date(utcString);
    const options = { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Europe/Rome'
    };
    return dateUTC.toLocaleString('it-IT', options);
  };

  if (!log) return <p className="instructions">Caricamento...</p>;

  // Dati per il grafico a torta
  const pieData = [
    { name: "Carboidrati", value: parseFloat(log.carboidrati) || 0 },
    { name: "Proteine", value: parseFloat(log.proteine) || 0 },
    { name: "Grassi", value: parseFloat(log.grassi) || 0 },
  ];
  const COLORS = ["#3390B3", "#2ECC71", "#E67E22"];

  return (
    <div className="container">
      <div className="header-with-button">
        <h1 className="title">📄 DETTAGLIO ANALISI</h1>
        <button onClick={() => navigate(-1)} className="custom-button2">
          ⬅️ Indietro
        </button>
      </div>

      <div className="card-section card-blue">
        <p className="instructions"><b>DATA:</b> {formatTime(log.created_at)}</p>
        <p className="instructions"><b>GLICEMIA:</b> {log.glicemia} mg/dL</p>
        <p className="instructions"><b>CARBOIDRATI:</b> {log.carboidrati} g</p>
        <p className="instructions"><b>PROTEINE:</b> {log.proteine} g</p>
        <p className="instructions"><b>GRASSI:</b> {log.grassi} g</p>
        <p className="instructions"><b>CALORIE:</b> {log.calorie} kcal</p>
        <p className="instructions"><b>INSULINA CALCOLATA:</b> {roundHalf(parseFloat(log.insulina_calcolata))} u</p>
        <p className="instructions"><b>INSULINA AGGIUNTIVA PANKOWSKA:</b> {roundHalf(parseFloat(log.insulina_kowalska))} u</p>


        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Foto pasto"
            className="preview-image"
            style={{ marginTop: "1rem" }}
          />
        ) : (
          <p className="instructions">📷 NESSUNA FOTO DISPONIBILE</p>
        )}

        <p className="instructions"><b>RISULTATO AI:</b> {log.risultato_ai || "-"}</p>
        <p className="instructions"><b>DESCRIZIONE INSERITA</b> {log.descrizione_inserita || "-"}</p>
        <p className="instructions"><b>NOTE:</b> {log.note || "-"}</p>

        {/* Grafico a torta */}
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
            DISTRIBUZIONE MACRONUTRIENTI:
          </h2>
          <PieChart width={260} height={260}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, value }) => `${name}: ${value}g`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} g`} />
            <Legend verticalAlign="bottom" />
          </PieChart>
        </div>
      </div>
    </div>
  );
};

export default LogDetail;

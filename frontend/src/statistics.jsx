import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";   // 👈 import
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "./App.css";

const Statistics = ({ userId }) => {
  const [logs, setLogs] = useState([]);
  const [average, setAverage] = useState(null);
  const navigate = useNavigate();   // 👈 hook navigazione

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("insulin_logs")
        .select("id, carboidrati, insulina_calcolata, glicemia, created_at, image_url") // 👈 include id
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Errore nel recupero dei log:", error.message);
        return;
      }

      setLogs(data);

      const total = data.reduce((sum, log) => sum + log.insulina_calcolata, 0);
      const avg = data.length ? total / data.length : 0;
      setAverage(Math.round(avg * 10) / 10);
    };

    if (userId) fetchLogs();
  }, [userId]);

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

  const chartData = logs.map((log) => ({
    time: formatTime(log.created_at),
    glicemia: log.glicemia,
    carboidrati: log.carboidrati,
  }));

  return (
    <div className="container">
      <div className="header-with-button">
        <h1 className="title">📊 STATISTICHE</h1>
        <button
          onClick={() => window.location.href = "/"}
          className="custom-button2"
        >
          ⬅️ TORNA ALLA HOME
        </button>
      </div>

      <p className="instructions">
        QUI PUOI VISUALIZZARE I TUOI CALCOLI RECENTI, LA MEDIA DELLE UNITA' DI INSULINA E UN GRAFICO DELLE RILEVAZIONI.
      </p>

      <div className="card-section card-green">
        <h2 className="titlesec">MEDIA UNITA' INSULINICHE</h2>
        {average !== null ? (
          <p className="instructions" style={{ fontSize: "1.2rem" }}>
            MEDIA DELLE ULTIME DOSI: <b>{average} u</b>
          </p>
        ) : (
          <p>Caricamento in corso...</p>
        )}
      </div>

      <div className="card-section card-blue">
        <h2 className="titlesec">📈 ANDAMENTO GLICEMIA / CARBOIDRATI</h2>
        {logs.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...chartData].reverse()} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip
                contentStyle={{ backgroundColor: "#f9f9f9", borderRadius: "10px", border: "1px solid #ccc" }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="glicemia"
                stroke="#007bff"
                strokeWidth={2.5}
                name="Glicemia (mg/dL)"
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="carboidrati"
                stroke="#facc15"
                strokeWidth={2.5}
                name="Carboidrati (g)"
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>Nessun dato disponibile per il grafico.</p>
        )}
      </div>

      <div className="card-section card-green">
        <h2 className="titlesec">📋 ULTIMI CALCOLI</h2>
        {logs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>🕒 ORARIO</th>
                  <th>📷</th>
                  <th>GLICEMIA</th>
                  <th>CARBOIDRATI</th>
                  <th>INSULINA</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => navigate(`/log/${log.id}`)} // 👈 click naviga
                    style={{ cursor: "pointer" }} // 👈 indica cliccabile
                  >
                    <td>{formatTime(log.created_at)}</td>
                    <td>
                      {log.image_url ? (
                        <img
                          src={log.image_url}
                          alt="Pasto"
                          onError={(e) => { e.target.src = "/placeholder.png"; }}
                          style={{
                            width: "60px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "8px"
                          }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{log.glicemia || "-"}</td>
                    <td>{log.carboidrati} g</td>
                    <td>{log.insulina_calcolata} u</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nessun dato disponibile.</p>
        )}
      </div>
    </div>
  );
};

export default Statistics;
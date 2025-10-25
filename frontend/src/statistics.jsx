import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import "./App.css";

const Statistics = ({ userId }) => {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("insulin_logs")
        .select("id, carboidrati, created_at, image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Errore nel recupero dei log:", error.message);
        return;
      }

      setLogs(data);
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
        QUI PUOI VISUALIZZARE I TUOI LOG RECENTI E LE FOTO DEI PASTI.
      </p>

      <div className="card-section card-green">
        <h2 className="titlesec">📋 ULTIMI LOG</h2>
        {logs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>🕒 ORARIO</th>
                  <th>📷</th>
                  <th>CARBOIDRATI</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => navigate(`/log/${log.id}`)}
                    style={{ cursor: "pointer" }}
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
                    <td>{log.carboidrati} g</td>
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

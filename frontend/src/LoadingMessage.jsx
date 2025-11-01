import React, { useEffect, useState } from "react";
import "./App.css";

const facts = [
  "Lo sapevi che puoi modificare i tuoi parametri nelle impostazioni?",
  "Ricordati di verificare periodicamente i tuoi parametri nella sezione profilo",
  "Ricordati che puoi rivedere i tuoi pasti nella sezione statistiche.",
  "CarboZen sta lavorando per te!",
  "Mettere un oggetto (forchetta, bicchiere, ecc..) nella foto aiuta a rendere la stima più precisa.",
  "Seguici sui social!",
  "Nella sezione statistiche cliccando su una delle tue precedenti foto puoi vedere i dettagli del pasto.",
  "Lasciaci una recensione o facci avere un tuo feedback, per noi è importante"
];

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const LoadingMessage = () => {
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const randomized = shuffleArray(facts);
    const alternatingMessages = randomized.flatMap((msg) => ["Caricamento in corso...", msg]);
    setMessages(alternatingMessages);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    const currentMessage = messages[currentIndex];
    const delay = currentMessage === "Caricamento in corso..." ? 1000 : 4000;

    const timeout = setTimeout(() => {
      setFade(false); // inizia fade out
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setFade(true); // fade in nuovo messaggio
      }, 300); // durata del fade in/out
    }, delay);

    return () => clearTimeout(timeout);
  }, [currentIndex, messages]);

  return (
    <div className="loading-container">
      <div className="spinner" />
      <p className={`loading-text ${fade ? "fade-in" : "fade-out"}`}>
        {messages[currentIndex]}
      </p>
    </div>
  );
};

export default LoadingMessage;

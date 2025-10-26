require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai"); 

const app = express();

// 🔐 Controllo variabile d'ambiente
if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ OPENAI_API_KEY non definita nel file .env");
}

const allowedOrigins = [
  "https://carbozen.netlify.app",
  "https://app.carbozen.it",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://10.0.2.2",
  "https://cz4.netlify.app",
  "https://cz5.netlify.app",
  "ionic://localhost"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`❌ Origin non consentita da CORS: ${origin}`));
    }
  },
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "20mb" })); // ✅ niente più body-parser

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * === ENDPOINT ANALYZE ===
 * Fa 5 richieste parallele a GPT, poi ne fa una sesta
 * che calcola la media e riscrive la stima nello stesso stile.
 */
app.post("/analyze", async (req, res) => {
  const { image, description } = req.body;

  console.log("📥 Ricevuta richiesta:");
  console.table({
    Descrizione: description,
    "Immagine base64?": image?.startsWith("data:image") ? "Sì" : "No",
    "Lunghezza image": image?.length || "nessuna",
  });

  if (!image || !image.startsWith("data:image")) {
    return res.status(400).send("❌ Immagine mancante o in formato non valido (base64 richiesto)");
  }
  if (!description || description.trim().length < 3) {
    return res.status(400).send("❌ Descrizione troppo breve o mancante");
  }

  try {
    // === 1. Lancio 5 richieste parallele ===
    const requests = Array.from({ length: 5 }, () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Analizza la foto per capire di che piatto si tratta, stima il peso del piatto (e dei vari ingredienti) e di conseguenza i grammi di carboidrati presenti. " +
              "Cosa fondamentale: La tua risposta deve iniziare con solo i grammi di carboidrati stimati prima di tutto il resto.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Descrizione: ${description}` },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      })
    );

    const results = await Promise.all(requests);
    const fiveEstimates = results.map(r => r.choices[0].message.content.trim());

    console.log("📊 Stime ricevute dalle 5 richieste:");
    console.table(fiveEstimates);

    // === 2. Sesta richiesta con media ===
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      temperature: 0.3, // più stabile
      messages: [
        {
          role: "system",
          content:
            "Hai ricevuto 5 stime indipendenti dei carboidrati di un piatto. Devi leggerle tutte e generare una nuova stima. " +
            "Devi calcolare la MEDIA DEI CARBOIDRATI delle 5 risposte e riscrivere un'analisi nello stesso stile. " +
            "Cosa fondamentale: La tua risposta deve iniziare SOLO con i grammi di carboidrati stimati (il numero medio) prima di tutto il resto.",
        },
        {
          role: "user",
          content: `Ecco le 5 stime:\n\n${fiveEstimates.join("\n\n")}`,
        },
      ],
    });

    const reply = finalResponse.choices[0].message.content.trim();

    res.json({ carbohydratesEstimate: reply });

  } catch (error) {
    console.error("❌ Errore durante la chiamata a OpenAI:", error);
    if (error.response) {
      console.error("📦 Response data:", error.response.data);
      console.error("📦 Status:", error.response.status);
      res.status(500).send(`Errore API OpenAI: ${error.response.data?.error?.message || "Errore generico"}`);
    } else {
      res.status(500).send("Errore generico nel server.");
    }
  }
});

/**
 * === ENDPOINT CALCULATE-INSULIN ===
 */
app.post("/calculate-insulin", (req, res) => {
  const { carbohydrates, bloodSugar, icRatio, fsi, targetBloodSugar } = req.body;

  if (
    carbohydrates === undefined ||
    bloodSugar === undefined ||
    icRatio === undefined ||
    fsi === undefined ||
    targetBloodSugar === undefined
  ) {
    return res.status(400).send("❌ Dati mancanti: servono carboidrati, glicemia attuale, I/C, FSI e glicemia target.");
  }

  const carbsNum = parseFloat(carbohydrates);
  const bloodSugarNum = parseFloat(bloodSugar);
  const icRatioNum = parseFloat(icRatio);
  const fsiNum = parseFloat(fsi);
  const targetNum = parseFloat(targetBloodSugar);

  if (
    isNaN(carbsNum) || isNaN(bloodSugarNum) || isNaN(icRatioNum) || isNaN(fsiNum) || isNaN(targetNum) ||
    icRatioNum <= 0 || fsiNum <= 0
  ) {
    return res.status(400).send("❌ Valori numerici non validi o <= 0 per I/C o FSI.");
  }

  const insulinForCarbs = carbsNum / icRatioNum;
  const insulinForCorrection = bloodSugarNum > targetNum ? (bloodSugarNum - targetNum) / fsiNum : 0;

  let totalInsulin = insulinForCarbs + insulinForCorrection;
  totalInsulin = Math.max(0, Math.round(totalInsulin * 10) / 10);

  res.json({ insulinUnits: totalInsulin.toString() });
});

/**
 * === AVVIO SERVER ===
 */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server avviato sulla porta ${PORT}`);
});

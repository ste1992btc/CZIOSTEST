require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();

// 🔐 Controllo variabile d'ambiente
if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ OPENAI_API_KEY non definita nel file .env");
}

// =========================
// CORS configurato come nella vecchia versione funzionante
// =========================
const allowedOrigins = [
  "https://carbozen.netlify.app",
  "https://app.carbozen.it",
  "capacitor://localhost",
  "http://10.0.2.2",
  "https://cz4.netlify.app",
  "ionic://localhost",
  "https://localhost",
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
app.use(express.json({ limit: "20mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =========================
// Endpoint ANALYZE con supporto lingua
// =========================
app.post("/analyze", async (req, res) => {
  const { image, description, user_id, language = "it" } = req.body;

  console.log("📥 /analyze ricevuto", {
    user_id,
    descriptionLength: description?.length,
    imageLength: image?.length,
    language,
  });

  if (!image) {
    console.warn("⚠️ Immagine mancante o non valida");
    return res.status(400).send("❌ Immagine mancante o non valida.");
  }
  if (!description || description.trim().length < 3) {
    console.warn("⚠️ Descrizione troppo breve");
    return res.status(400).send("❌ Descrizione troppo breve.");
  }

  // === 1️⃣ Definizione dei prompt in base alla lingua ===
  const systemPromptMain = language === "en"
    ? "Analyze the photo to understand the dish, estimate as accurately as possible the weight of the dish and each ingredient, and consequently the grams of carbohydrates. Also estimate proteins, fats, and calories. Always start with a brief JSON summary in the format: {\"carbohydrates\": X, \"proteins\": Y, \"fats\": Z, \"calories\": W}, followed by a short textual description detailing ingredients, estimated weight of each, and step-by-step calculation. For small portions (small slices of cake, single cookies, chips), be careful not to overestimate the weight."
    : "Analizza la foto per capire di che piatto si tratta, stima con la migliore accuratezza possibile il peso del piatto e dei vari ingredienti e di conseguenza i grammi di carboidrati presenti. Oltre i carboidrati stima anche proteine, grassi e calorie. Rispondi SEMPRE iniziando con un riepilogo sintetico in JSON nel formato: {\"carbohydrates\": X, \"proteins\": Y, \"fats\": Z, \"calories\": W} seguito da una breve descrizione testuale in cui dettagli ingredienti, peso stimato di ciascuno e calcolo step-by-step. Se si tratta di porzioni piccole (piccole fette di torta, biscotti singoli, patatine), fai attenzione a non sovrastimare il peso.";

  const systemPromptSupport = language === "en"
    ? "Analyze the photo and provide only an estimate of the main nutrients in JSON format: {\"carbohydrates\": X, \"proteins\": Y, \"fats\": Z, \"calories\": W}, followed by a short explanation."
    : "Analizza la foto e restituisci solo una stima dei nutrienti principali nel formato JSON: {\"carbohydrates\": X, \"proteins\": Y, \"fats\": Z, \"calories\": W} seguita da una breve spiegazione.";

  const systemPromptValidator = language === "en"
    ? "You receive 1 GPT-5 analysis and 2 GPT-4o analyses of the same dish. Goal: produce the most plausible estimate of carbohydrates and other macronutrients based on comparison. Rules: 1) Give more weight to the GPT-5 estimate (always >65% in the final weighted average) and include GPT-4o estimates. 2) If an estimate seems implausible, consider it less in the final weighted average. 3) NEVER mention comparing estimates or model names; stay concise and clear, explaining the rationale for the macronutrient and dish weight estimates. Return final JSON output in format: {\"carbohydrates\": X, \"proteins\": Y, \"fats\": Z, \"calories\": W, \"fullAnalysis\": \"summary text\"}"
    : "Ricevi 1 analisi GPT-5 e 2 GPT-4o sullo stesso piatto. Obiettivo: produrre la stima più plausibile dei carboidrati e anche degli altri macronutrienti basata sul confronto delle stime. Regole: 1) Dai più peso alla stima etichettata GPT-5 (peso SEMPRE maggiore del 65% nella media ponderata finale) e fai una media ponderata considerando anche le stime di GPT-4o. 2) Se una stima appare poco plausibile, considerala molto meno nella media ponderata finale. 3) NON MENZIONARE MAI nella risposta che stai giudicando tra più stime e NON MENZIONARE MAI i nomi dei modelli; rimani sintetico ed esaustivo e spiega le motivazioni che hanno portato alle stime dei macronutrienti e del peso del piatto. Restituisci un output JSON finale nel formato: {\"carbohydrates\": X, \"proteins\": Y, \"fats\": Z, \"calories\": W, \"fullAnalysis\": \"testo riassuntivo\"}";

  try {
    // === 2️⃣ GPT-5 principale ===
    const gpt5Promise = openai.chat.completions.create({
      model: "gpt-5",
      verbosity: "low",
      messages: [
        { role: "system", content: systemPromptMain },
        { role: "user", content: [
            { type: "text", text: `User description: ${description}` },
            { type: "image_url", image_url: { url: image } }
          ] 
        },
      ],
    });

    // === 3️⃣ GPT-4o supporto ===
    const gpt4oPromises = Array.from({ length: 2 }, () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPromptSupport },
          { role: "user", content: [
              { type: "text", text: `User description: ${description}` },
              { type: "image_url", image_url: { url: image } }
            ]
          },
        ],
      })
    );

    const allResults = await Promise.all([gpt5Promise, ...gpt4oPromises]);
    const stimeEtichettate = allResults.map((r, i) => {
      const label = i === 0 ? "GPT-5 (main)" : `GPT-4o (support ${i})`;
      return `--- ${label} ---\n${r.choices[0].message.content.trim()}`;
    });

    // === 4️⃣ Validatore finale ===
    const validation = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPromptValidator },
        { role: "user", content: [{ type: "text", text: `Received analyses:\n\n${stimeEtichettate.join("\n\n")}` }] }
      ],
    });

    const finalReply = validation.choices[0].message.content.trim();

    // === 5️⃣ Parsing JSON ===
    let nutrients = {};
    try {
      const jsonMatch = finalReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) nutrients = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("⚠️ Parsing JSON fallito:", e);
    }

    res.json({
      nutrients: {
        carbohydrates: nutrients.carbohydrates ?? null,
        proteins: nutrients.proteins ?? null,
        fats: nutrients.fats ?? null,
        calories: nutrients.calories ?? null,
      },
      fullAnalysis: nutrients.fullAnalysis || finalReply,
    });
  } catch (error) {
    console.error("❌ Errore durante l'analisi:", error);
    res.status(500).send("Errore API OpenAI durante l'analisi.");
  }
});


// =========================
// Endpoint CALCULATE-INSULIN
// =========================
app.post("/calculate-insulin", (req, res) => {
  const { carbs, icRatio, correctionFactor, currentGlucose, targetGlucose } = req.body;

  if (!carbs || !icRatio || !correctionFactor || !currentGlucose || !targetGlucose) {
    console.warn("⚠️ Parametri mancanti per il calcolo insulina");
    return res.status(400).send("❌ Parametri mancanti per il calcolo.");
  }

  const carbBolus = carbs / icRatio;
  const correctionBolus = (currentGlucose - targetGlucose) / correctionFactor;
  let totalInsulin = Math.max(0, carbBolus + correctionBolus);

  console.log("💉 Calcolo insulina:", { carbBolus, correctionBolus, totalInsulin });

  res.json({
    carbBolus: carbBolus.toFixed(2),
    correctionBolus: correctionBolus.toFixed(2),
    totalInsulin: totalInsulin.toFixed(2),
  });
});

// =========================
// Endpoint CALCULATE-KOWALSKA
// =========================
// =========================
// Endpoint CALCULATE-KOWALSKA (solo bolo aggiuntivo proteine+grassi)
// =========================
app.post("/calculate-kowalska", (req, res) => {
  const { proteins = 0, fats = 0 } = req.body;

  // ✅ Controllo parametri essenziali
  if (proteins < 0 || fats < 0) {
    console.warn("⚠️ Valori di proteine o grassi non validi");
    return res.status(400).send("❌ Valori di proteine o grassi non validi.");
  }

  // 1️⃣ Calorie da proteine e grassi
  const proteinCalories = proteins * 4;
  const fatCalories = fats * 9;
  const totalCalories = proteinCalories + fatCalories;

  // 2️⃣ Calcolo bolo aggiuntivo: 1 unità ogni 200 kcal
  const additionalBolus = totalCalories / 200;

  console.log("🍗 Calcolo bolo aggiuntivo (Kowalska):", {
    proteins,
    fats,
    proteinCalories,
    fatCalories,
    totalCalories,
    additionalBolus,
  });

  // 3️⃣ Risposta
  res.json({
    proteinCalories: proteinCalories.toFixed(1),
    fatCalories: fatCalories.toFixed(1),
    totalCalories: totalCalories.toFixed(1),
    additionalBolus: additionalBolus.toFixed(2),
  });
});


// =========================
// Start server
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server avviato sulla porta ${PORT}`));

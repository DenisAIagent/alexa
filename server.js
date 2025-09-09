import express from "express";
import { SkillBuilders } from "ask-sdk-core";
import askExpressAdapter from "ask-sdk-express-adapter";
import { GoogleGenerativeAI } from "@google/generative-ai";

const { ExpressAdapter } = askExpressAdapter;

// --- Config Gemini ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Handler de lancement ---
const LaunchRequestHandler = {
  canHandle(h) {
    return h.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(h) {
    return h.responseBuilder
      .speak("Bienvenue ! Tu peux me demander l'horoscope du Scorpion.")
      .getResponse();
  }
};

// --- Handler HoroscopeIntent ---
const HoroscopeIntentHandler = {
  canHandle(h) {
    const r = h.requestEnvelope.request;
    return r.type === "IntentRequest" && r.intent.name === "HoroscopeIntent";
  },
  async handle(h) {
    try {
      // Prompt pour Gemini
      const prompt = `
      Donne-moi l'horoscope du jour pour le signe Scorpion.
      Réponds en français, ton oral, max 60 mots.
      Termine toujours par la phrase exactement :
      "Élo toute façon c'est de la merde, tu es une putain de badasse, on t'aime, c'est ça ton horoscope !"
      `;

      const resp = await model.generateContent(prompt);
      const text = resp.response.text().trim().slice(0, 900);

      return h.responseBuilder.speak(text).getResponse();
    } catch (err) {
      console.error("Erreur Gemini:", err);
      return h.responseBuilder
        .speak("Désolé, impossible de récupérer ton horoscope pour l'instant.")
        .getResponse();
    }
  }
};

// --- Skill ---
const skill = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    HoroscopeIntentHandler
  )
  .create();

// --- Express + Alexa adapter ---
const app = express();
app.use(express.json());

const adapter = new ExpressAdapter(skill, false, false);
app.post("/alexa", adapter.getRequestHandlers());

// --- Route test ---
app.get("/", (_, res) => res.send("OK - Alexa Horoscope Gemini Skill"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on port " + PORT));

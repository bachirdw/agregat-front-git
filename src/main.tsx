import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import "./v2.css";
// orchestre-22-11 : une feuille par chantier, chargée après v2.css (A : Skills + composer, B : Consommation).
import "./screen-skills.css";
import "./screen-consumption.css";
// equipe-lisible-22-11 : réponse d'une mission en équipe.
import "./team-answer.css";
createRoot(document.getElementById("root")!).render(<App />);

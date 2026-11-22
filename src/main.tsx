import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import "./v2.css";
// orchestre-22-11 : une feuille par chantier, chargée après v2.css (A : Skills + composer, B : Consommation).
import "./screen-skills.css";
import "./screen-consumption.css";
createRoot(document.getElementById("root")!).render(<App />);

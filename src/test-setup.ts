// Mise en place commune des tests : l'adresse revient à « / » après chaque test (21/11 : la mission
// ouverte vit dans l'adresse, #mission/<id> ; sans remise à zéro, le test suivant la rouvrait).
import { afterEach } from "vitest";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

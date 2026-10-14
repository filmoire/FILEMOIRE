// Les fichiers sont intégrés par esbuild (loader « dataurl »).
import logo from "../../public/brand/filemoire-logo.png";
import atelier from "../../public/demo/atelier.svg";
import boulangerie from "../../public/demo/boulangerie.svg";
import classe from "../../public/demo/classe.svg";
import cuisine from "../../public/demo/cuisine.svg";
import wav from "../../public/demo/exemple-enregistrement.wav";
import jardin from "../../public/demo/jardin.svg";
import mariage from "../../public/demo/mariage.svg";
import plage from "../../public/demo/plage.svg";

const s = (x: unknown) => x as string;

export const ASSETS: Record<string, string> = {
  "/brand/filemoire-logo.png": s(logo),
  "/demo/atelier.svg": s(atelier),
  "/demo/boulangerie.svg": s(boulangerie),
  "/demo/classe.svg": s(classe),
  "/demo/cuisine.svg": s(cuisine),
  "/demo/exemple-enregistrement.wav": s(wav),
  "/demo/jardin.svg": s(jardin),
  "/demo/mariage.svg": s(mariage),
  "/demo/plage.svg": s(plage),
};

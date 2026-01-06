import { clamp } from "./utils.js";

export class PsycheModel {
  constructor(){
    // 0..100
    this.psyche = 50;      // stabilità
    this.dread = 0.25;     // 0..1
    this.guilt = 0.15;     // 0..1
    this.empathy = 0.50;   // 0..1
  }

  applyChoice(effect){
    // effect can be {psyche:+/- , dread:+/- , guilt:+/- , empathy:+/-}
    if (typeof effect.psyche === "number") this.psyche = clamp(this.psyche + effect.psyche, 0, 100);
    if (typeof effect.dread === "number") this.dread = clamp(this.dread + effect.dread, 0, 1);
    if (typeof effect.guilt === "number") this.guilt = clamp(this.guilt + effect.guilt, 0, 1);
    if (typeof effect.empathy === "number") this.empathy = clamp(this.empathy + effect.empathy, 0, 1);
  }
}

export function buildDilemmas(){
  return [
    {
      id: "child_voice",
      title: "SUSSURRO NELLA NEBBIA",
      text: "Senti una voce di bambina tra gli alberi. Potrebbe essere tua figlia… o un’imitazione. La torcia trema.",
      choices: [
        { label: "SEGUI LA VOCE (rischio)", effect: { dread:+0.12, psyche:-8, empathy:+0.08 } },
        { label: "IGNORA E PROSEGUI", effect: { dread:+0.05, psyche:+2, guilt:+0.10 } },
        { label: "CHIAMA IL SUO NOME (esposizione)", effect: { dread:+0.09, psyche:-4, guilt:+0.04, empathy:+0.04 } }
      ]
    },
    {
      id: "stranger",
      title: "L’UOMO SOTTO IL LAMPIONE",
      text: "Un uomo coperto di cenere ti ferma: 'Ho visto la tua bambina. Ma qui ogni aiuto è uno scambio.'",
      choices: [
        { label: "OFFRI IL TUO CIONDOLO (sacrificio)", effect: { psyche:+4, dread:-0.04, empathy:+0.10, guilt:-0.06 } },
        { label: "MINACCIA (controllo)", effect: { psyche:-6, dread:+0.10, guilt:+0.06 } },
        { label: "MENTI (protezione)", effect: { psyche:-2, dread:+0.06, guilt:+0.10 } },
        { label: "ASCOLTA IN SILENZIO", effect: { psyche:+2, dread:+0.02, empathy:+0.04 } }
      ]
    },
    {
      id: "door",
      title: "PORTA CHIUSA / PORTA APERTA",
      text: "Una porta arrugginita vibra come se qualcuno bussasse dall’interno. L’altra è aperta ma conduce nella città più buia.",
      choices: [
        { label: "APRI LA PORTA CHIUSA", effect: { dread:+0.14, psyche:-10, empathy:+0.06 } },
        { label: "ENTRA NELLA CITTÀ", effect: { dread:+0.08, psyche:-2, guilt:+0.05 } },
        { label: "SEGNA IL LUOGO E TORNA INDIETRO", effect: { psyche:+6, dread:-0.03 } }
      ]
    }
  ];
}

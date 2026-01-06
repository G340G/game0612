import { clamp } from "./utils.js";

export class UI {
  constructor(){
    this.elHint = document.getElementById("hint");
    this.elDlg = document.getElementById("dialogue");
    this.elTitle = document.getElementById("dlgTitle");
    this.elText = document.getElementById("dlgText");
    this.elChoices = document.getElementById("dlgChoices");

    this.elPsy = document.getElementById("psyChip");
    this.elHP = document.getElementById("hpChip");
    this.elLevel = document.getElementById("levelChip");

    this.elFog = document.getElementById("fogBar");
    this.elDread = document.getElementById("dreadBar");

    this.elVhs = document.getElementById("vhs");
    this.elVhsInfo = document.getElementById("vhsInfo");

    this.dialogueOpen = false;
    this.currentChoiceCount = 0;
    this.onPick = null;

    window.addEventListener("keydown", (e)=>{
      if (!this.dialogueOpen) return;
      if (e.code === "Escape") this.closeDialogue();
      const idx = ({Digit1:0, Digit2:1, Digit3:2, Digit4:3})[e.code];
      if (idx !== undefined) this.pick(idx);
    });
  }

  setHintVisible(v){ this.elHint.classList.toggle("hidden", !v); }

  setStats({psyche, hp, levelName, fogFactor, dread}){
    this.elPsy.textContent = `PSYCHE ${Math.round(psyche)}`;
    this.elHP.textContent = `HP ${Math.round(hp)}`;
    this.elLevel.textContent = levelName;

    this.elFog.style.width = `${Math.round(clamp(fogFactor,0,1)*100)}%`;
    this.elDread.style.width = `${Math.round(clamp(dread,0,1)*100)}%`;
  }

  openDialogue(dilemma, onPick){
    this.dialogueOpen = true;
    this.onPick = onPick;
    this.elDlg.classList.remove("hidden");

    this.elTitle.textContent = dilemma.title;
    this.elText.textContent = dilemma.text;

    this.elChoices.innerHTML = "";
    this.currentChoiceCount = dilemma.choices.length;

    dilemma.choices.forEach((c, i)=>{
      const div = document.createElement("div");
      div.className = "choice";
      div.innerHTML = `<b>${i+1}</b> ${c.label}`;
      this.elChoices.appendChild(div);
    });
  }

  closeDialogue(){
    this.dialogueOpen = false;
    this.onPick = null;
    this.elDlg.classList.add("hidden");
  }

  pick(i){
    if (!this.dialogueOpen) return;
    if (i < 0 || i >= this.currentChoiceCount) return;
    if (this.onPick) this.onPick(i);
    this.closeDialogue();
  }

  // VHS overlay occasional
  vhsPulse(text){
    this.elVhsInfo.textContent = text;
    this.elVhs.classList.remove("hidden");
    clearTimeout(this._vhsT);
    this._vhsT = setTimeout(()=>this.elVhs.classList.add("hidden"), 900 + Math.random()*700);
  }
}

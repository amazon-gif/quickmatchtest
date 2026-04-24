const express = require("express");
const path = require("path");
const app = express();

// ===== CONFIG =====
const PORT = 3000;
const EPSILON = 0.15;
const MIN_IMPRESSIONS = 100;
const CTR_THRESHOLD = 0.02;

// ===== GEO LINK =====
const geoLinks = {
 US: { A: "https://overestimatecapricornspittle.com/e6vmqt9wj?key=16e6931df1ec0b4d3cbd1dc1d01f39ec", B: "https://overestimatecapricornspittle.com/fbw9nvx8m?key=0891963574cb0bd5747cdb03db9fc5f9" },
 ID: { A: "https://overestimatecapricornspittle.com/e6vmqt9wj?key=16e6931df1ec0b4d3cbd1dc1d01f39ec", B: "https://overestimatecapricornspittle.com/fbw9nvx8m?key=0891963574cb0bd5747cdb03db9fc5f9" },
 DEFAULT: { A: "https://overestimatecapricornspittle.com/e6vmqt9wj?key=16e6931df1ec0b4d3cbd1dc1d01f39ec", B: "https://overestimatecapricornspittle.com/fbw9nvx8m?key=0891963574cb0bd5747cdb03db9fc5f9" }
};

// ===== DATA =====
let stats = {};

// ===== INIT GEO =====
function initGeo(geo){
 if(!stats[geo]){
  stats[geo] = {
   A: { clicks:1, impressions:1, active:true },
   B: { clicks:1, impressions:1, active:true }
  };
 }
}

// ===== GEO DETECT =====
function getGeo(req){
 return (req.headers["cf-ipcountry"] || "DEFAULT").toUpperCase();
}

// ===== CTR =====
function getCTR(s){
 return s.clicks / s.impressions;
}

// ===== AUTO KILL =====
function autoKill(geo){
 const group = stats[geo];
 for(let v in group){
  const s = group[v];

  if(
   s.impressions >= MIN_IMPRESSIONS &&
   getCTR(s) < CTR_THRESHOLD
  ){
   s.active = false;
  }
 }
}

// ===== PICK VARIANT =====
function pickVariant(geo){
 initGeo(geo);
 autoKill(geo);

 const group = stats[geo];
 const active = Object.keys(group).filter(v => group[v].active);

 if(active.length === 0) return "A";

 if(Math.random() < EPSILON){
  return active[Math.floor(Math.random()*active.length)];
 }

 let best = active[0];
 let bestCTR = 0;

 for(let v of active){
  const ctr = getCTR(group[v]);
  if(ctr > bestCTR){
   bestCTR = ctr;
   best = v;
  }
 }

 return best;
}

// ===== STATIC FILE =====
app.use(express.static(path.join(__dirname, "public")));

// ===== ROUTES =====
app.get("/variant", (req, res) => {
 const geo = getGeo(req);
 const v = pickVariant(geo);

 stats[geo][v].impressions++;

 const links = geoLinks[geo] || geoLinks.DEFAULT;

 res.json({ variant: v, link: links[v], geo });
});

app.get("/click", (req, res) => {
 const { v, geo } = req.query;

 if(stats[geo] && stats[geo][v]){
  stats[geo][v].clicks++;
 }

 res.sendStatus(200);
});

app.get("/dashboard", (req, res) => {
 let html = `
 <h2>📊 AI Optimizer Dashboard</h2>
 <style>
 body{font-family:Arial;padding:20px}
 h3{margin-top:20px}
 </style>
 `;

 for(let geo in stats){
  html += `<h3>${geo}</h3><ul>`;
  for(let v in stats[geo]){
   const s = stats[geo][v];
   const ctr = (s.clicks / s.impressions).toFixed(3);

   html += `<li>
   Variant ${v} | CTR: ${ctr} | Clicks: ${s.clicks} | Impr: ${s.impressions} | Active: ${s.active}
   </li>`;
  }
  html += "</ul>";
 }

 res.send(html);
});

app.listen(PORT, () => {
 console.log("🚀 Running on http://localhost:" + PORT);
});
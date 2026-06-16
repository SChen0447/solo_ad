const fs = require('fs');
const path = require('path');

function generateWindData(month) {
  const latSteps = 181;
  const lonSteps = 361;
  const data = [];

  for (let latIdx = 0; latIdx < latSteps; latIdx++) {
    const lat = 90 - latIdx;
    const latRad = (lat * Math.PI) / 180;
    const row = [];

    for (let lonIdx = 0; lonIdx < lonSteps; lonIdx++) {
      const lon = lonIdx - 180;
      const lonRad = (lon * Math.PI) / 180;

      const seasonShift = month === 'july' ? 0.2 : -0.2;
      const latFactor = latRad + seasonShift;

      const jetLat = month === 'july' ? 0.8 : 0.6;
      const jetStrength = month === 'july' ? 35 : 45;
      const jetWidth = 0.25;

      let u = 0;
      let v = 0;

      const jetU = jetStrength * Math.exp(-Math.pow((latFactor - jetLat) / jetWidth, 2));
      const jetU2 = jetStrength * 0.7 * Math.exp(-Math.pow((latFactor + jetLat) / jetWidth, 2));
      u += jetU - jetU2;

      const tradeLat = 0.3;
      const tradeStrength = 8;
      const tradeU = -tradeStrength * Math.exp(-Math.pow((latFactor - tradeLat) / 0.25, 2));
      const tradeU2 = -tradeStrength * Math.exp(-Math.pow((latFactor + tradeLat) / 0.25, 2));
      u += tradeU + tradeU2;

      const polarJetStrength = 12;
      const polarU = polarJetStrength * Math.exp(-Math.pow((latFactor - 1.2) / 0.2, 2));
      const polarU2 = -polarJetStrength * Math.exp(-Math.pow((latFactor + 1.2) / 0.2, 2));
      u += polarU + polarU2;

      const hadleyStrength = 4;
      const hadleyV = -hadleyStrength * Math.sin(latFactor * 3) * Math.exp(-Math.pow(latFactor / 1.0, 2));
      v += hadleyV;

      const ferrelStrength = 3;
      const ferrelV = ferrelStrength * Math.sin((latFactor - 0.8) * 2.5) * Math.exp(-Math.pow((latFactor - 0.8) / 0.5, 2));
      const ferrelV2 = -ferrelStrength * Math.sin((latFactor + 0.8) * 2.5) * Math.exp(-Math.pow((latFactor + 0.8) / 0.5, 2));
      v += ferrelV + ferrelV2;

      const waveStrength = 2;
      const waveNumber = 4;
      u += waveStrength * Math.sin(waveNumber * lonRad) * Math.exp(-Math.pow(latFactor / 0.8, 2));
      v += waveStrength * 0.5 * Math.cos(waveNumber * lonRad) * Math.cos(latFactor);

      const monsoonStrength = month === 'july' ? 6 : 3;
      const monsoonLat = 0.35;
      const monsoonLon = 0.8;
      const monsoonDist = Math.sqrt(Math.pow((latFactor - monsoonLat) / 0.4, 2) + Math.pow((lonRad - monsoonLon) / 0.8, 2));
      const monsoon = monsoonStrength * Math.exp(-monsoonDist * monsoonDist);
      u += monsoon * 0.3;
      v += monsoon * (month === 'july' ? 1 : -0.5);

      const noise = (Math.random() - 0.5) * 1.5;
      u += noise;
      v += noise * 0.5;

      row.push({ u: parseFloat(u.toFixed(3)), v: parseFloat(v.toFixed(3)) });
    }
    data.push(row);
  }

  return {
    month,
    latMin: -90,
    latMax: 90,
    latStep: 1,
    lonMin: -180,
    lonMax: 180,
    lonStep: 1,
    data,
  };
}

const windData = {
  version: '1.0',
  description: 'Global wind field data at 1-degree resolution',
  datasets: {
    january: generateWindData('january'),
    july: generateWindData('july'),
  },
};

const outputPath = path.join(__dirname, 'src', 'windData.json');
fs.writeFileSync(outputPath, JSON.stringify(windData, null, 2));
console.log(`Wind data generated at ${outputPath}`);
const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
console.log(`File size: ${sizeMB} MB`);

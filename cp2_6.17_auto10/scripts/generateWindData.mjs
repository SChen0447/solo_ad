import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function generateWindField(month) {
  const latStep = 2;
  const lonStep = 2;
  const lats = [];
  const lons = [];

  for (let lat = -90; lat <= 90; lat += latStep) {
    lats.push(lat);
  }
  for (let lon = -180; lon < 180; lon += lonStep) {
    lons.push(lon);
  }

  const data = [];

  const isJanuary = month === 'january';
  const seasonFactor = isJanuary ? -1 : 1;

  for (let i = 0; i < lats.length; i++) {
    const lat = lats[i];
    const latRad = toRadians(lat);
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);

    for (let j = 0; j < lons.length; j++) {
      const lon = lons[j];
      const lonRad = toRadians(lon);

      let u = 0;
      let v = 0;

      const jetLat = isJanuary ? 35 : 45;
      const jetWidth = 15;
      const jetStrength = isJanuary ? 55 : 40;
      const jetGaussian = Math.exp(-Math.pow((lat - jetLat) / jetWidth, 2));
      u += jetStrength * jetGaussian * cosLat;

      const jetLat2 = isJanuary ? -30 : -40;
      const jetStrength2 = isJanuary ? 40 : 30;
      const jetGaussian2 = Math.exp(-Math.pow((lat - jetLat2) / jetWidth, 2));
      u += jetStrength2 * jetGaussian2 * cosLat;

      const tradeStrength = isJanuary ? 9 : 7;
      const tradeGaussianN = Math.exp(-Math.pow((lat - 15) / 12, 2));
      const tradeGaussianS = Math.exp(-Math.pow((lat + 15) / 12, 2));
      u -= tradeStrength * tradeGaussianN;
      u -= tradeStrength * tradeGaussianS;

      if (lat > 55) {
        u -= 12 * Math.exp(-Math.pow((lat - 65) / 18, 2)) * cosLat * 0.6;
      }
      if (lat < -50) {
        u -= 18 * Math.exp(-Math.pow((lat + 60) / 18, 2)) * cosLat * 0.7;
      }

      if (lat > 0 && lat < 55) {
        const ferrelWidth = 22;
        const ferrelLat = 38;
        v += 7 * Math.exp(-Math.pow((lat - ferrelLat) / ferrelWidth, 2));
      }
      if (lat < 0 && lat > -55) {
        const ferrelWidth = 22;
        const ferrelLat = -38;
        v -= 7 * Math.exp(-Math.pow((lat - ferrelLat) / ferrelWidth, 2));
      }

      if (Math.abs(lat) < 12) {
        const itczWidth = 10;
        const itczLatShift = seasonFactor * 4;
        v += 5 * Math.exp(-Math.pow((lat - itczLatShift) / itczWidth, 2)) * seasonFactor * -1;
      }

      if (!isJanuary) {
        const monsoonStrength = 9;
        const monsoonLon = 80;
        const monsoonLat = 22;
        const monsoonDist = Math.sqrt(
          Math.pow((lon - monsoonLon) / 35, 2) + Math.pow((lat - monsoonLat) / 18, 2)
        );
        if (monsoonDist < 2.5) {
          const monsoonGauss = Math.exp(-Math.pow(monsoonDist / 1.5, 2));
          u += -monsoonStrength * monsoonGauss * Math.sin(lonRad);
          v += monsoonStrength * monsoonGauss * 0.7;
        }
      }

      const wave1 = Math.sin(lonRad * 3 + seasonFactor * 0.5) * Math.cos(latRad);
      const wave2 = Math.sin(lonRad * 5 - seasonFactor * 0.3) * Math.sin(latRad * 2);
      u += 4 * wave1 + 2.5 * wave2;
      v += 3 * Math.cos(lonRad * 3 + seasonFactor * 0.7) * Math.cos(latRad * 1.5);

      u += 2 * (Math.sin(lonRad * 7 + lat * 0.04) + Math.cos(lonRad * 4 - lat * 0.07)) * 0.3;
      v += 2 * (Math.cos(lonRad * 6 - lat * 0.05) + Math.sin(lonRad * 3 + lat * 0.06)) * 0.3;

      if (Math.abs(lat) > 80) {
        const polarFactor = (Math.abs(lat) - 80) / 10;
        u *= 1 - polarFactor * 0.6;
        v *= 1 - polarFactor * 0.6;
      }

      const eps = 0.0001;
      u = Math.round(u * 100) / 100;
      v = Math.round(v * 100) / 100;
      if (Math.abs(u) < eps) u = 0;
      if (Math.abs(v) < eps) v = 0;

      data.push([u, v]);
    }
  }

  return { latStep, lonStep, lats, lons, data };
}

const januaryField = generateWindField('january');
const julyField = generateWindField('july');

const output = {
  meta: {
    source: 'Synthetic Atmospheric Circulation Model',
    version: '1.0.0',
    dateCreated: new Date().toISOString(),
    unit: 'm/s',
    description: 'Synthetic global wind field data for 2020 January and July. u = zonal wind (positive eastward), v = meridional wind (positive northward)'
  },
  january2020: januaryField,
  july2020: julyField
};

const outPath = path.resolve(__dirname, '..', 'src', 'windData.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 0), 'utf-8');

const stats = fs.statSync(outPath);
console.log(`Generated windData.json: ${(stats.size / 1024).toFixed(1)} KB`);
console.log(`  January grid: ${januaryField.lats.length} latitudes x ${januaryField.lons.length} longitudes = ${januaryField.data.length} points`);
console.log(`  July grid: ${julyField.lats.length} latitudes x ${julyField.lons.length} longitudes = ${julyField.data.length} points`);

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const planetData = {
  mercury: {
    name: '水星',
    mass: 0.055,
    radius: 0.38,
    orbitRadius: 0.39,
    orbitalPeriod: 0.24,
    color: '#b5b5b5'
  },
  venus: {
    name: '金星',
    mass: 0.815,
    radius: 0.95,
    orbitRadius: 0.72,
    orbitalPeriod: 0.62,
    color: '#e6c87a'
  },
  earth: {
    name: '地球',
    mass: 1.0,
    radius: 1.0,
    orbitRadius: 1.0,
    orbitalPeriod: 1.0,
    color: '#6b93d6'
  },
  mars: {
    name: '火星',
    mass: 0.107,
    radius: 0.53,
    orbitRadius: 1.52,
    orbitalPeriod: 1.88,
    color: '#c1440e'
  }
};

const SUN_MASS = 333000;
const G = 6.674e-11;

function calculateOrbitalVelocity(orbitRadiusAu, centralMass) {
  const orbitRadiusMeters = orbitRadiusAu * 1.496e11;
  const centralMassKg = centralMass * 5.972e24;
  const velocity = Math.sqrt(G * centralMassKg / orbitRadiusMeters);
  return velocity / 1000;
}

function calculateOrbitalPeriod(orbitRadiusAu, centralMass) {
  const orbitRadiusMeters = orbitRadiusAu * 1.496e11;
  const centralMassKg = centralMass * 5.972e24;
  const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadiusMeters, 3) / (G * centralMassKg));
  return periodSeconds / (365.25 * 24 * 3600);
}

app.get('/api/planets', (req, res) => {
  res.json(planetData);
});

app.post('/api/orbit', (req, res) => {
  try {
    const { planet, massMultiplier = 1, radiusMultiplier = 1 } = req.body;
    
    if (!planet || !planetData[planet.toLowerCase()]) {
      return res.status(400).json({ error: 'Unknown planet' });
    }

    const basePlanet = planetData[planet.toLowerCase()];
    const newOrbitRadius = basePlanet.orbitRadius * radiusMultiplier;
    const newMass = basePlanet.mass * massMultiplier;
    
    const totalMass = SUN_MASS + newMass;
    const newOrbitalVelocity = calculateOrbitalVelocity(newOrbitRadius, totalMass);
    const newOrbitalPeriod = calculateOrbitalPeriod(newOrbitRadius, totalMass);

    res.json({
      planet: planet.toLowerCase(),
      name: basePlanet.name,
      baseOrbitRadius: basePlanet.orbitRadius,
      orbitRadius: newOrbitRadius,
      orbitalVelocity: newOrbitalVelocity,
      orbitalPeriod: newOrbitalPeriod,
      mass: newMass,
      massMultiplier,
      radiusMultiplier,
      color: basePlanet.color
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orbit', (req, res) => {
  const { planet, massMultiplier = 1, radiusMultiplier = 1 } = req.query;
  
  if (!planet || !planetData[planet.toLowerCase()]) {
    return res.status(400).json({ error: 'Unknown planet' });
  }

  const basePlanet = planetData[planet.toLowerCase()];
  const massMult = parseFloat(massMultiplier) || 1;
  const radiusMult = parseFloat(radiusMultiplier) || 1;
  
  const newOrbitRadius = basePlanet.orbitRadius * radiusMult;
  const newMass = basePlanet.mass * massMult;
  
  const totalMass = SUN_MASS + newMass;
  const newOrbitalVelocity = calculateOrbitalVelocity(newOrbitRadius, totalMass);
  const newOrbitalPeriod = calculateOrbitalPeriod(newOrbitRadius, totalMass);

  res.json({
    planet: planet.toLowerCase(),
    name: basePlanet.name,
    baseOrbitRadius: basePlanet.orbitRadius,
    orbitRadius: newOrbitRadius,
    orbitalVelocity: newOrbitalVelocity,
    orbitalPeriod: newOrbitalPeriod,
    mass: newMass,
    massMultiplier: massMult,
    radiusMultiplier: radiusMult,
    color: basePlanet.color
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

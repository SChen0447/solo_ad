import express, { Request, Response } from 'express';
import cors from 'cors';
import { petModel, Pet, VaccineRecord, VaccineType } from './models/petModel';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

petModel.init();

app.get('/api/pets', (_req: Request, res: Response) => {
  try {
    const pets = petModel.getAllPets();
    const petsWithAge = pets.map(pet => ({
      ...pet,
      age: petModel.calculateAge(pet.birthday),
      nextVaccine: petModel.getNextVaccineInfo(pet),
    }));
    res.json(petsWithAge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

app.get('/api/pets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pet = petModel.getPetById(id);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    const petWithDetails = {
      ...pet,
      age: petModel.calculateAge(pet.birthday),
      nextVaccine: petModel.getNextVaccineInfo(pet),
    };
    res.json(petWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

app.post('/api/pets', (req: Request, res: Response) => {
  try {
    const petData: Omit<Pet, 'id' | 'vaccines' | 'weights'> = req.body;
    const newPet = petModel.createPet(petData);
    res.status(201).json(newPet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pet' });
  }
});

app.put('/api/pets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<Omit<Pet, 'id' | 'vaccines' | 'weights'>> = req.body;
    const updatedPet = petModel.updatePet(id, updates);
    if (!updatedPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    res.json(updatedPet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pet' });
  }
});

app.delete('/api/pets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = petModel.deletePet(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

app.post('/api/pets/:id/vaccines', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vaccineData: Omit<VaccineRecord, 'id' | 'nextDate'> = req.body;
    const updatedPet = petModel.addVaccine(id, vaccineData);
    if (!updatedPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    const petWithDetails = {
      ...updatedPet,
      age: petModel.calculateAge(updatedPet.birthday),
      nextVaccine: petModel.getNextVaccineInfo(updatedPet),
    };
    res.json(petWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vaccine' });
  }
});

app.post('/api/pets/:id/weights', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const weightData = req.body;
    const updatedPet = petModel.addWeight(id, weightData);
    if (!updatedPet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    res.json(updatedPet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add weight record' });
  }
});

app.get('/api/vaccine-types', (_req: Request, res: Response) => {
  const types: VaccineType[] = ['狂犬病', '猫三联', '犬六联', '驱虫'];
  res.json(types);
});

app.get('/api/reminders', (_req: Request, res: Response) => {
  try {
    const pets = petModel.getAllPets();
    const reminders = pets
      .map(pet => {
        const nextVaccine = petModel.getNextVaccineInfo(pet);
        if (!nextVaccine) return null;
        return {
          petId: pet.id,
          petName: pet.name,
          petAvatar: pet.avatar,
          vaccineType: nextVaccine.type,
          date: nextVaccine.date,
          daysUntil: nextVaccine.daysUntil,
          isOverdue: nextVaccine.daysUntil < 0,
          isUrgent: nextVaccine.daysUntil >= 0 && nextVaccine.daysUntil <= 7,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.daysUntil - b!.daysUntil);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

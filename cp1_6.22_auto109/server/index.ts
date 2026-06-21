import express from 'express';
import cors from 'cors';
import routes from './routes.js';

const app = express();
const PORT = 3099;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

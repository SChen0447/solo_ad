import express from 'express';
import cors from 'cors';
import feedbackRouter from './routes/feedback.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', feedbackRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

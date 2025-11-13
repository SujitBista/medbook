import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


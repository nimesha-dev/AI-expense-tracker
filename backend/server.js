import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "AI Expense Tracker API is running"});
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);


app.listen(PORT, () => {
    console.log(`Severver running on port ${PORT}`);
});

//npm run migrate - create the database table according to the schemas

//---RUN ---//
//cd backend, npm run dev
//cd backend, npm run migrate - create database tables
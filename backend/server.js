import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "AI Expense Tracker API is running"});
});

app.listen(PORT, () => {
    console.log(`Severver running on port ${PORT}`);
});

//npm run migrate - create the database table according to the schemas
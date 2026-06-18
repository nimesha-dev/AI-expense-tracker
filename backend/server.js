import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'utils', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "AI Expense Tracker API is running"});
});

const startServer = async () => {
    const { default: authRoutes } = await import('./routes/authRoutes.js');
    const { default: categoryRoutes } = await import('./routes/categoryRoutes.js');
    const { default: transactionRoutes } = await import('./routes/transactionRoutes.js');
    const { default: budgetRoutes } = await import('./routes/budgetRoutes.js');
    const { default: dashboardRoutes } = await import('./routes/dashboardRoutes.js');
    const { default: insightRoutes } = await import('./routes/insightRoutes.js');

    app.use('/api/auth', authRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/budgets', budgetRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/insights', insightRoutes);

    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(err.status || 500).json({
            message: err.message || 'Internal server error',
        });
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();

//npm run migrate - create the database table according to the schemas

//---RUN ---//
//cd backend, npm run dev
//cd backend, npm run migrate - create database tables

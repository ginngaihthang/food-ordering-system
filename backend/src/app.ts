import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser' ;
import route from './routes/authRotes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', route)
app.use('/api/category', categoryRoutes)
app.use('/api/product', productRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
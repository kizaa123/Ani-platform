import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');
const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`ANI Platform API → http://${HOST}:${PORT}`);
});

export default app;

import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || 'localhost';
const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`ANI Platform API → http://${HOST}:${PORT}`);
});

export default app;

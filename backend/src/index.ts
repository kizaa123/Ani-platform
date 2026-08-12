import dotenv from 'dotenv';
import { createApp } from './app';
import { isCloudStorageEnabled } from './services/storage.service';
import { PLATFORM_NAME } from './constants/platform';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');
const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`${PLATFORM_NAME} API → http://${HOST}:${PORT}`);
  console.log(
    isCloudStorageEnabled()
      ? 'Upload storage: Cloudinary (persistent)'
      : process.env.NODE_ENV === 'production'
        ? 'WARNING: Upload storage is local disk - files will be lost on redeploy. Set CLOUDINARY_* env vars.'
        : 'Upload storage: local disk (dev only - set CLOUDINARY_* on Render for production)'
  );
});

export default app;

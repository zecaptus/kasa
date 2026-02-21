import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`[kasa] backend listening on http://localhost:${config.PORT}`);
});

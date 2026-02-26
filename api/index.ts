import dotenv from 'dotenv';
dotenv.config();

import * as server from './src/server';

server.start()
  .then((_server) => server.listen(_server))
  .then(() => console.log('Dash Core Explorer API started'));
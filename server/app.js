const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.use(
    helmet({
      // Map tiles come from another origin, which the default embedder policy would block.
      crossOriginEmbedderPolicy: false,
      // The app is often served over plain http on localhost, so do not force https upgrades.
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'upgrade-insecure-requests': null,
          // Satellite map tiles for the Chennai base map.
          'img-src': ["'self'", 'data:', 'https://*.google.com', 'https://*.googleapis.com', 'https://*.googleusercontent.com', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org', 'https://*.cartocdn.com', 'https://a.basemaps.cartocdn.com'],
        },
      },
    }),
  );
  // The Vite dev server proxies /api, so cross-origin access is only needed when a URL is configured.
  if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', routes);
  app.use('/api', notFoundHandler);

  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
    app.use(express.static(CLIENT_DIST));
    app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = createApp;

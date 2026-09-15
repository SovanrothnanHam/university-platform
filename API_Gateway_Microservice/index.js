const express = require('express');
const httpProxy = require('http-proxy');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const proxy = httpProxy.createProxyServer();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

const REGISTRATION_SERVICE_URL = process.env.REGISTRATION_SERVICE_URL;
const LOGIN_SERVICE_URL = process.env.LOGIN_SERVICE_URL;
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL;

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (!res.headersSent) {
    res.status(502).json({ message: 'The target microservice is not reachable. Is it running?' });
  }
});


function authToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Access denied. Token has expired.' });
      }
      return res.status(403).json({ message: 'Access denied. Invalid token.' });
    }

    req.user = decoded; 
    next();
  });
}


function authRole(requiredRole) {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        message: `Access denied. This API is only for '${requiredRole}' accounts, not '${req.user.role}'.`,
      });
    }
    next();
  };
}


function stampGatewaySecret(req) {
  req.headers['x-gateway-secret'] = GATEWAY_SECRET;
}


function stampUserIdentity(req) {
  if (req.user) {
    req.headers['x-user-email'] = req.user.email;
    req.headers['x-user-role'] = req.user.role;
  }
}

function restoreFullPath(req) {
  req.url = req.originalUrl;
}


app.use('/register', (req, res) => {
  restoreFullPath(req);
  stampGatewaySecret(req);
  proxy.web(req, res, { target: REGISTRATION_SERVICE_URL });
});

app.use('/auth', (req, res) => {
  restoreFullPath(req);
  stampGatewaySecret(req);
  proxy.web(req, res, { target: LOGIN_SERVICE_URL });
});

app.use('/admin', authToken, authRole('admin'), (req, res) => {
  restoreFullPath(req);
  stampGatewaySecret(req);
  stampUserIdentity(req);
  proxy.web(req, res, { target: ADMIN_SERVICE_URL });
});

app.use('/user', authToken, authRole('user'), (req, res) => {
  restoreFullPath(req);
  stampGatewaySecret(req);
  stampUserIdentity(req);
  proxy.web(req, res, { target: USER_SERVICE_URL });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Unknown route. Please check the API path.' });
});

app.listen(PORT, () => {
  console.log(`🚪 API Gateway is running on http://localhost:${PORT}`);
  console.log('   /register  -> Registration Microservice (public)');
  console.log('   /auth      -> Login Microservice (public)');
  console.log('   /admin/*   -> Admin Microservice (admin token required)');
  console.log('   /user/*    -> User Microservice (user token required)');
});

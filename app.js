require('dotenv').config();
const express = require('express');
const { setupRoutes } = require('./src/routes/index');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

setupRoutes(app);
app.get('/health', (req, res) => res.send('OK'));

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
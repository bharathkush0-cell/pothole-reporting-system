const express = require('express');
const path = require('path');

const app = express();
const root = path.join(__dirname, '..');
const frontendDir = path.join(root, 'frontend');
const backendDir = path.join(root, 'backend');

app.use(express.static(frontendDir));
app.use('/backend', express.static(backendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use((req, res) => {
  res.status(404).send('404 - Not Found');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`RoadWatch app running at http://localhost:${port}`);
});

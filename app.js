const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const socketIo = require('socket.io');
const sharp = require('sharp');
const ip = require('ip');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rootPath = process.pkg ? path.dirname(process.execPath) : __dirname;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(rootPath, 'public')));
app.use('/images', express.static(path.join(rootPath, 'images')));
app.use('/thumbnails', express.static(path.join(rootPath, 'thumbnails'))); // Serve thumbnails
app.use('/sounds', express.static(path.join(rootPath, 'sounds')));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const NPCsFilePath = path.join(rootPath, 'npcs.json');
let currentImage = 'images/default.jpg';
let fogChanges = [];  // Stores all fog changes
let fogCleared = true;  // Tracks whether the fog is cleared or not

const patterns = {
  name: 'Nom',
  raceClass: 'Race et Classe',
  appearance: 'Apparence',
  background: 'Antécédents',
  personality: 'Personnalité',
  goals: 'Objectifs',
  plotHooks: 'Accroches de Scénario',
  useInGame: 'Utilisation dans le jeu'
};

const createPattern = (label) => new RegExp(`### ${label}:\n([\\s\\S]+?)(?=###|$)`);

const patternRegex = {
  namePattern: createPattern(patterns.name),
  raceClassPattern: createPattern(patterns.raceClass),
  appearancePattern: createPattern(patterns.appearance),
  backgroundPattern: createPattern(patterns.background),
  personalityPattern: createPattern(patterns.personality),
  goalsPattern: createPattern(patterns.goals),
  plotHooksPattern: createPattern(patterns.plotHooks),
  useInGamePattern: createPattern(patterns.useInGame)
};

const npcFormat = `
  ### ${patterns.name}:
    [name]
  ### ${patterns.raceClass}:
    [race and class]
  ### ${patterns.appearance}:
    [appearance]
  ### ${patterns.background}:
    [background]
  ### ${patterns.personnalité}:
    [personality]
  ### ${patterns.goals}:
    [goals]
  ### ${patterns.plotHooks}:
    [plot hooks]
  ### ${patterns.useInGame}:
    [use in game]
`;

const uploadsounds = multer({ dest: 'sounds/' });

// Routes for static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(rootPath, 'public', 'main.html'));
});

app.get('/npc-tracker', (req, res) => {
  res.sendFile(path.join(rootPath, 'public', 'npc-tracker.html'));
});

app.get('/players', (req, res) => {
  res.sendFile(path.join(rootPath, 'public', 'players.html'));
});

app.get('/soundboard', (req, res) => {
  res.sendFile(path.join(rootPath, 'public', 'soundboard.html'));
});

app.post('/upload', uploadsounds.single('sound'), (req, res) => {
    res.json({ filename: req.file.filename });
});

app.get('/dm', async (req, res) => {
  const imageDir = path.join(rootPath, 'images');
  const thumbnailDir = path.join(rootPath, 'thumbnails');

  if (!fs.existsSync(thumbnailDir)){
    fs.mkdirSync(thumbnailDir);
  }

  fs.readdir(imageDir, async (err, files) => {
    if (err) {
      return res.send('Failed to load images.');
    }

    // Sort files alphabetically
    files = files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Generate thumbnails if not already present
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!supportedFormats.includes(ext)) {
        continue;
      }

      const thumbnailPath = path.join(thumbnailDir, file);
      if (!fs.existsSync(thumbnailPath)) {
        try {
          await sharp(path.join(imageDir, file))
            .resize(100)
            .toFile(thumbnailPath);
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
        }
      }
    }

    let imageHtml = files.map(file => `
      <div class="image-item" data-name="${file}" data-image-path="/images/${file}" style="display: inline-block; margin: 10px; text-align: center;">
        <img src="/thumbnails/${file}" loading="lazy" style="width: 100px; height: auto; display: block; margin-bottom: 5px;">
        <span>${file}</span> <!-- Displaying the name of the image -->
      </div>
    `).join('');

    res.send(`
      <html>
      <head>
        <title>DM Page</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            height: 100vh;
            background: url('background.webp') no-repeat center center fixed; 
            background-size: cover;
            color: white;
          }
          h1 {
            text-align: center;
            padding: 20px;
            text-shadow: 2px 2px 4px #000000;
          }
          #canvasContainer {
            position: relative;
            width: 100%;
            height: 60vh;
            overflow: hidden;
            margin-bottom: 20px;
          }
          canvas {
            position: absolute;
            top: 0;
            left: 0;
          }
          .image-item {
            display: inline-block;
            margin: 10px;
            text-align: center;
            background-color: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          }
          .image-item img {
            width: 100px;
            height: auto;
            display: block;
            margin-bottom: 5px;
          }
          .button {
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            font-size: 1em;
            color: white;
            background-color: rgba(0, 0, 0, 0.7);
            text-decoration: none;
            border-radius: 5px;
            transition: background-color 0.3s, transform 0.3s;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          }
          .button:hover {
            background-color: rgba(0, 0, 0, 0.9);
            transform: translateY(-5px);
          }
          .search-bar {
            margin: 10px 0;
            display: block;
            width: 100%;
            max-width: 400px;
            padding: 10px;
            margin: 10px auto;
            border: none;
            border-radius: 5px;
          }
        </style>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const searchBar = document.createElement('input');
            searchBar.type = 'text';
            searchBar.id = 'search-bar';
            searchBar.className = 'search-bar';
            searchBar.placeholder = 'Search images...';
            document.getElementById('manage-content').insertAdjacentElement('beforebegin', searchBar);

            const images = Array.from(document.querySelectorAll('.image-item'));

            searchBar.addEventListener('input', function() {
              const query = searchBar.value.toLowerCase();
              images.forEach(image => {
                const name = image.dataset.name.toLowerCase();
                image.style.display = name.includes(query) ? 'inline-block' : 'none';
              });
            });
          });
        </script>
      </head>
      <body>
        <h1>Reveal Management</h1>
        <div id="canvasContainer">
          <canvas id="mapCanvas"></canvas>
        </div>
        <button id="toggleFog" class="button">Toggle Fog of War</button>
        <hr>
        <h1>Manage Images</h1>
        <div id="manage-content">
          ${imageHtml}
        </div>
        <script src="/socket.io/socket.io.js"></script>
        <script src="reveal.js"></script>
        <script src="manage.js"></script>
      </body>
      </html>
    `);
  });
});


// Routes for NPC management
async function readNPCs() {
  try {
    const data = await fsPromises.readFile(NPCsFilePath, 'utf8');
    const npcs = JSON.parse(data);
    return npcs.map(npc => ({ ...npc, id: parseInt(npc.id, 10) }));
  } catch (error) {
    console.error('Erreur de lecture des PNJ :', error);
    return [];
  }
}

async function writeNPCs(npcs) {
  try {
    const npcsWithIntegerIds = npcs.map(npc => ({ ...npc, id: parseInt(npc.id, 10) }));
    await fsPromises.writeFile(NPCsFilePath, JSON.stringify(npcsWithIntegerIds, null, 2));
  } catch (error) {
    console.error('Erreur d\'écriture des PNJ :', error);
  }
}

function getNextId(npcs) {
  const ids = npcs.map(npc => parseInt(npc.id, 10));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return maxId + 1;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images');
  },
  filename: async function (req, file, cb) {
    const name = req.body.name || 'unknown';
    const ext = path.extname(file.originalname);
    let filename = `${name.replace(/ /g, '_')}${ext}`;
    let counter = 1;
    while (await fileExists(path.join('images', filename))) {
      filename = `${name.replace(/ /g, '_')}${counter++}${ext}`;
    }
    cb(null, filename);
  }
});

const fileExists = async (filePath) => {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const upload = multer({ storage });

app.post('/api/npcs', async (req, res, next) => {
  const npcs = await readNPCs();
  const nextId = getNextId(npcs);
  req.tempId = nextId;
  next();
}, upload.single('imageFile'), (req, res, next) => {
  req.body.id = req.tempId;
  next();
}, async (req, res) => {
  const npcs = await readNPCs();
  const npc = {
    id: parseInt(req.body.id, 10),
    name: req.body.name,
    goals: req.body.goals || '',
    relationships: req.body.relationships || '[]',
    tags: req.body.tags || '[]',
    raceClass: req.body.raceClass || '',
    appearance: req.body.appearance || '',
    background: req.body.background || '',
    personality: req.body.personality || '',
    plotHooks: req.body.plotHooks || '',
    useInGame: req.body.useInGame || '',
    notes: req.body.notes || '',
    image: req.file ? req.file.filename : ''
  };

  npcs.push(npc);
  await writeNPCs(npcs);
  res.json(npc);
});

app.put('/api/npcs/:id', upload.single('imageFile'), async (req, res) => {
  const npcId = parseInt(req.params.id, 10);
  req.body.id = npcId;

  const npcs = await readNPCs();
  const npcIndex = npcs.findIndex(npc => npc.id === npcId);
  if (npcIndex === -1) {
    return res.status(404).send('PNJ introuvable');
  }

  const npc = npcs[npcIndex];
  Object.assign(npc, req.body);
  npc.id = parseInt(npc.id, 10);

  if (req.file) {
    npc.image = req.file.filename;
  }

  npcs[npcIndex] = npc;
  await writeNPCs(npcs);
  res.json(npc);
});

app.put('/api/npcs/:id/statblock', async (req, res) => {
  const npcId = parseInt(req.params.id, 10);
  const npcs = await readNPCs();
  const npcIndex = npcs.findIndex(npc => npc.id === npcId);

  if (npcIndex === -1) {
    return res.status(404).send('PNJ introuvable');
  }

  npcs[npcIndex].statBlock = req.body.statBlock || '';
  await writeNPCs(npcs);
  res.json({ message: 'Stat block updated successfully' });
});

app.delete('/api/npcs/:id', async (req, res) => {
  const npcId = parseInt(req.params.id, 10);
  const npcs = await readNPCs();
  const npcIndex = npcs.findIndex(npc => npc.id === npcId);
  if (npcIndex === -1) {
    return res.status(404).send('PNJ introuvable');
  }
  const [deletedNpc] = npcs.splice(npcIndex, 1);
  await writeNPCs(npcs);
  res.json(deletedNpc);
});

app.get('/api/npcs', async (req, res) => {
  const npcs = await readNPCs();
  res.json(npcs);
});

app.get('/api/npcs/:id/statblock', async (req, res) => {
  const npcId = parseInt(req.params.id, 10);
  const npcs = await readNPCs();
  const npc = npcs.find(npc => npc.id === npcId);
  if (!npc) {
    return res.status(404).send('PNJ introuvable');
  }
  res.json({ statBlock: npc.statBlock || '' });
});

app.get('/api/npc-names', async (req, res) => {
  const npcs = await readNPCs();
  const npcNames = npcs.map(npc => npc.name);
  res.json(npcNames);
});

app.post('/api/generate-npc', async (req, res) => {
  const { preferredName, preferredRace, preferredClass } = req.body;

  const npcPrompt = `
    Genère une description simple d'un personnage de donjons et dragons.
    N'hésite pas à utiliser des noms aléatoires. Essaie d'être précis et concis, de façon à ce que je puisse lire rapidement le contenu de la fiche.
    Nom préféré: ${preferredName || 'random'}
    Race préférée: ${preferredRace || 'random'}
    Classe préférée: ${preferredClass || 'random'}
    Assures-toi que le PNJ est unique et ta description doit impérativement être formatée comme suit:
    ${npcFormat}
  `;

  try {
    const completionResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'user', content: npcPrompt }
      ]
    });

    const npcDescription = completionResponse.choices[0].message.content;
    const nameMatch = npcDescription.match(patternRegex.namePattern);
    const raceClassMatch = npcDescription.match(patternRegex.raceClassPattern);
    const appearanceMatch = npcDescription.match(patternRegex.appearancePattern);
    const backgroundMatch = npcDescription.match(patternRegex.backgroundPattern);
    const personalityMatch = npcDescription.match(patternRegex.personalityPattern);
    const goalsMatch = npcDescription.match(patternRegex.goalsPattern);
    const plotHooksMatch = npcDescription.match(patternRegex.plotHooksPattern);
    const useInGameMatch = npcDescription.match(patternRegex.useInGamePattern);

    const name = nameMatch ? nameMatch[1].trim() : '';
    const raceClass = raceClassMatch ? raceClassMatch[1].trim() : '';
    const appearance = appearanceMatch ? appearanceMatch[1].trim() : '';
    const background = backgroundMatch ? backgroundMatch[1].trim() : '';
    const personality = personalityMatch ? personalityMatch[1].trim() : '';
    const goals = goalsMatch ? goalsMatch[1].trim() : '';
    const plotHooks = plotHooksMatch ? plotHooksMatch[1].trim() : '';
    const useInGame = useInGameMatch ? useInGameMatch[1].trim() : '';

    const npcData = {
      name,
      raceClass,
      appearance,
      background,
      personality,
      goals,
      plotHooks,
      useInGame,
      fullNpcText: npcDescription
    };

    // Ajout de l'apparence aux données envoyées pour la génération de l'image
    res.json({ ...npcData, appearance });
  } catch (error) {
    console.error('Erreur lors de la génération du PNJ :', error);
    res.status(500).send('Erreur lors de la génération du PNJ');
  }
});

app.post('/api/generate-statblock', async (req, res) => {
  const { monsterCr, monsterType } = req.body;

  const statBlockPrompt = `
    Génère une stat block complète en français pour un monstre de Donjons et Dragons de CR: ${monsterCr} et de type: ${monsterType}.
    Soit inventif pour les actions et potentielles actions légendaires.
    J'aimerai impérativement et uniquement ta réponse dans un joli Markdown de la stat block directement. 
    Pas d'autres commentaires externes au Markdown.
  `;

  try {
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'user', content: statBlockPrompt }
      ]
    });

    console.log(chatResponse);
    const statBlock = chatResponse.choices[0].message.content.trim();
    console.log(statBlock);
    res.json(statBlock);
    
  } catch (error) {
    console.error('Erreur lors de la génération de la Stat Block :', error);
    res.status(500).send('Erreur lors de la génération de la Stat Block');
  }

});

app.get('/api/stream-npc-generation', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const appearance = req.query.appearance; // Récupération de l'apparence depuis les paramètres de la requête

  if (!appearance) {
    sendEvent({ status: 'Erreur : apparence non définie' });
    return res.end();
  }

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ status: 'Texte généré, démarrage de la génération d\'image...' });

  try {
    // Generate image using DALL-E
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Génère un portrait réaliste de ce personnage de Donjons et Dragons : ${appearance}`,
      n: 1,
      size: '1024x1024'
    });

    const imageUrl = imageResponse.data[0].url;

    const { default: fetch } = await import('node-fetch');
    const imageResponseData = await fetch(imageUrl);
    const imageBuffer = await imageResponseData.buffer();
    const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    sendEvent({ status: 'Image générée', image: imageBase64 });
    res.end();
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image :', error);
    sendEvent({ status: 'Erreur lors de la génération de l\'image' });
    res.end();
  }
});

// Route to handle server shutdown
app.post('/shutdown', (req, res) => {
  res.send('Server is shutting down');
  server.close(() => {
    process.exit(0);
  });
});

// Route to handle image updates
app.get('/update-image', (req, res) => {
  const newImage = req.query.path;
  const reveal = req.query.reveal === 'true';
  currentImage = newImage;

  if (reveal) {
    fogCleared = true;  // Clear fog if reveal is true
    fogChanges = [];  // Reset fog changes
  } else {
    fogCleared = false;  // Keep fog if reveal is false
    fogChanges = [];  // Reset fog changes (optional based on use case)
  }

  // Broadcast the image update and fog status to all connected clients
  io.emit('load image', currentImage, reveal);
  io.emit('toggle fog', fogCleared);

  res.json({ success: true });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.emit('load image', currentImage, fogCleared);  // Send current image and reveal state

  if (!fogCleared) {
    fogChanges.forEach(change => {
      socket.emit('draw', change);  // Send each fog change if fog is not cleared
    });
  } else {
    // do nothing if fog is cleared
  }

  socket.on('draw', (data) => {
    fogChanges.push(data);
    io.emit('draw', data);  // Broadcast change to all clients
  });

  socket.on('toggle fog', (isCleared) => {
    fogCleared = isCleared;
    io.emit('toggle fog', fogCleared);  // Broadcast fog toggle status
    if (fogCleared) {
      fogChanges = [];  // Clear fog changes if fog is cleared
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const startServer = async () => {
  server.listen(3000, async () => {
    const serverAddress = 'http://' + ip.address() + ':3000';
    console.log('Server is running on ' + serverAddress);
    const open = (await import('open')).default;  // Dynamic import for the open module
    open(serverAddress);  // Open the default web browser
  });
};

startServer();

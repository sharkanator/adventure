document.addEventListener('DOMContentLoaded', () => {
  const npcList = document.getElementById('npc-list');
  const createNpcButton = document.getElementById('create-npc');
  const searchBar = document.getElementById('search-bar');
  const npcModal = document.getElementById('npc-modal');
  const statblockModal = document.getElementById('statblock-modal');
  const npcForm = document.getElementById('npc-form');
  const deleteNpcButton = document.getElementById('delete-npc');
  const imagePreview = document.getElementById('image-preview');
  const imageFileInput = document.getElementById('imageFile');
  const toggleDarkModeButton = document.getElementById('toggle-dark-mode');
  const saveStatblockButton = document.getElementById('save-statblock');
  const appContainer = document.getElementById('app');
  const generateNpcButton = document.getElementById('generate-npc');
  const customSpinner = document.getElementById('custom-spinner');
  const npcGenerationForm = document.getElementById('npc-generation-form');
  const npcGenerationModal = document.getElementById('npc-generation-modal');
  const generationStatus = document.getElementById('generation-status');
  const preferredRaceInput = document.getElementById('preferredRace');
  const preferredClassInput = document.getElementById('preferredClass');
  const preferredNameInput = document.getElementById('preferredName');

  const races = ["Humain", "Elfe", "Nain", "Halfelin", "Gnome", "Demi-elfe", "Demi-orc", "Tieffelin", "Drakéide", "Aarakocra", "Goliath", "Genasi"];
  const classes = ["Barbare", "Barde", "Clerc", "Druide", "Guerrier", "Moine", "Paladin", "Rôdeur", "Roublard", "Ensorceleur", "Magicien", "Sorcier"];

  const tagifyRace = new Tagify(preferredRaceInput, { whitelist: races, dropdown: { maxItems: 12, enabled: 0, closeOnSelect: true } });
  const tagifyClass = new Tagify(preferredClassInput, { whitelist: classes, dropdown: { maxItems: 12, enabled: 0, closeOnSelect: true } });

  let npcs = [];
  let existingTags = [];
  let existingNames = [];
  let tagifyTags;
  let tagifyRelationships;
  let currentNpc = null;
  let simplemde;

  const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  const fetchNpcs = async () => {
    try {
      const response = await fetch('/api/npcs');
      const data = await response.json();
      npcs = data;
      displayNpcs(npcs);
      updateExistingTags();
      await fetchNpcNames();
    } catch (error) {
      console.error('Échec de la récupération des PNJ :', error);
    }
  };

  const fetchNpcNames = async () => {
    try {
      const response = await fetch('/api/npc-names');
      existingNames = await response.json();
    } catch (error) {
      console.error('Échec de la récupération des noms des PNJ :', error);
    }
  };

  const updateExistingTags = () => {
    existingTags = [];
    existingNames = npcs.map(npc => npc.name);
    npcs.forEach(npc => {
      const tagsArray = JSON.parse(npc.tags || '[]').map(tag => tag.value);
      const relationshipsArray = JSON.parse(npc.relationships || '[]').map(rel => rel.value);
      existingTags = [...new Set([...existingTags, ...tagsArray, ...relationshipsArray])];
    });
  };

  const displayNpcs = (npcs) => {
    npcList.innerHTML = '';
    npcs.forEach((npc) => {
      const npcTile = document.createElement('div');
      npcTile.className = 'npc-tile';
      npcTile.onmouseover = () => npcTile.querySelector('.npc-inner').classList.add('flipped');
      npcTile.onmouseleave = () => npcTile.querySelector('.npc-inner').classList.remove('flipped');

      const tagsArray = JSON.parse(npc.tags || '[]');
      const relationshipsArray = JSON.parse(npc.relationships || '[]');
      const timestamp = new Date().getTime();
      npcTile.innerHTML = `
        <div class="npc-inner">
          <div class="npc-front" onclick="event.stopPropagation(); openEditModal(${npc.id});">
            <div class="npc-name">${npc.name}</div>
            <img src="/images/${npc.image}?${timestamp}" alt="${npc.name}" onerror="this.onerror=null;this.src='/images/whois.webp';" />
            <p>${npc.raceClass}</p>
            <div class="tags">${[...tagsArray, ...relationshipsArray].map(tag => `<span class="badge badge-primary">${tag.value}</span>`).join(' ')}</div>

          </div>
          <div class="npc-back" onclick="event.stopPropagation(); openEditModal(${npc.id});">
            <div><strong>Notes:</strong> ${npc.notes}</div>
            <div><strong>Objectifs:</strong> ${npc.goals}</div>
            <div><strong>Accroche de scénario:</strong> ${npc.plotHooks}</div>
            <div><strong>Utilisation dans le jeu:</strong> ${npc.useInGame}</div>
            <div><strong>Antécédents:</strong> ${npc.background}</div>
            <div><strong>Personnalité:</strong> ${npc.personality}</div>
          </div>
        </div>
        <div class="stat-block-button-container">
          <button class="btn btn-view-stat-block stat-block-button" onclick="event.stopPropagation(); openStatBlockModal(${npc.id})">Stat Block</button>
          <button class="btn btn-view-character-sheet" onclick="event.stopPropagation(); openCharacterSheetModal(${npc.id})">Feuille de Personnage</button>
        </div>
      `;
      npcList.appendChild(npcTile);
    });
  };

  window.openStatBlockModal = async (id) => {
    try {
      const response = await fetch(`/api/npcs/${id}/statblock`);
      if (!response.ok) {
        throw new Error('Stat block not found');
      }
      const statBlock = await response.json();
      currentNpc = npcs.find(npc => npc.id === id);

      const statBlockContent = (statBlock && typeof statBlock === 'string') ? statBlock : statBlock.statBlock || '';

      if (simplemde) {
        simplemde.toTextArea();
        simplemde = null;
      }

      simplemde = new SimpleMDE({
        element: document.getElementById("stat-block-content"),
        initialValue: statBlockContent,
        autoDownloadFontAwesome: false,
        status: false,
        toolbar: false,
        previewRender: function (plainText) {
          return window.markdownit().render(plainText);
        }
      });

      if (!simplemde.isPreviewActive()) {
        simplemde.togglePreview();
      }

      const statblockModalId = document.getElementById('statblock-modal-id');
      if (statblockModalId) {
        statblockModalId.value = currentNpc.id;
      } else {
        console.error("statblock-modal-id element not found");
      }

      $('#statblock-modal').modal('show');
      setTimeout(() => simplemde.codemirror.refresh(), 0);
    } catch (error) {
      console.error('Erreur lors de la récupération du stat block :', error);
      alert(`Erreur lors de la récupération du stat block : ${error.message}`);
    }
  };

  $('#statblock-modal').on('shown.bs.modal', function () {
    if (simplemde) {
      simplemde.codemirror.refresh();
    }
  });

  $('#statblock-modal').on('hidden.bs.modal', function () {
    if (simplemde) {
      simplemde.value('');
      simplemde.toTextArea();
      simplemde = null;
    }
    document.getElementById('stat-block-content').value = '';
  });


  document.getElementById('statblock-modal').addEventListener('click', function () {
    if (simplemde && simplemde.isPreviewActive()) {
      simplemde.togglePreview();
    }
  });

  window.openEditModal = (id) => {
    const npc = npcs.find(npc => npc.id === id);
    openModal(npc);
  };

  window.openCharacterSheetModal = async (id) => {
    try {
      const npc = npcs.find(npc => npc.id === id);
      const response = await fetch(`/api/npcs/${id}/statblock`);
      const statBlock = await response.json();
      const statBlockContent = (statBlock && typeof statBlock === 'string') ? statBlock : statBlock.statBlock || '';

      const characterSheetContent = document.getElementById('character-sheet-content');

      const npcDetails = `
        <div class="character-sheet">
          <div class="character-header">
            <img src="/images/${npc.image}" alt="${npc.name}" class="character-image">
            <h2>${npc.name}</h2>
            <p><strong>Race et Classe:</strong> ${npc.raceClass}</p>
          </div>
          <div class="character-details">
            <div><strong>Notes:</strong> ${npc.notes}</div>
            <div><strong>Objectifs:</strong> ${npc.goals}</div>
            <div><strong>Accroche de scénario:</strong> ${npc.plotHooks}</div>
            <div><strong>Utilisation dans le jeu:</strong> ${npc.useInGame}</div>
            <div><strong>Antécédents:</strong> ${npc.background}</div>
            <div><strong>Personnalité:</strong> ${npc.personality}</div>
            <div><strong>Relations:</strong> ${JSON.parse(npc.relationships || '[]').map(rel => rel.value).join(', ')}</div>
            <div><strong>Tags:</strong> ${JSON.parse(npc.tags || '[]').map(tag => tag.value).join(', ')}</div>
          </div>
        </div>
        <div class="page-break"></div>
      `;

      const renderedStatBlock = markdownit().render(statBlockContent);

      characterSheetContent.innerHTML = `${npcDetails}<div class="stat-block">${renderedStatBlock}</div>`;

      $('#character-sheet-modal').modal('show');
    } catch (error) {
      console.error('Erreur lors de la récupération du stat block :', error);
      alert(`Erreur lors de la récupération du stat block : ${error.message}`);
    }
  };


  window.printCharacterSheet = () => {
    const characterSheetContent = document.getElementById('character-sheet-content').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=600');
    printWindow.document.write('<html><head><title>Feuille de Personnage</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      .character-sheet {
        padding: 20px;
        font-family: 'Georgia', serif;
        color: #333;
      }
      .character-header {
        text-align: center;
        margin-bottom: 20px;
      }
      .character-header .character-image {
        border-radius: 50%;
        width: 100px; /* Reduced width */
        height: 100px; /* Reduced height */
        object-fit: cover;
        margin-bottom: 10px;
      }
      .character-header h2 {
        font-size: 2em;
        margin-bottom: 10px;
      }
      .character-details {
        margin-bottom: 20px;
      }
      .character-details div {
        margin-bottom: 10px;
      }
      .stat-block {
        background-color: #fdf1dc;
        border: 1px solid #d65f0b;
        padding: 20px;
        color: #8b4513;
      }
      .stat-block-overview,
      .stat-block-attributes,
      .stat-block-section {
        margin-bottom: 20px;
      }
      .stat-block-overview div,
      .stat-block-attributes div,
      .stat-block-section div {
        margin-bottom: 5px;
      }
      .page-break {
        page-break-before: always;
      }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(characterSheetContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const openModal = (npc = {}) => {
    currentNpc = npc;
    npcForm.reset();
    npcForm.elements['id'].value = npc.id || '';
    npcForm.elements['name'].value = npc.name || '';
    imageFileInput.value = '';
    const timestamp = new Date().getTime();
    imagePreview.src = npc.image ? `/images/${npc.image}?${timestamp}` : '';
    imagePreview.style.display = npc.image ? 'block' : 'none';
    npcForm.elements['raceClass'].value = npc.raceClass || '';
    npcForm.elements['relationships'].value = JSON.parse(npc.relationships || '[]').map(tag => tag.value).join(',');
    npcForm.elements['tags'].value = JSON.parse(npc.tags || '[]').map(tag => tag.value).join(',');
    npcForm.elements['notes'].value = npc.notes || '';
    npcForm.elements['goals'].value = npc.goals || '';
    npcForm.elements['appearance'].value = npc.appearance || '';
    npcForm.elements['background'].value = npc.background || '';
    npcForm.elements['personality'].value = npc.personality || '';
    npcForm.elements['plotHooks'].value = npc.plotHooks || '';
    npcForm.elements['useInGame'].value = npc.useInGame || '';
    document.getElementById('full-npc-text').value = npc.fullNpcText || '';

    preferredNameInput.value = npc.name || '';

    $(npcModal).modal('show');
    deleteNpcButton.style.display = npc.id ? 'inline-block' : 'none';
    initTagify(npcForm.elements['tags']);
    initTagify(npcForm.elements['relationships'], existingNames);

    adjustTextareaHeight();
  };

  const initTagify = (element, whitelist = existingTags) => {
    if (element.name === 'tags') {
      if (tagifyTags) {
        tagifyTags.destroy();
      }
      tagifyTags = new Tagify(element, {
        whitelist: existingTags,
        dropdown: {
          enabled: 0,
          maxItems: 5,
          closeOnSelect: true
        }
      });
    } else if (element.name === 'relationships') {
      if (tagifyRelationships) {
        tagifyRelationships.destroy();
      }
      tagifyRelationships = new Tagify(element, {
        whitelist: existingNames,
        dropdown: {
          enabled: 0,
          maxItems: 5,
          closeOnSelect: true
        }
      });
    }
  };

  npcForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData();

    const tags = tagifyTags ? JSON.stringify(tagifyTags.value.map(tag => ({ value: tag.value.trim() }))) : null;
    const relationships = tagifyRelationships ? JSON.stringify(tagifyRelationships.value.map(tag => ({ value: tag.value.trim() }))) : null;

    const getValue = (name) => npcForm.elements[name] ? npcForm.elements[name].value : '';

    formData.append('id', getValue('id'));
    formData.append('name', getValue('name'));
    formData.append('notes', getValue('notes'));
    formData.append('goals', getValue('goals'));
    formData.append('relationships', relationships || '');
    formData.append('tags', tags || '');
    formData.append('raceClass', getValue('raceClass'));
    formData.append('appearance', getValue('appearance'));
    formData.append('background', getValue('background'));
    formData.append('personality', getValue('personality'));
    formData.append('plotHooks', getValue('plotHooks'));
    formData.append('useInGame', getValue('useInGame'));

    if (imageFileInput.files.length > 0) {
      formData.append('imageFile', imageFileInput.files[0]);
    } else if (imagePreview.src.startsWith('data:image/')) {
      const blob = base64ToBlob(imagePreview.src, 'image/png');
      formData.append('imageFile', blob, `${getValue('id')}.${getValue('name').replace(/ /g, '_')}.png`);
    }

    const method = getValue('id') ? 'PUT' : 'POST';
    const endpoint = getValue('id') ? `/api/npcs/${getValue('id')}` : '/api/npcs';

    try {
      const response = await fetch(endpoint, {
        method,
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de l\'enregistrement du PNJ :', errorText);
        alert(`Erreur lors de l'enregistrement du PNJ : ${errorText}`);
        return;
      }

      const newNpc = await response.json();
      if (method === 'POST') {
        npcs.push(newNpc);
      } else {
        const index = npcs.findIndex(npc => npc.id === newNpc.id);
        npcs[index] = newNpc;
      }
      updateExistingTags();
      displayNpcs(npcs);
      $(npcModal).modal('hide');
      fetchNpcNames();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du PNJ :', error);
      alert(`Erreur lors de l'enregistrement du PNJ : ${error.message}`);
    }
  });

  deleteNpcButton.addEventListener('click', async () => {
    const id = npcForm.elements['id'].value;
    if (confirm('Êtes-vous sûr de vouloir supprimer ce PNJ ?')) {
      try {
        const response = await fetch(`/api/npcs/${id}`, { method: 'DELETE' });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur lors de la suppression du PNJ :', errorText);
          alert(`Erreur lors de la suppression du PNJ : ${errorText}`);
          return;
        }

        npcs = npcs.filter(npc => npc.id !== parseInt(id));
        updateExistingTags();
        displayNpcs(npcs);
        $(npcModal).modal('hide');
        fetchNpcNames();
      } catch (error) {
        console.error('Erreur lors de la suppression du PNJ :', error);
        alert(`Erreur lors de la suppression du PNJ : ${error.message}`);
      }
    }
  });

  imageFileInput.addEventListener('change', () => {
    const file = imageFileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        imagePreview.src = reader.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.style.display = 'none';
    }
  });

  createNpcButton.addEventListener('click', () => {
    openModal();
  });

  searchBar.addEventListener('input', debounce((event) => {
    const searchQuery = event.target.value.toLowerCase().split(' ');
    const filteredNpcs = npcs.filter(npc => {
      const combinedText = [
        npc.name,
        npc.goals,
        ...JSON.parse(npc.tags || '[]').map(tag => tag.value),
        ...JSON.parse(npc.relationships || '[]').map(rel => rel.value),
        npc.statBlock
      ].join(' ').toLowerCase();

      return searchQuery.every(term => combinedText.includes(term));
    });
    displayNpcs(filteredNpcs);
  }, 300));

  toggleDarkModeButton.addEventListener('click', () => {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('mode', 'light-mode');
    } else {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      localStorage.setItem('mode', 'dark-mode');
    }
  });

  const savedMode = localStorage.getItem('mode');
  if (savedMode) {
    document.body.classList.add(savedMode);
  } else {
    document.body.classList.add('light-mode'); // Default to light mode
  }

  fetchNpcs();
  searchBar.focus();

  saveStatblockButton.addEventListener('click', async () => {
    const statBlock = simplemde.value();
    const npcId = document.getElementById('statblock-modal-id').value;

    if (!npcId) {
      alert('Données PNJ non valides. Veuillez vous assurer que le PNJ a un ID valide.');
      return;
    }

    try {
      const response = await fetch(`/api/npcs/${npcId}/statblock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statBlock })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de l\'enregistrement du stat block :', errorText);
        alert(`Erreur lors de l'enregistrement du stat block : ${errorText}`);
        return;
      }

      await fetchNpcs();
      $(statblockModal).modal('hide');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du stat block :', error);
      alert(`Erreur lors de l'enregistrement du stat block : ${error.message}`);
    }
  });

  generateNpcButton.addEventListener('click', async () => {
    $(npcGenerationModal).modal('show');
  });

  npcGenerationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const preferredName = preferredNameInput.value.trim() || 'random';
    const preferredRace = JSON.parse(preferredRaceInput.value || '[]').map(item => item.value).join(', ') || 'random';
    const preferredClass = JSON.parse(preferredClassInput.value || '[]').map(item => item.value).join(', ') || 'random';

    generateNpcButton.disabled = true;
    customSpinner.style.display = 'inline-block';
    customSpinner.classList.add('spinner-border');
    generationStatus.innerText = 'Démarrage...';

    try {
      const response = await fetch('/api/generate-npc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferredName, preferredRace, preferredClass })
      });

      const npcData = await response.json();

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PNJ');
      }

      const eventSource = new EventSource(`/api/stream-npc-generation?appearance=${encodeURIComponent(npcData.appearance)}`);

      eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.status) {
          generationStatus.innerText = data.status;
        }
        if (data.image) {
          imagePreview.src = data.image;
          imagePreview.style.display = 'block';

          npcForm.elements['name'].value = npcData.name;
          npcForm.elements['raceClass'].value = npcData.raceClass;
          npcForm.elements['appearance'].value = npcData.appearance;
          npcForm.elements['background'].value = npcData.background;
          npcForm.elements['personality'].value = npcData.personality;
          npcForm.elements['goals'].value = npcData.goals;
          npcForm.elements['plotHooks'].value = npcData.plotHooks;
          npcForm.elements['useInGame'].value = npcData.useInGame;
          document.getElementById('full-npc-text').value = npcData.fullNpcText;

          generationStatus.innerText = 'PNJ généré avec succès !';
          generateNpcButton.disabled = false;
          customSpinner.style.display = 'none';
          customSpinner.classList.remove('spinner-border');
          $(npcGenerationModal).modal('hide');
          eventSource.close();
        }
      };

      eventSource.onerror = function (event) {
        console.error('Erreur lors de la génération des détails du PNJ', event);
        alert('Erreur lors de la génération des détails du PNJ.');
        generateNpcButton.disabled = false;
        customSpinner.style.display = 'none';
        customSpinner.classList.remove('spinner-border');
        $(npcGenerationModal).modal('hide');
        eventSource.close();
      };
    } catch (error) {
      console.error(error);
      alert(error.message);
      generateNpcButton.disabled = false;
      customSpinner.style.display = 'none';
      customSpinner.classList.remove('spinner-border');
      $(npcGenerationModal).modal('hide');
    }
  });

  window.openGenerateStatBlockModal = () => {
    $('#generate-statblock-modal').modal('show');
  };

  const displayGeneratedStatBlock = (statBlock) => {
    if (!simplemde) {
      simplemde = new SimpleMDE({ element: document.getElementById("stat-block-content") });
    }
    simplemde.value(statBlock);
  };

  document.getElementById('generate-statblock-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const monsterCr = document.getElementById('monster-cr').value.trim() || 'random';
    const monsterType = document.getElementById('monster-type').value.trim() || 'random';
    const statblockSpinner = document.getElementById('statblock-spinner');
    const generatedStatblockContent = document.getElementById('generated-statblock-content');

    statblockSpinner.style.display = 'inline-block';
    generatedStatblockContent.innerHTML = '';

    try {
      const response = await fetch('/api/generate-statblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ monsterCr, monsterType })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération de la Stat Block');
      }

      const statBlock = await response.json();
      displayGeneratedStatBlock(statBlock);
      $('#generate-statblock-modal').modal('hide');
      $('#statblock-modal').modal('show');

      statblockSpinner.style.display = 'none';
    } catch (error) {
      console.error(error);
      alert(error.message);
      statblockSpinner.style.display = 'none';
    }
  });

  function base64ToBlob(base64, mime) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  function adjustTextareaHeight() {
    const textareas = npcForm.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
      });
    });
  }
});


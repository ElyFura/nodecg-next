/**
 * ============================================================================
 * NODECG NEXT - BUNDLE EXTENSION TEMPLATE
 * ============================================================================
 * Datei: extension-template.js
 * Beschreibung: Template für NodeCG Next Bundle Extensions
 * 
 * Extensions laufen serverseitig und haben vollen Zugriff auf:
 * - Replicants (Lesen & Schreiben)
 * - Messages (Senden & Empfangen)
 * - Assets
 * - NodeCG API
 * - Node.js Module
 * 
 * @param {Object} nodecg - NodeCG API Instance
 * @author NodeCG Next Development Team
 * @version 1.0.0
 * ============================================================================
 */

module.exports = function(nodecg) {
  
  // ==========================================================================
  // IMPORTS & DEPENDENCIES
  // ==========================================================================
  
  // Node.js Core Modules
  const fs = require('fs').promises;
  const path = require('path');
  const { EventEmitter } = require('events');
  
  // NPM-Pakete (falls benötigt)
  const axios = require('axios');  // Beispiel für HTTP-Requests
  
  // NodeCG Logger (mit Bundle-Namen prefixed)
  const logger = nodecg.Logger('my-awesome-bundle');
  
  // ==========================================================================
  // REPLICANTS
  // ==========================================================================
  // Replicants sind der Haupt-State-Management-Mechanismus
  
  /**
   * Scoreboard Replicant
   * Synchronisiert sich automatisch mit allen Clients
   */
  const scoreboardRep = nodecg.Replicant('scoreboard', {
    defaultValue: {
      teamA: { name: 'Team A', score: 0 },
      teamB: { name: 'Team B', score: 0 },
      quarter: 1,
      timeRemaining: '12:00'
    },
    persistent: true,  // Im Dateisystem persistieren
    schema: {
      type: 'object',
      properties: {
        teamA: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            score: { type: 'number', minimum: 0 }
          }
        },
        teamB: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            score: { type: 'number', minimum: 0 }
          }
        },
        quarter: { type: 'number', minimum: 1, maximum: 4 },
        timeRemaining: { type: 'string' }
      }
    }
  });
  
  /**
   * Participants Replicant (Array)
   */
  const participantsRep = nodecg.Replicant('participants', {
    defaultValue: [],
    persistent: true
  });
  
  /**
   * Settings Replicant
   */
  const settingsRep = nodecg.Replicant('settings', {
    defaultValue: {
      autoSave: true,
      theme: 'dark',
      language: 'de'
    },
    persistent: true
  });
  
  // ==========================================================================
  // REPLICANT CHANGE LISTENERS
  // ==========================================================================
  // Reagiere auf Änderungen von Replicants
  
  /**
   * Scoreboard Änderungen überwachen
   */
  scoreboardRep.on('change', (newValue, oldValue) => {
    // Log nur bei tatsächlicher Änderung
    if (oldValue) {
      logger.info('Scoreboard updated:', {
        teamA: newValue.teamA.score,
        teamB: newValue.teamB.score
      });
      
      // Prüfe auf Spielende
      if (newValue.quarter === 4 && newValue.timeRemaining === '0:00') {
        handleGameEnd(newValue);
      }
    }
  });
  
  /**
   * Participants Änderungen überwachen
   */
  participantsRep.on('change', (newValue) => {
    logger.info(`Participant count: ${newValue.length}`);
    
    // Validiere Participant-Daten
    validateParticipants(newValue);
  });
  
  // ==========================================================================
  // MESSAGE HANDLERS
  // ==========================================================================
  // Messages ermöglichen Kommunikation zwischen Extensions, Panels und Graphics
  
  /**
   * Scoreboard-Update Message Handler
   * Empfängt Updates vom Dashboard
   */
  nodecg.listenFor('updateScore', (data, callback) => {
    try {
      // Validiere Eingabedaten
      if (!data.team || typeof data.score !== 'number') {
        throw new Error('Invalid score update data');
      }
      
      // Update Scoreboard
      const currentScore = scoreboardRep.value;
      
      if (data.team === 'A') {
        currentScore.teamA.score = data.score;
      } else if (data.team === 'B') {
        currentScore.teamB.score = data.score;
      } else {
        throw new Error('Invalid team');
      }
      
      // Replicant aktualisieren
      scoreboardRep.value = currentScore;
      
      logger.info(`Score updated - Team ${data.team}: ${data.score}`);
      
      // Erfolgsantwort
      if (callback && typeof callback === 'function') {
        callback(null, { success: true, newScore: currentScore });
      }
      
      // Benachrichtige andere Systeme
      nodecg.sendMessage('scoreUpdated', currentScore);
      
    } catch (error) {
      logger.error('Error updating score:', error);
      
      // Fehlerantwort
      if (callback && typeof callback === 'function') {
        callback(error);
      }
    }
  });
  
  /**
   * Participant hinzufügen
   */
  nodecg.listenFor('addParticipant', (participant, callback) => {
    try {
      // Validierung
      if (!participant.name || !participant.id) {
        throw new Error('Participant must have name and id');
      }
      
      // Duplikat-Check
      const existingParticipant = participantsRep.value.find(p => p.id === participant.id);
      if (existingParticipant) {
        throw new Error('Participant already exists');
      }
      
      // Hinzufügen
      participantsRep.value = [...participantsRep.value, participant];
      
      logger.info(`Participant added: ${participant.name}`);
      
      if (callback) {
        callback(null, { success: true, participant });
      }
      
    } catch (error) {
      logger.error('Error adding participant:', error);
      if (callback) {
        callback(error);
      }
    }
  });
  
  /**
   * Spielstand zurücksetzen
   */
  nodecg.listenFor('resetScoreboard', (data, callback) => {
    try {
      scoreboardRep.value = {
        teamA: { name: 'Team A', score: 0 },
        teamB: { name: 'Team B', score: 0 },
        quarter: 1,
        timeRemaining: '12:00'
      };
      
      logger.info('Scoreboard reset');
      
      if (callback) {
        callback(null, { success: true });
      }
      
      // Broadcast Reset
      nodecg.sendMessage('scoreboardReset');
      
    } catch (error) {
      logger.error('Error resetting scoreboard:', error);
      if (callback) {
        callback(error);
      }
    }
  });
  
  // ==========================================================================
  // ASSETS INTEGRATION
  // ==========================================================================
  // Arbeite mit hochgeladenen Assets
  
  /**
   * Lade alle Logos
   */
  async function loadLogos() {
    try {
      const logos = nodecg.readAssets('logos');
      
      logger.info(`Loaded ${logos.length} logos`);
      
      // Verarbeite Logos
      for (const logo of logos) {
        logger.debug(`Logo: ${logo.filename} (${logo.size} bytes)`);
      }
      
      return logos;
      
    } catch (error) {
      logger.error('Error loading logos:', error);
      return [];
    }
  }
  
  /**
   * Asset-Change Event
   */
  nodecg.on('assetChange', (change) => {
    logger.info('Asset changed:', {
      category: change.category,
      filename: change.filename,
      action: change.action  // 'add', 'update', 'delete'
    });
    
    // Reagiere auf Asset-Änderungen
    if (change.category === 'logos') {
      // Benachrichtige Graphics über neue Logos
      nodecg.sendMessage('logosUpdated');
    }
  });
  
  // ==========================================================================
  // EXTERNAL API INTEGRATION
  // ==========================================================================
  // Kommunikation mit externen Services
  
  /**
   * Hole Daten von externer API
   */
  async function fetchExternalData() {
    try {
      // Lese API-Konfiguration aus Bundle-Config
      const apiConfig = nodecg.bundleConfig.api;
      
      if (!apiConfig || !apiConfig.enabled) {
        logger.warn('External API disabled in config');
        return null;
      }
      
      // HTTP-Request
      const response = await axios.get(apiConfig.baseUrl + '/endpoint', {
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        timeout: apiConfig.timeout || 30000
      });
      
      logger.info('External data fetched successfully');
      
      return response.data;
      
    } catch (error) {
      logger.error('Error fetching external data:', error);
      
      // Sende Error-Event
      nodecg.sendMessage('apiError', {
        message: error.message,
        timestamp: Date.now()
      });
      
      return null;
    }
  }
  
  /**
   * Periodisches Data-Fetching
   */
  if (nodecg.bundleConfig.api?.enabled) {
    setInterval(async () => {
      const data = await fetchExternalData();
      
      if (data) {
        // Update Replicant mit neuen Daten
        // ... data processing
      }
    }, 60000);  // Alle 60 Sekunden
  }
  
  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================
  
  /**
   * Validiere Participant-Daten
   */
  function validateParticipants(participants) {
    const invalidParticipants = participants.filter(p => {
      return !p.id || !p.name || typeof p.name !== 'string';
    });
    
    if (invalidParticipants.length > 0) {
      logger.warn('Invalid participants detected:', invalidParticipants);
      
      // Entferne ungültige Participants
      participantsRep.value = participants.filter(p => {
        return p.id && p.name && typeof p.name === 'string';
      });
    }
  }
  
  /**
   * Spielende behandeln
   */
  function handleGameEnd(finalScore) {
    logger.info('Game ended:', finalScore);
    
    // Bestimme Gewinner
    const winner = finalScore.teamA.score > finalScore.teamB.score
      ? finalScore.teamA.name
      : finalScore.teamB.name;
    
    // Sende Game-End Event
    nodecg.sendMessage('gameEnded', {
      winner,
      finalScore,
      timestamp: Date.now()
    });
    
    // Speichere Ergebnis
    saveGameResult(finalScore);
  }
  
  /**
   * Speichere Spielergebnis in Datei
   */
  async function saveGameResult(score) {
    try {
      const resultsDir = path.join(__dirname, '../db/results');
      
      // Erstelle Verzeichnis falls nicht vorhanden
      await fs.mkdir(resultsDir, { recursive: true });
      
      const filename = `game_${Date.now()}.json`;
      const filepath = path.join(resultsDir, filename);
      
      await fs.writeFile(
        filepath,
        JSON.stringify(score, null, 2)
      );
      
      logger.info(`Game result saved to ${filename}`);
      
    } catch (error) {
      logger.error('Error saving game result:', error);
    }
  }
  
  // ==========================================================================
  // EXPRESS ROUTES (OPTIONAL)
  // ==========================================================================
  // Custom HTTP-Endpoints für das Bundle
  
  /**
   * Registriere Express-Router
   */
  const router = nodecg.Router();
  
  /**
   * GET /my-awesome-bundle/api/scoreboard
   * Öffentlicher Endpoint für aktuellen Spielstand
   */
  router.get('/api/scoreboard', (req, res) => {
    res.json({
      success: true,
      data: scoreboardRep.value
    });
  });
  
  /**
   * POST /my-awesome-bundle/api/webhook
   * Webhook-Endpoint für externe Systeme
   */
  router.post('/api/webhook', async (req, res) => {
    try {
      logger.info('Webhook received:', req.body);
      
      // Verarbeite Webhook-Daten
      // ...
      
      res.json({ success: true });
      
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Mounte Router
  nodecg.mount(router);
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  /**
   * Extension-Initialisierung
   */
  async function initialize() {
    logger.info('Extension initialized');
    
    // Lade initiale Daten
    await loadLogos();
    
    // Starte periodische Tasks
    startPeriodicTasks();
    
    logger.info('Extension ready');
  }
  
  /**
   * Starte periodische Background-Tasks
   */
  function startPeriodicTasks() {
    // Auto-Save Task
    if (settingsRep.value.autoSave) {
      setInterval(() => {
        logger.debug('Auto-save triggered');
        // Replicants werden automatisch persistiert
      }, 300000);  // Alle 5 Minuten
    }
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  /**
   * Cleanup bei Extension-Unload
   */
  process.on('SIGTERM', () => {
    logger.info('Extension shutting down...');
    
    // Cleanup-Logik hier
    // z.B. Connections schließen, Timer clearen, etc.
    
    process.exit(0);
  });
  
  // ==========================================================================
  // START EXTENSION
  // ==========================================================================
  
  // Starte Initialisierung
  initialize().catch(error => {
    logger.error('Extension initialization failed:', error);
  });
  
  // ==========================================================================
  // EXPORTS (OPTIONAL)
  // ==========================================================================
  // Exportiere Funktionen für Tests oder andere Extensions
  
  return {
    scoreboardRep,
    participantsRep,
    updateScore: (team, score) => {
      nodecg.sendMessage('updateScore', { team, score });
    }
  };
};

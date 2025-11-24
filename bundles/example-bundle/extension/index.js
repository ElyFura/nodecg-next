/**
 * Fortgeschrittenes Example Bundle Extension
 * Demonstriert alle NodeCG Next Features
 */

module.exports = function (nodecg) {
  nodecg.log.info('='.repeat(60));
  nodecg.log.info('Example Bundle Extension v2.0 wird geladen...');
  nodecg.log.info('='.repeat(60));

  // ===== REPLICANTS INITIALISIERUNG =====

  // Lower Third Replicants
  const currentName = nodecg.Replicant('currentName', {
    defaultValue: 'Max Mustermann',
    persistent: true,
  });

  const currentTitle = nodecg.Replicant('currentTitle', {
    defaultValue: 'Software Entwickler',
    persistent: true,
  });

  const lowerThirdVisible = nodecg.Replicant('isVisible', {
    defaultValue: false,
    persistent: false,
  });

  // Scoreboard Replicant mit Schema
  const scoreboard = nodecg.Replicant('scoreboard', {
    defaultValue: {
      teamA: { name: 'Team Alpha', score: 0, logo: '', color: '#667eea' },
      teamB: { name: 'Team Beta', score: 0, logo: '', color: '#764ba2' },
      visible: false,
    },
    persistent: true,
    schemaPath: 'scoreboard.json',
  });

  // Timer Replicant mit Schema
  const timer = nodecg.Replicant('timer', {
    defaultValue: {
      duration: 300,
      remaining: 300,
      running: false,
      visible: false,
      countUp: false,
      label: 'Match Timer',
    },
    persistent: true,
    schemaPath: 'timer.json',
  });

  // Ticker Replicant mit Schema
  const ticker = nodecg.Replicant('ticker', {
    defaultValue: {
      messages: [],
      visible: false,
      speed: 50,
    },
    persistent: true,
    schemaPath: 'ticker.json',
  });

  // Message Log
  const messageLog = nodecg.Replicant('messageLog', {
    defaultValue: [],
    persistent: true,
  });

  // System Stats
  const systemStats = nodecg.Replicant('systemStats', {
    defaultValue: {
      uptime: 0,
      replicantCount: 0,
      messageCount: 0,
      lastUpdate: new Date().toISOString(),
    },
    persistent: false,
  });

  // ===== HILFSFUNKTIONEN =====

  function logMessage(action, details = {}) {
    const log = messageLog.value || [];
    log.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      ...details,
    });

    // Behalte nur die letzten 100 Nachrichten
    if (log.length > 100) {
      log.splice(0, log.length - 100);
    }

    messageLog.value = log;

    // Update system stats
    const stats = systemStats.value || {};
    stats.messageCount = log.length;
    stats.lastUpdate = new Date().toISOString();
    systemStats.value = stats;
  }

  // ===== EVENT LISTENER =====

  // Lower Third Events
  currentName.on('change', (newValue, oldValue) => {
    nodecg.log.info(`Name geändert: "${oldValue}" -> "${newValue}"`);
    logMessage('name_changed', { from: oldValue, to: newValue });
  });

  currentTitle.on('change', (newValue, oldValue) => {
    nodecg.log.info(`Titel geändert: "${oldValue}" -> "${newValue}"`);
    logMessage('title_changed', { from: oldValue, to: newValue });
  });

  lowerThirdVisible.on('change', (newValue) => {
    nodecg.log.info(`Lower Third Sichtbarkeit: ${newValue}`);
    logMessage('lower_third_visibility', { visible: newValue });
  });

  // Scoreboard Events
  scoreboard.on('change', (newValue, oldValue) => {
    if (!oldValue) return;

    if (newValue.teamA.score !== oldValue.teamA.score) {
      nodecg.log.info(
        `${newValue.teamA.name} Score: ${oldValue.teamA.score} -> ${newValue.teamA.score}`
      );
      logMessage('score_changed', {
        team: 'A',
        name: newValue.teamA.name,
        oldScore: oldValue.teamA.score,
        newScore: newValue.teamA.score,
      });
    }

    if (newValue.teamB.score !== oldValue.teamB.score) {
      nodecg.log.info(
        `${newValue.teamB.name} Score: ${oldValue.teamB.score} -> ${newValue.teamB.score}`
      );
      logMessage('score_changed', {
        team: 'B',
        name: newValue.teamB.name,
        oldScore: oldValue.teamB.score,
        newScore: newValue.teamB.score,
      });
    }

    if (newValue.visible !== oldValue.visible) {
      nodecg.log.info(`Scoreboard Sichtbarkeit: ${newValue.visible}`);
      logMessage('scoreboard_visibility', { visible: newValue.visible });
    }
  });

  // Timer Events
  timer.on('change', (newValue, oldValue) => {
    if (!oldValue) return;

    if (newValue.running !== oldValue.running) {
      nodecg.log.info(`Timer ${newValue.running ? 'gestartet' : 'gestoppt'}`);
      logMessage('timer_state', { running: newValue.running, remaining: newValue.remaining });
    }
  });

  // Ticker Events
  ticker.on('change', (newValue, oldValue) => {
    if (!oldValue) return;

    if (newValue.messages.length !== oldValue.messages.length) {
      nodecg.log.info(
        `Ticker Messages: ${oldValue.messages.length} -> ${newValue.messages.length}`
      );
      logMessage('ticker_messages_changed', { count: newValue.messages.length });
    }
  });

  // ===== TIMER LOGIC =====

  let timerInterval = null;

  function startTimer() {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
      const currentTimer = timer.value;
      if (!currentTimer.running) {
        stopTimer();
        return;
      }

      if (currentTimer.countUp) {
        // Count up
        timer.value = {
          ...currentTimer,
          remaining: currentTimer.remaining + 1,
        };
      } else {
        // Count down
        if (currentTimer.remaining > 0) {
          timer.value = {
            ...currentTimer,
            remaining: currentTimer.remaining - 1,
          };
        } else {
          // Timer abgelaufen
          stopTimer();
          nodecg.log.info('Timer abgelaufen!');
          logMessage('timer_finished');

          // Optionaler Sound/Event
          nodecg.sendMessage('timer:finished');
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Timer State Changes überwachen
  timer.on('change', (newValue, oldValue) => {
    if (!oldValue) return;

    if (newValue.running && !oldValue.running) {
      startTimer();
    } else if (!newValue.running && oldValue.running) {
      stopTimer();
    }
  });

  // ===== MESSAGE HANDLERS =====

  // Scoreboard Messages
  nodecg.listenFor('scoreboard:incrementTeamA', () => {
    const current = scoreboard.value;
    scoreboard.value = {
      ...current,
      teamA: { ...current.teamA, score: current.teamA.score + 1 },
    };
  });

  nodecg.listenFor('scoreboard:incrementTeamB', () => {
    const current = scoreboard.value;
    scoreboard.value = {
      ...current,
      teamB: { ...current.teamB, score: current.teamB.score + 1 },
    };
  });

  nodecg.listenFor('scoreboard:decrementTeamA', () => {
    const current = scoreboard.value;
    if (current.teamA.score > 0) {
      scoreboard.value = {
        ...current,
        teamA: { ...current.teamA, score: current.teamA.score - 1 },
      };
    }
  });

  nodecg.listenFor('scoreboard:decrementTeamB', () => {
    const current = scoreboard.value;
    if (current.teamB.score > 0) {
      scoreboard.value = {
        ...current,
        teamB: { ...current.teamB, score: current.teamB.score - 1 },
      };
    }
  });

  nodecg.listenFor('scoreboard:reset', () => {
    const current = scoreboard.value;
    scoreboard.value = {
      ...current,
      teamA: { ...current.teamA, score: 0 },
      teamB: { ...current.teamB, score: 0 },
    };
    logMessage('scoreboard_reset');
  });

  // Timer Messages
  nodecg.listenFor('timer:start', () => {
    timer.value = { ...timer.value, running: true };
  });

  nodecg.listenFor('timer:stop', () => {
    timer.value = { ...timer.value, running: false };
  });

  nodecg.listenFor('timer:reset', () => {
    const current = timer.value;
    timer.value = {
      ...current,
      remaining: current.duration,
      running: false,
    };
  });

  // Ticker Messages
  nodecg.listenFor('ticker:addMessage', (data) => {
    const current = ticker.value;
    const newMessage = {
      id: `ticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: data.text || '',
      priority: data.priority || 'normal',
      timestamp: new Date().toISOString(),
    };

    current.messages.push(newMessage);

    // Nach Priorität sortieren
    current.messages.sort((a, b) => {
      const priorities = { urgent: 4, high: 3, normal: 2, low: 1 };
      return (priorities[b.priority] || 2) - (priorities[a.priority] || 2);
    });

    ticker.value = current;
  });

  nodecg.listenFor('ticker:removeMessage', (messageId) => {
    const current = ticker.value;
    current.messages = current.messages.filter((msg) => msg.id !== messageId);
    ticker.value = current;
  });

  nodecg.listenFor('ticker:clearMessages', () => {
    ticker.value = { ...ticker.value, messages: [] };
    logMessage('ticker_cleared');
  });

  // ===== AUTOMATISCHE UPDATES =====

  // System Stats alle 5 Sekunden aktualisieren
  setInterval(() => {
    const stats = systemStats.value || {};
    stats.uptime = process.uptime();
    stats.replicantCount = 8; // Anzahl der Replicants
    stats.lastUpdate = new Date().toISOString();
    systemStats.value = stats;
  }, 5000);

  // Beispiel: Automatischer Titel-Update basierend auf Tageszeit
  setInterval(() => {
    const hour = new Date().getHours();
    let timeOfDay;

    if (hour < 6) timeOfDay = 'Nacht';
    else if (hour < 12) timeOfDay = 'Morgen';
    else if (hour < 18) timeOfDay = 'Nachmittag';
    else if (hour < 22) timeOfDay = 'Abend';
    else timeOfDay = 'Nacht';

    // Nur updaten wenn sich geändert hat
    const titleParts = currentTitle.value.split(' - ');
    const baseTitle = titleParts[0];
    const newTitle = `${baseTitle} - ${timeOfDay}`;

    if (currentTitle.value !== newTitle) {
      // Kommentar: Normalerweise würde man das nicht automatisch machen
      // Das ist nur ein Beispiel für automatische Updates
      // currentTitle.value = newTitle;
    }
  }, 60000); // Check every minute

  // ===== CLEANUP =====

  // Cleanup bei Bundle Unload
  nodecg.on('bundleUnload', () => {
    nodecg.log.info('Example Bundle wird entladen...');
    stopTimer();
    logMessage('bundle_unloaded');
  });

  // ===== INITIALISIERUNG ABGESCHLOSSEN =====

  nodecg.log.info('='.repeat(60));
  nodecg.log.info('Example Bundle Extension erfolgreich geladen!');
  nodecg.log.info('Verfügbare Replicants:');
  nodecg.log.info('  - currentName, currentTitle, isVisible (Lower Third)');
  nodecg.log.info('  - scoreboard (Team Scores mit Schema)');
  nodecg.log.info('  - timer (Match Timer mit Schema)');
  nodecg.log.info('  - ticker (News Ticker mit Schema)');
  nodecg.log.info('  - messageLog (Event Log)');
  nodecg.log.info('  - systemStats (System Statistiken)');
  nodecg.log.info('');
  nodecg.log.info('Verfügbare Messages:');
  nodecg.log.info('  - scoreboard:incrementTeamA/B, decrementTeamA/B, reset');
  nodecg.log.info('  - timer:start, stop, reset');
  nodecg.log.info('  - ticker:addMessage, removeMessage, clearMessages');
  nodecg.log.info('='.repeat(60));

  // Initial Log Entry
  logMessage('bundle_loaded', {
    version: '2.0.0',
    features: ['replicants', 'schemas', 'messages', 'timer', 'scoreboard', 'ticker'],
  });
};

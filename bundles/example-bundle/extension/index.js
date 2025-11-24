/**
 * Example Bundle Extension
 * Demonstrates NodeCG Next extension capabilities
 */

module.exports = function (nodecg) {
  nodecg.log.info('Example bundle extension loaded!');

  // Create replicants for shared state
  const currentName = nodecg.Replicant('currentName', {
    defaultValue: 'John Doe',
    persistent: true,
  });

  const currentTitle = nodecg.Replicant('currentTitle', {
    defaultValue: 'Software Engineer',
    persistent: true,
  });

  const isVisible = nodecg.Replicant('isVisible', {
    defaultValue: false,
    persistent: false,
  });

  const messageLog = nodecg.Replicant('messageLog', {
    defaultValue: [],
    persistent: true,
  });

  // Listen for replicant changes
  currentName.on('change', (newValue, oldValue) => {
    nodecg.log.info(`Name changed from "${oldValue}" to "${newValue}"`);

    // Add to message log
    const log = messageLog.value || [];
    log.push({
      timestamp: new Date().toISOString(),
      action: 'name_changed',
      from: oldValue,
      to: newValue,
    });

    // Keep only last 50 messages
    if (log.length > 50) {
      log.shift();
    }

    messageLog.value = log;
  });

  isVisible.on('change', (newValue) => {
    nodecg.log.info(`Visibility changed to: ${newValue}`);
  });

  // Example: Update title based on time of day
  setInterval(() => {
    const hour = new Date().getHours();
    let timeOfDay;

    if (hour < 12) {
      timeOfDay = 'Morning';
    } else if (hour < 18) {
      timeOfDay = 'Afternoon';
    } else {
      timeOfDay = 'Evening';
    }

    // Only update if changed
    const newTitle = `${currentTitle.value.split(' - ')[0]} - ${timeOfDay}`;
    if (currentTitle.value !== newTitle) {
      currentTitle.value = newTitle;
    }
  }, 60000); // Check every minute

  // Example API endpoint (when Fastify routes are registered)
  nodecg.log.info('Example bundle ready!');
  nodecg.log.info('Replicants: currentName, currentTitle, isVisible, messageLog');
};

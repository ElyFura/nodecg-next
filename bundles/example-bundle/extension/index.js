/**
 * Simple Example Bundle Extension
 * Tests all NodeCG Next functionality
 */

module.exports = function (nodecg) {
  console.log('='.repeat(80));
  console.log('🚀 EXAMPLE BUNDLE EXTENSION LOADED!');
  console.log('='.repeat(80));

  nodecg.log.info('Example bundle extension starting...');
  nodecg.log.info(`Bundle name: ${nodecg.bundleName}`);

  // Create a simple counter replicant
  const counter = nodecg.Replicant('counter', {
    defaultValue: 0,
    persistent: true,
  });

  nodecg.log.info('Counter replicant created');

  // Listen for counter changes
  counter.on('change', (newValue, oldValue) => {
    nodecg.log.info(`Counter changed: ${oldValue} -> ${newValue}`);
  });

  // Listen for increment message from dashboard
  nodecg.listenFor('increment', () => {
    nodecg.log.info('📨 Received INCREMENT message from dashboard');
    counter.value = (counter.value || 0) + 1;
    nodecg.log.info(`Counter incremented to: ${counter.value}`);
  });

  // Listen for decrement message
  nodecg.listenFor('decrement', () => {
    nodecg.log.info('📨 Received DECREMENT message from dashboard');
    if (counter.value > 0) {
      counter.value = counter.value - 1;
      nodecg.log.info(`Counter decremented to: ${counter.value}`);
    }
  });

  // Listen for reset message
  nodecg.listenFor('reset', () => {
    nodecg.log.info('📨 Received RESET message from dashboard');
    counter.value = 0;
    nodecg.log.info('Counter reset to 0');
  });

  // Test sending a message to dashboard
  setTimeout(() => {
    nodecg.sendMessage('extensionReady', { message: 'Extension is ready!' });
    nodecg.log.info('📤 Sent extensionReady message to dashboard');
  }, 1000);

  // Handle bundle unload
  nodecg.on('bundleUnload', () => {
    nodecg.log.info('Example bundle unloading...');
  });

  console.log('='.repeat(80));
  console.log('✅ EXAMPLE BUNDLE EXTENSION INITIALIZED SUCCESSFULLY!');
  console.log('='.repeat(80));

  nodecg.log.info('Extension initialized successfully');
  nodecg.log.info('Listening for messages: increment, decrement, reset');
};

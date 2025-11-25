/**
 * NodeCG Client for Bundle Graphics and Dashboard
 * Provides Replicant and Message API
 */

/* global io, window, console */

(function () {
  'use strict';

  // Replicant Class
  class Replicant {
    constructor(name, namespace, options = {}) {
      this.name = name;
      this.namespace = namespace;
      this.defaultValue = options.defaultValue;
      this._value = this.defaultValue;
      this.listeners = new Set();
      this.socket = io('/replicants', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      this.setupSocket();
      this.subscribe();
    }

    setupSocket() {
      this.socket.on('initial', (data) => {
        if (data.namespace === this.namespace && data.name === this.name) {
          const newValue = data.value ?? this.defaultValue;
          const oldValue = this._value;
          this._value = newValue;
          this.notifyListeners(newValue, oldValue);
        }
      });

      this.socket.on('change', (data) => {
        if (data.namespace === this.namespace && data.name === this.name) {
          const oldValue = this._value;
          this._value = data.value ?? this.defaultValue;
          this.notifyListeners(this._value, oldValue);
        }
      });

      this.socket.on('connect', () => {
        this.subscribe();
      });
    }

    subscribe() {
      this.socket.emit('subscribe', {
        namespace: this.namespace,
        name: this.name,
      });
    }

    get value() {
      return this._value ?? this.defaultValue;
    }

    set value(newValue) {
      const oldValue = this._value;
      this._value = newValue;

      this.socket.emit('set', {
        namespace: this.namespace,
        name: this.name,
        value: newValue,
      });

      this.notifyListeners(newValue, oldValue);
    }

    on(callback) {
      this.listeners.add(callback);
      // Immediately call with current value
      if (this._value !== undefined) {
        callback(this._value, undefined);
      }
    }

    notifyListeners(newValue, oldValue) {
      for (const listener of this.listeners) {
        try {
          listener(newValue, oldValue);
        } catch (error) {
          console.error('[NodeCG] Error in replicant listener:', error);
        }
      }
    }
  }

  // NodeCG API Object
  window.nodecg = {
    bundleName: 'example-bundle',

    Replicant: function (name, options = {}) {
      console.log(`[NodeCG] Replicant ${name}:change`);
      return new Replicant(name, window.nodecg.bundleName, options);
    },

    sendMessage: function (messageName, data) {
      console.log(`[NodeCG] sendMessage: ${messageName}`, data);
      const socket = io('/messages', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        socket.emit('message', {
          bundleName: window.nodecg.bundleName,
          messageName: messageName,
          data: data,
        });
      });

      return Promise.resolve();
    },

    listenFor: function (messageName, callback) {
      const socket = io('/messages', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });

      socket.on('message', (data) => {
        if (data.bundleName === window.nodecg.bundleName && data.messageName === messageName) {
          callback(data.data);
        }
      });
    },
  };

  console.log('[NodeCG] Client initialized for bundle:', window.nodecg.bundleName);
})();

/**
 * System Breach Preloader (adapted)
 * Source: https://github.com/ItsWanheda/SystemBreach-Preloader (MIT)
 */
(function () {
  "use strict";

  const CONFIG = {
    duration: 5600,
    updateInterval: 80,
    skipDelay: 1800,
    decodeDuration: 800,
    fadeOutDuration: 450,
    cursorStyle: "glow",
  };

  const MESSAGES = [
    { text: "INITIALIZING KERNEL...", percent: 0 },
    { text: "LOADING MODULES: [REACT, THREE, FLUID]", percent: 18 },
    { text: "MOUNTING STARFIELD...", percent: 36 },
    { text: "LINKING SNAKE GRID...", percent: 54 },
    { text: "HYDRATING PORTFOLIO...", percent: 72 },
    { text: "ACCESS GRANTED.", percent: 100 },
  ];

  class PreloaderCallbacks {
    constructor() {
      this.callbacks = {
        onProgress: [],
        onMilestone: [],
        onComplete: [],
        onSkip: [],
        onStart: [],
        onError: [],
      };
      this.triggeredMilestones = new Set();
    }

    on(event, callback) {
      if (!this.callbacks[event]) return () => {};
      this.callbacks[event].push(callback);
      return () => {
        const index = this.callbacks[event].indexOf(callback);
        if (index > -1) this.callbacks[event].splice(index, 1);
      };
    }

    trigger(event, data) {
      if (!this.callbacks[event]) return;
      this.callbacks[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }

    triggerMilestone(milestone, data) {
      if (this.triggeredMilestones.has(milestone)) return;
      this.triggeredMilestones.add(milestone);
      this.trigger("onMilestone", { milestone, ...data });
    }

    clearAll() {
      Object.keys(this.callbacks).forEach((key) => {
        this.callbacks[key] = [];
      });
      this.triggeredMilestones.clear();
    }
  }

  class SystemBreachPreloader {
    constructor(options = {}) {
      this.config = { ...CONFIG, ...options };
      this.callbacks = new PreloaderCallbacks();
      this.progress = 0;
      this.currentMessageIndex = 0;
      this.isComplete = false;
      this.isSkipped = false;
      this.startTime = null;
      this.timers = {};
      this.boundHandlers = {};
      this.eventCleanups = [];
    }

    init() {
      this.elements = this.getElements();
      if (!this.validateElements()) return this;
      this.setCursorStyle(this.config.cursorStyle);
      this.bindEvents();
      this.callbacks.trigger("onStart", { timestamp: Date.now() });
      this.startLoading();
      return this;
    }

    getElements() {
      return {
        preloader: document.getElementById("preloader"),
        progressBar: document.getElementById("progress-bar"),
        percentText: document.getElementById("percent-text"),
        hexCode: document.getElementById("hex-code"),
        typingText: document.getElementById("typing-text"),
        statusText: document.getElementById("status-text"),
        threatLevel: document.getElementById("threat-level"),
        skipContainer: document.getElementById("skip-container"),
        skipBtn: document.getElementById("skip-btn"),
        mainContent: document.getElementById("main-content"),
        glitchTitle: document.getElementById("glitch-title"),
      };
    }

    validateElements() {
      const required = [
        "preloader",
        "progressBar",
        "percentText",
        "hexCode",
        "typingText",
        "statusText",
        "threatLevel",
        "skipContainer",
        "skipBtn",
        "mainContent",
        "glitchTitle",
      ];
      const missing = required.filter((el) => !this.elements[el]);
      if (missing.length > 0) {
        console.error("[Preloader] Missing elements:", missing);
        return false;
      }
      return true;
    }

    setCursorStyle(style) {
      const cursor = document.querySelector(".cursor");
      if (!cursor) return;
      cursor.className = "cursor";
      cursor.classList.add(`cursor--${style}`);
      cursor.setAttribute("data-style", style);
    }

    bindEvents() {
      const { skipBtn } = this.elements;
      this.boundHandlers = {
        skipClick: (e) => this.skip(e),
        keydown: (e) => {
          if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
            e.preventDefault();
            this.skip(e);
          }
        },
      };
      skipBtn.addEventListener("click", this.boundHandlers.skipClick);
      this.eventCleanups.push(() =>
        skipBtn.removeEventListener("click", this.boundHandlers.skipClick)
      );
      document.addEventListener("keydown", this.boundHandlers.keydown);
      this.eventCleanups.push(() =>
        document.removeEventListener("keydown", this.boundHandlers.keydown)
      );
    }

    startLoading() {
      this.startTime = Date.now();
      this.timers.skip = setTimeout(() => {
        if (!this.isComplete) {
          this.elements.skipContainer.classList.add("visible");
        }
      }, this.config.skipDelay);

      this.timers.timeout = setTimeout(() => {
        if (!this.isComplete) {
          this.setProgress(100);
          this.finish(true);
        }
      }, this.config.duration);

      this.updateProgress();
    }

    updateProgress() {
      if (this.isComplete) return;
      const elapsed = Date.now() - this.startTime;
      const targetProgress = Math.min((elapsed / this.config.duration) * 100, 100);
      if (targetProgress > this.progress) {
        this.progress = Math.min(this.progress + 1.4, targetProgress);
      }
      const currentPercent = Math.floor(this.progress);
      this.updateUI(currentPercent);
      this.checkMilestones(currentPercent);
      this.callbacks.trigger("onProgress", {
        progress: currentPercent,
        rawProgress: this.progress,
      });
      if (this.progress >= 100) {
        this.finish();
      } else {
        this.timers.main = setTimeout(
          () => this.updateProgress(),
          this.config.updateInterval
        );
      }
    }

    updateUI(percent) {
      const { progressBar, percentText, hexCode } = this.elements;
      progressBar.style.width = `${percent}%`;
      percentText.textContent = `${percent}%`;
      hexCode.textContent = this.getRandomHex();
      this.updateThreatLevel(percent);
    }

    checkMilestones(percent) {
      for (const message of MESSAGES) {
        if (percent >= message.percent) {
          const messageIndex = MESSAGES.indexOf(message);
          if (messageIndex > this.currentMessageIndex) {
            this.currentMessageIndex = messageIndex;
            this.updateMessage(message);
            this.callbacks.triggerMilestone(message.percent, {
              message: message.text,
              index: messageIndex,
            });
          }
        }
      }
    }

    updateMessage(message) {
      const { typingText, statusText } = this.elements;
      typingText.textContent = message.text;
      const statusName = message.text.replace(/\.$/, "").split(" ")[0] || "LOADING";
      statusText.textContent = statusName;
    }

    updateThreatLevel(percent) {
      const { threatLevel } = this.elements;
      if (percent < 30) {
        threatLevel.textContent = "LOW";
        threatLevel.className = "threat-value";
      } else if (percent < 70) {
        threatLevel.textContent = "MODERATE";
        threatLevel.className = "threat-value";
      } else if (percent < 100) {
        threatLevel.textContent = "HIGH";
        threatLevel.className = "threat-value";
      } else {
        threatLevel.textContent = "CRITICAL";
        threatLevel.className = "threat-value critical";
      }
    }

    setProgress(percent) {
      this.progress = percent;
      this.updateUI(Math.floor(percent));
      this.checkMilestones(Math.floor(percent));
    }

    notifyParent() {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "boot-done" }, "*");
        }
      } catch (_) {
        /* ignore */
      }
    }

    finish(forced = false) {
      if (this.isComplete) return;
      this.isComplete = true;
      this.cleanupTimers();

      const { statusText, threatLevel, typingText } = this.elements;
      statusText.textContent = "READY";
      typingText.textContent = "ACCESS GRANTED.";
      threatLevel.textContent = "CRITICAL";
      threatLevel.className = "threat-value critical";

      this.decodeTitle(() => {
        this.fadeOut(() => {
          this.callbacks.trigger("onComplete", { forced, finalProgress: 100 });
          this.notifyParent();
          this.destroy();
        });
      });
    }

    skip(event) {
      if (event) event.preventDefault();
      if (this.isComplete) return;
      this.isSkipped = true;
      this.setProgress(100);
      this.callbacks.trigger("onSkip", { progress: this.progress });
      this.finish(false);
    }

    decodeTitle(callback) {
      const { glitchTitle } = this.elements;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
      const finalText = "SYSTEM_READY";
      let iterations = 0;
      const totalIterations = finalText.length * 3;

      const interval = setInterval(() => {
        if (iterations >= totalIterations) {
          clearInterval(interval);
          glitchTitle.textContent = finalText;
          glitchTitle.setAttribute("data-text", finalText);
          if (callback) callback();
          return;
        }
        glitchTitle.textContent = finalText
          .split("")
          .map((letter, index) => {
            if (index < iterations / 3) return finalText[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
        iterations += 1;
      }, 28);
    }

    fadeOut(callback) {
      const { preloader } = this.elements;
      preloader.style.opacity = "0";
      preloader.style.pointerEvents = "none";
      setTimeout(() => {
        if (callback) callback();
      }, this.config.fadeOutDuration);
    }

    cleanupTimers() {
      Object.values(this.timers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      this.timers = {};
    }

    cleanupEventListeners() {
      this.eventCleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (_) {
          /* ignore */
        }
      });
      this.eventCleanups = [];
    }

    destroy() {
      this.cleanupTimers();
      this.cleanupEventListeners();
      this.callbacks.clearAll();
      if (window.preloader === this) {
        delete window.preloader;
      }
    }

    getRandomHex() {
      return (
        "0x" +
        Math.floor(Math.random() * 65535)
          .toString(16)
          .toUpperCase()
          .padStart(4, "0")
      );
    }

    on(event, callback) {
      return this.callbacks.on(event, callback);
    }
  }

  if (window.preloader) {
    try {
      window.preloader.destroy();
    } catch (_) {
      /* ignore */
    }
  }
  window.preloader = new SystemBreachPreloader().init();
})();

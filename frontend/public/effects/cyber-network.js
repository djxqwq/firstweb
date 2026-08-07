/**
 * Adapted from a-vip/interactive-cyber-canvas (vanilla neural network canvas).
 * Source: https://github.com/a-vip/interactive-cyber-canvas
 * Mounts into a container canvas; transparent bg; start/stop for React sections.
 */
(function (global) {
  "use strict";

  function createCyberNetwork(canvas, options) {
    options = options || {};
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if (!canvas || reduced) return { start: function () {}, stop: function () {}, destroy: function () {} };

    const ctx = canvas.getContext("2d", { alpha: true });
    let W = 0;
    let H = 0;
    let pts = [];
    let raf = 0;
    let running = false;
    const mouse = { x: -1000, y: -1000 };
    const host = options.host || canvas.parentElement || canvas;

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    function onLeave() {
      mouse.x = -1000;
      mouse.y = -1000;
    }

    function resize() {
      const r = (options.host || canvas.parentElement || canvas).getBoundingClientRect();
      W = Math.max(1, Math.floor(r.width));
      H = Math.max(1, Math.floor(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function Pt() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.r = Math.random() * 1.5 + 0.5;
    }

    Pt.prototype.step = function () {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 160) {
        const force = (160 - dist) / 160;
        this.x -= (dx / dist) * force * 1.8;
        this.y -= (dy / dist) * force * 1.8;
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    };

    Pt.prototype.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56,189,248,0.75)";
      ctx.fill();
    };

    function drawLines() {
      const D = 130;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < D) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = "rgba(56,189,248," + (1 - d / D) * 0.22 + ")";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
        const dMouseX = pts[i].x - mouse.x;
        const dMouseY = pts[i].y - mouse.y;
        const dMouse = Math.sqrt(dMouseX * dMouseX + dMouseY * dMouseY);
        if (dMouse < 180) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = "rgba(168,85,247," + (1 - dMouse / 180) * 0.35 + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        pts[i].step();
        pts[i].draw();
      }
      drawLines();
      raf = requestAnimationFrame(loop);
    }

    function rebuild() {
      resize();
      pts = [];
      let n = Math.floor((W * H) / 14000);
      if (n > 55) n = 55;
      if (n < 18) n = 18;
      for (let i = 0; i < n; i++) pts.push(new Pt());
    }

    let rt;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        cancelAnimationFrame(raf);
        rebuild();
        if (running) loop();
      }, 160);
    }

    host.addEventListener("mousemove", onMove, { passive: true });
    host.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);

    return {
      start: function () {
        if (running) return;
        running = true;
        rebuild();
        loop();
      },
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, W, H);
      },
      destroy: function () {
        this.stop();
        host.removeEventListener("mousemove", onMove);
        host.removeEventListener("mouseleave", onLeave);
        window.removeEventListener("resize", onResize);
      },
    };
  }

  global.createCyberNetwork = createCyberNetwork;
})(typeof window !== "undefined" ? window : globalThis);

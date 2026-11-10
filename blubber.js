/* Blubberblasen-Übergang wie bei SpongeBob:
   Die Seite ist zuerst unter "Wasser" versteckt. Dann steigt eine dichte
   Wand aus Blasen von unten nach oben und gibt dahinter die Seite frei. */
(function () {
  // Wer Animationen im System ausgeschaltet hat, bekommt keinen Übergang
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DAUER = 1900;          // Millisekunden, bis die Blasenwand oben ist
  var WASSER_OBEN = '#2bb3e6';
  var WASSER_UNTEN = '#0a6fb8';

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;' +
    'pointer-events:none;background:linear-gradient(' + WASSER_OBEN + ',' + WASSER_UNTEN + ');';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W, H;

  function groesseSetzen() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  groesseSetzen();
  window.addEventListener('resize', groesseSetzen);

  // Eine Blase einmal vorzeichnen, danach nur noch skaliert kopieren (schnell)
  var blasenBild = (function () {
    var g = 160, c = document.createElement('canvas');
    c.width = c.height = g;
    var b = c.getContext('2d'), m = g / 2, r = g / 2 - 6;

    var fuellung = b.createRadialGradient(m - r * 0.3, m - r * 0.35, r * 0.1, m, m, r);
    fuellung.addColorStop(0, 'rgba(225, 248, 255, 0.55)');
    fuellung.addColorStop(0.7, 'rgba(140, 215, 250, 0.40)');
    fuellung.addColorStop(1, 'rgba(60, 160, 225, 0.65)');
    b.beginPath();
    b.arc(m, m, r, 0, Math.PI * 2);
    b.fillStyle = fuellung;
    b.fill();
    b.lineWidth = 5;
    b.strokeStyle = 'rgba(235, 250, 255, 0.9)';
    b.stroke();

    // Glanzlicht oben links (Bogen + kleiner Punkt)
    b.lineCap = 'round';
    b.lineWidth = 9;
    b.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    b.beginPath();
    b.arc(m, m, r * 0.68, Math.PI * 1.08, Math.PI * 1.42);
    b.stroke();
    b.fillStyle = 'rgba(255, 255, 255, 0.95)';
    b.beginPath();
    b.arc(m + r * 0.42, m + r * 0.48, r * 0.09, 0, Math.PI * 2);
    b.fill();
    return c;
  })();

  // Blasenwand aufbauen: in der Mitte der Wand am dichtesten
  var wandHoehe = H * 0.85;
  var basis = Math.max(W, H);
  var anzahl = Math.round(Math.min(420, Math.max(110, (W * wandHoehe) / 5200)));
  var blasen = [];
  for (var i = 0; i < anzahl; i++) {
    var gross = Math.random() < 0.22;
    var r = gross ? basis * (0.035 + Math.random() * 0.04) : basis * (0.008 + Math.random() * 0.022);
    blasen.push({
      x: Math.random(),                                        // Anteil der Breite
      versatz: (Math.random() + Math.random()) / 2 * wandHoehe, // Abstand unter dem Bildrand
      r: r,
      tempo: 0.92 + Math.random() * 0.2,
      wackelWeite: 4 + Math.random() * 14,
      wackelTempo: 3 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2
    });
  }
  // Kleine zuerst zeichnen, grosse liegen oben
  blasen.sort(function (a, b) { return a.r - b.r; });

  var maxR = basis * 0.075;
  var verlauf = 110; // weicher Rand des Wassers in Pixeln
  var start = null;

  function bild(jetzt) {
    if (start === null) {
      start = jetzt;
      canvas.style.background = 'none'; // ab jetzt malt das Canvas das Wasser selbst
    }
    var t = (jetzt - start) / 1000;
    var v = (H + wandHoehe + maxR * 2) / (DAUER / 1000); // Pixel pro Sekunde

    ctx.clearRect(0, 0, W, H);

    // Wasser: alles oberhalb der Wandmitte ist noch verdeckt
    var kante = H + wandHoehe * 0.5 - v * t;
    if (kante + verlauf > 0) {
      var wasser = ctx.createLinearGradient(0, 0, 0, H);
      wasser.addColorStop(0, WASSER_OBEN);
      wasser.addColorStop(1, WASSER_UNTEN);
      ctx.fillStyle = wasser;
      ctx.fillRect(0, 0, W, Math.min(H, kante + verlauf));
      // Unteren Rand weich ausblenden
      if (kante - verlauf < H) {
        var weg = ctx.createLinearGradient(0, kante - verlauf, 0, kante + verlauf);
        weg.addColorStop(0, 'rgba(0,0,0,0)');
        weg.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = weg;
        ctx.fillRect(0, kante - verlauf, W, verlauf * 2 + 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Blasen
    var nochSichtbar = false;
    for (var i = 0; i < blasen.length; i++) {
      var b = blasen[i];
      var y = H + b.r + b.versatz - v * b.tempo * t;
      if (y < -b.r) continue;
      nochSichtbar = true;
      if (y > H + b.r) continue;
      var x = b.x * W + Math.sin(t * b.wackelTempo + b.phase) * b.wackelWeite;
      ctx.drawImage(blasenBild, x - b.r, y - b.r, b.r * 2, b.r * 2);
    }

    if (nochSichtbar || kante + verlauf > 0) {
      requestAnimationFrame(bild);
    } else {
      window.removeEventListener('resize', groesseSetzen);
      canvas.remove();
    }
  }
  requestAnimationFrame(bild);
})();

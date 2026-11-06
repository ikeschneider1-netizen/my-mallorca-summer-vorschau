// Bewerbungsformular: Prüfung im Browser mit den Texten aus content/ (7.4).
// Ohne JS prüft der Browser selbst (required, type=email). Versand folgt später über Ikes Server:
// Diese Testversion verschickt nichts und springt nach erfolgreicher Prüfung zur Danke-Seite.
(function () {
  'use strict';
  var form = document.querySelector('form.bewerbung');
  if (!form) return;
  form.noValidate = true;

  var TEXT = {
    leer: 'Hier fehlt noch was.',
    mail: 'Diese E-Mail-Adresse sieht nicht ganz richtig aus.',
    tel: 'Bitte gib deine Nummer mit Ländervorwahl an, z. B. +49 170 1234567.',
    alter: 'Schade, du musst mindestens 18 sein. Melde dich gern, sobald es so weit ist!',
    gross: 'Die Datei ist zu groß. Maximal 10 MB, ein Handyfoto passt meistens.',
    typ: 'Dieses Format können wir nicht öffnen. Bitte JPG, PNG oder PDF.',
    typFoto: 'Dieses Format können wir nicht öffnen. Bitte ein Foto als JPG, PNG oder HEIC.',
    datenschutz: 'Bitte bestätige noch kurz den Datenschutz-Hinweis.'
  };
  var sammel = form.querySelector('.fehler-sammel');
  var beruehrt = {};

  function behaelter(feld) { return feld.closest('.feld, .wahl'); }
  function meldungFuer(feld) {
    var b = behaelter(feld);
    return b && b.querySelector('.fehler:not(.fehler-sammel)');
  }

  function pruefe(feld) {
    var wert = (feld.value || '').trim();
    if (feld.type === 'checkbox') return feld.required && !feld.checked ? TEXT.datenschutz : '';
    if (feld.type === 'radio') {
      var gruppe = form.querySelectorAll('input[name="' + feld.name + '"]');
      var gewaehlt = Array.prototype.some.call(gruppe, function (r) { return r.checked; });
      return gruppe[0].required && !gewaehlt ? TEXT.leer : '';
    }
    if (feld.type === 'file') {
      var datei = feld.files && feld.files[0];
      if (!datei) return feld.required ? TEXT.leer : '';
      var max = Number(feld.dataset.maxMb || 10) * 1024 * 1024;
      if (datei.size > max) return TEXT.gross;
      var erlaubt = (feld.getAttribute('accept') || '').split(',').map(function (a) { return a.trim().toLowerCase(); });
      var endung = '.' + datei.name.split('.').pop().toLowerCase();
      var ok = erlaubt.some(function (a) { return a === datei.type.toLowerCase() || a === endung || (a === '.heic' && endung === '.heif'); });
      return ok ? '' : (feld.id === 'foto' ? TEXT.typFoto : TEXT.typ);
    }
    if (feld.required && !wert) return TEXT.leer;
    if (!wert) return '';
    if (feld.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(wert)) return TEXT.mail;
    if (feld.type === 'tel' && !/^\+\d[\d\s/-]{6,}\d$/.test(wert)) return TEXT.tel;
    if (feld.type === 'date') {
      var d = new Date(wert + 'T00:00:00');
      if (isNaN(d)) return TEXT.leer;
      var heute = new Date();
      var achtzehn = new Date(d.getFullYear() + 18, d.getMonth(), d.getDate());
      if (achtzehn > heute) return TEXT.alter;
    }
    return '';
  }

  function zeige(feld, text) {
    var b = behaelter(feld);
    var p = meldungFuer(feld);
    if (!b || !p) return;
    b.classList.toggle('ist-fehler', !!text);
    p.textContent = text;
    p.hidden = !text;
    var ziele = feld.type === 'radio' ? form.querySelectorAll('input[name="' + feld.name + '"]') : [feld];
    Array.prototype.forEach.call(ziele, function (z) {
      if (text) z.setAttribute('aria-invalid', 'true'); else z.removeAttribute('aria-invalid');
    });
  }

  function felder() {
    var gesehen = {};
    return Array.prototype.filter.call(form.elements, function (f) {
      if (!f.name || f.type === 'submit') return false;
      if (f.type === 'radio') { if (gesehen[f.name]) return false; gesehen[f.name] = true; }
      return true;
    });
  }

  form.addEventListener('focusout', function (e) {
    var f = e.target;
    if (!f.name) return;
    // Radio-Gruppe erst prüfen, wenn der Fokus die Gruppe verlässt
    if (f.type === 'radio' && e.relatedTarget && e.relatedTarget.name === f.name) return;
    beruehrt[f.name] = true;
    zeige(f, pruefe(f));
  });
  form.addEventListener('input', function (e) {
    var f = e.target;
    if (beruehrt[f.name] || behaelter(f) && behaelter(f).classList.contains('ist-fehler')) zeige(f, pruefe(f));
  });
  form.addEventListener('change', function (e) {
    var f = e.target;
    if (f.type === 'file' || f.type === 'checkbox' || f.type === 'radio') zeige(f, pruefe(f));
    if (f.id === 'foto') fotoZeigen();
  });

  // Foto-Upload (Ike, 06.11.2026): Polaroid-Vorschau, „Anderes Foto“, Hineinziehen am Rechner.
  // Nur im Browser: Das Foto verlässt das Gerät nicht, solange es keinen Versand gibt.
  var foto = form.querySelector('#foto');
  if (foto) {
    var fenster = foto.closest('.foto-fenster'), leer = fenster.querySelector('.foto-leer'), bild = fenster.querySelector('.foto-bild');
    var img = bild.querySelector('img'), name = bild.querySelector('.foto-name'), anders = form.querySelector('.foto-anders'), url = '';
    var fotoZeigen = function () {
      var datei = foto.files && foto.files[0];
      if (url) { URL.revokeObjectURL(url); url = ''; }
      if (!datei || pruefe(foto)) { bild.hidden = true; leer.hidden = false; anders.hidden = true; return; }
      url = URL.createObjectURL(datei);
      bild.classList.remove('ohne-vorschau');
      img.onerror = function () { bild.classList.add('ohne-vorschau'); }; // z. B. HEIC: nicht darstellbar, der Name reicht
      img.src = url;
      name.textContent = datei.name;
      leer.hidden = true; bild.hidden = false; anders.hidden = false;
    };
    anders.addEventListener('click', function () { foto.click(); });
    ['dragenter', 'dragover'].forEach(function (t) { fenster.addEventListener(t, function () { fenster.classList.add('zieht'); }); });
    ['dragleave', 'drop'].forEach(function (t) { fenster.addEventListener(t, function () { fenster.classList.remove('zieht'); }); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var erstes = null;
    felder().forEach(function (f) {
      var text = pruefe(f);
      zeige(f, text);
      if (text && !erstes) erstes = f;
    });
    if (erstes) {
      // Fehler im eingeklappten Teil: aufklappen, damit man ihn sieht
      var mehr = erstes.closest('details');
      if (mehr) mehr.open = true;
      sammel.hidden = false;
      erstes.focus();
      return;
    }
    sammel.hidden = true;
    // Testversion: nichts wird gesendet oder gespeichert.
    window.location.href = form.getAttribute('action');
  });
})();

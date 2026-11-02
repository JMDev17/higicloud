/* Higi Cloud — interações do site (sem dependências) */
(function () {
  "use strict";

  var WHATSAPP = "5512996637717";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: fundo ao rolar */
  var header = document.querySelector(".header");
  function onScrollHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* Fundo monocromático: o degradê azul muda de tom conforme a seção em foco */
  var stageSections = Array.prototype.slice.call(document.querySelectorAll("main > section, .footer"));
  var stage = document.querySelector(".stage");
  var rootStyle = getComputedStyle(document.documentElement);
  var hexRgb = function (h) { h = h.trim().replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
  var tone = function (name) { return [hexRgb(rootStyle.getPropertyValue("--tone-" + name + "-a")), hexRgb(rootStyle.getPropertyValue("--tone-" + name + "-b"))]; };
  var TONES = { hero: tone("hero"), dark: tone("dark"), mid: tone("mid"), light: tone("light"), deep: tone("deep") };
  var toneOf = function (el) {
    var c = el.className;
    if (/\bs--paper-2\b/.test(c)) return TONES.mid;
    if (/\bs--paper\b|\bs--blue\b/.test(c)) return TONES.light;
    if (/\bs--deep\b|\bfooter\b/.test(c)) return TONES.deep;
    if (/\bs--dark\b/.test(c)) return TONES.dark;
    return TONES.hero;
  };
  stageSections.forEach(function (s) { s._tone = toneOf(s); });
  var smooth = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  var rgb = function (c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; };
  // Mede quanto cada seção cobre a faixa central da tela (30% a 70%).
  // A cor do fundo é a média dos tons ponderada por essa cobertura, e cada
  // seção "liga" (opacidade) à medida que assume a faixa, e "desliga" ao sair.
  function updateTheme() {
    var vh = window.innerHeight;
    var bandTop = vh * 0.3, bandBottom = vh * 0.7, band = bandBottom - bandTop;
    var a = [0, 0, 0], b = [0, 0, 0], total = 0;
    stageSections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      var overlap = Math.max(0, Math.min(r.bottom, bandBottom) - Math.max(r.top, bandTop));
      var cover = overlap / Math.max(1, Math.min(band, r.height));
      s.style.opacity = (0.04 + 0.96 * smooth(cover * 1.8)).toFixed(3);
      if (!overlap) return;
      total += overlap;
      for (var i = 0; i < 3; i++) { a[i] += s._tone[0][i] * overlap; b[i] += s._tone[1][i] * overlap; }
    });
    if (!stage || !total) return;
    stage.style.setProperty("--sa", rgb(a.map(function (v) { return v / total; })));
    stage.style.setProperty("--sb", rgb(b.map(function (v) { return v / total; })));
  }
  /* Nuvem viajante (home): sai do hero e desce com a rolagem até a vaga da seção seguinte */
  var traveler = document.querySelector(".traveler");
  var heroSlot = document.querySelector(".hero--travel .hero__mark");
  var landingSlot = document.querySelector(".cloud-slot");
  var heroContent = document.querySelector(".hero--travel .hero__content");
  var heroOpacity = heroSlot ? parseFloat(getComputedStyle(heroSlot).opacity) || 0.3 : 0.3;
  var rings = traveler ? traveler.querySelectorAll("[data-s]") : [];
  var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
  function updateTraveler() {
    if (!traveler || !heroSlot || !landingSlot) return;
    var vh = window.innerHeight;
    // Sem a nuvem (oculta no mobile): o hero só se dissolve conforme a rolagem
    if (!landingSlot.offsetWidth) {
      if (heroContent) {
        var qm = clamp01(window.scrollY / (vh * 0.7));
        heroContent.style.opacity = (1 - qm).toFixed(3);
        heroContent.style.filter = qm > 0 ? "blur(" + (qm * 10).toFixed(1) + "px)" : "";
        heroContent.style.transform = "translateY(" + (-qm * 40).toFixed(1) + "px)";
      }
      return;
    }
    var a = heroSlot.getBoundingClientRect();
    var b = landingSlot.getBoundingClientRect();
    // 0 no topo da página; 1 quando a vaga de pouso está centralizada na tela
    var endScroll = window.scrollY + b.top + b.height / 2 - vh / 2;
    var p = endScroll > 0 ? clamp01(window.scrollY / endScroll) : 1;
    var e = easeInOut(p);
    var x = a.left + (b.left - a.left) * e;
    var y = a.top + (b.top - a.top) * e;
    var w = a.width + (b.width - a.width) * e;
    var h = a.height + (b.height - a.height) * e;
    traveler.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    traveler.style.width = w.toFixed(1) + "px";
    traveler.style.height = h.toFixed(1) + "px";
    var section = landingSlot.closest("section");
    var sectionOpacity = section && section.style.opacity !== "" ? parseFloat(section.style.opacity) : 1;
    // No topo a nuvem pertence ao hero; só passa a seguir a opacidade da seção de pouso ao descer
    var landedFade = 1 - e * (1 - sectionOpacity);
    traveler.style.opacity = ((heroOpacity + (1 - heroOpacity) * e) * landedFade).toFixed(3);
    // Os anéis se recolhem em direção à nuvem central durante a descida
    var spread = 1 - 0.62 * e;
    for (var i = 0; i < rings.length; i++) {
      var s = 1 + (parseFloat(rings[i].getAttribute("data-s")) - 1) * spread;
      rings[i].setAttribute("transform", "translate(32 33.5) scale(" + s.toFixed(4) + ") translate(-32 -33.5)");
    }
    // O conteúdo do hero se dissolve (desfoque + opacidade) enquanto a nuvem desce
    if (heroContent) {
      var q = clamp01(p * 1.8);
      heroContent.style.opacity = (1 - q).toFixed(3);
      heroContent.style.filter = q > 0 ? "blur(" + (q * 12).toFixed(1) + "px)" : "";
      heroContent.style.transform = "translateY(" + (-q * 50).toFixed(1) + "px)";
    }
    if (p > 0.985) traveler.classList.add("is-landed");
    else if (p < 0.85) traveler.classList.remove("is-landed");
  }

  var pendingReveal = [];
  function checkReveal() {
    if (!pendingReveal.length) return;
    var vh = window.innerHeight;
    pendingReveal = pendingReveal.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0) { el.classList.add("is-in"); return false; }
      if (r.top > vh * 0.88) return true;
      var sec = el.closest("main > section, .footer");
      var op = sec && sec.style.opacity !== "" ? parseFloat(sec.style.opacity) : 1;
      if (op < 0.6) return true;
      el.classList.add("is-in");
      return false;
    });
  }

  /* Imagem larga que cresce com a rolagem + parallax suave nas fotos */
  var scrubs = Array.prototype.slice.call(document.querySelectorAll("[data-scrub]"));
  var parallaxImgs = Array.prototype.slice.call(document.querySelectorAll(".tile img, [data-scrub] img"));
  function updateScrub() {
    if (reduceMotion) return;
    var vh = window.innerHeight;
    scrubs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = clamp01((vh - r.top) / (vh * 0.85));
      el.style.setProperty("--scrub", (1 - Math.pow(1 - p, 3)).toFixed(3));
    });
    parallaxImgs.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.setProperty("--py", (c * -36).toFixed(1) + "px");
    });
  }

  /* Como funciona: na primeira vez que aparece, as etapas abrem em sequência.
     Etapa 1 abre, a linha cresce até a 2, que abre, e assim por diante. */
  var FLOW_HOLD = 650, FLOW_GROW = 1050;
  var flows = Array.prototype.slice.call(document.querySelectorAll("[data-flow]")).map(function (el) {
    return { el: el, steps: el.querySelectorAll(".flow__step"), i: -1, p: 0, phase: "idle", t0: 0 };
  });
  var flowLoop = false;
  function drawFlow(f) {
    f.el.style.setProperty("--p", f.p.toFixed(4));
    f.el.classList.toggle("is-moving", f.phase === "grow");
    for (var j = 0; j < f.steps.length; j++) {
      f.steps[j].classList.toggle("is-on", j <= f.i);
      f.steps[j].classList.toggle("is-cur", j === f.i);
    }
  }
  function measureFlow() {
    flows.forEach(function (f) {
      var last = f.steps[f.steps.length - 1];
      f.el.style.setProperty("--last", (last.offsetHeight - last.querySelector(".flow__node").offsetHeight / 2) + "px");
    });
  }
  function nodeVisible(step) {
    return step.querySelector(".flow__node").getBoundingClientRect().top < window.innerHeight * 0.8;
  }
  function tickFlow(now) {
    var busy = false, vh = window.innerHeight;
    flows.forEach(function (f) {
      var n = f.steps.length;
      if (f.phase === "done") return;
      if (f.phase === "idle") {
        // só começa com a seção já acesa e a etapa 1 bem visível na tela
        var sec = f.el.closest("section");
        var op = sec && sec.style.opacity !== "" ? parseFloat(sec.style.opacity) : 1;
        var r0 = f.steps[0].getBoundingClientRect();
        if (op < 0.92 || r0.top > vh * 0.62 || r0.bottom < 0) return;
        f.i = 0; f.phase = "hold"; f.t0 = now;
      }
      if (f.phase === "hold") {
        if (f.i >= n - 1) { f.phase = "done"; }
        else if (now - f.t0 >= FLOW_HOLD) {
          // no mobile (linha vertical) a próxima etapa só abre quando estiver na tela
          if (nodeVisible(f.steps[f.i + 1])) { f.phase = "grow"; f.t0 = now; }
        } else busy = true;
      }
      if (f.phase === "grow") {
        var k = clamp01((now - f.t0) / FLOW_GROW);
        f.p = (f.i + easeInOut(k)) / (n - 1);
        if (k >= 1) { f.i++; f.phase = "hold"; f.t0 = now; }
        busy = true;
      }
      drawFlow(f);
    });
    flowLoop = busy;
    if (busy) requestAnimationFrame(tickFlow);
  }
  function updateFlow() {
    if (!flows.length || flowLoop) return;
    flowLoop = true;
    requestAnimationFrame(tickFlow);
  }
  measureFlow();
  if (reduceMotion) flows.forEach(function (f) { f.i = f.steps.length - 1; f.p = 1; f.phase = "done"; });
  flows.forEach(drawFlow);
  window.addEventListener("resize", measureFlow);

  function onFrame() { updateTheme(); updateTraveler(); updateScrub(); updateFlow(); checkReveal(); }
  if (stageSections.length) {
    var themeTicking = false;
    window.addEventListener("scroll", function () {
      if (!themeTicking) { themeTicking = true; requestAnimationFrame(function () { onFrame(); themeTicking = false; }); }
    }, { passive: true });
    window.addEventListener("resize", onFrame);
    window.addEventListener("load", onFrame);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onFrame);
    onFrame();
  }

  /* Abertura: nuvem se desenha, marca aparece e a tela se dissolve */
  var html = document.documentElement;
  var introDelay = 0;
  if (html.classList.contains("has-intro")) {
    introDelay = 1900;
    setTimeout(function () {
      var intro = document.querySelector(".intro");
      if (intro) intro.classList.add("is-out");
      html.classList.add("intro-done");
      onFrame();
    }, introDelay);
    setTimeout(function () { html.classList.remove("has-intro", "intro-done"); }, introDelay + 1000);
  }

  /* Menu mobile */
  var menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) menuBtn.click();
    });
  }

  /* Submenu de serviços */
  document.querySelectorAll(".nav__toggle-sub").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.closest(".has-sub");
      var open = li.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".has-sub.is-open").forEach(function (li) {
      if (!li.contains(e.target) && window.innerWidth >= 1080) {
        li.classList.remove("is-open");
        li.querySelector(".nav__toggle-sub").setAttribute("aria-expanded", "false");
      }
    });
  });

  /* Entrada dos elementos ao aparecer na tela (fade + desfoque, item a item) */
  var REVEAL_TARGETS = ".eyebrow, h1, h2, .lead, .hero__sub, .btn-row, .sec-foot, .chips, .empty, .related a, .card, " +
    ".swatch, .tile, .photo-card, .step, .grid-4 > *, .wordlist li, .cities li, .faq details, .contact-list li, .ticks li, .form, .crumbs, .locate__list li, .builder__main, .bsum, .value, .work, .prose__sec, .toc, main p";
  var targets = Array.prototype.slice.call(document.querySelectorAll("main " + REVEAL_TARGETS.split(", ").join(", main ")));
  // Blocos que agrupam vários itens deixam de animar em bloco: cada item anima sozinho
  document.querySelectorAll("main [data-reveal]").forEach(function (el) {
    if (targets.some(function (t) { return t !== el && el.contains(t); })) el.removeAttribute("data-reveal");
  });
  targets.forEach(function (el) {
    var groups = ".form, .faq details, .card, .empty, .step, .swatch, .tile, .showcase, .builder__main, .bsum, .locate__list li, .value, .work, .prose__sec, .toc";
    if (el.closest(".reveal-text, " + groups) && !el.matches(groups)) return;
    if (el.classList.contains("sr-only") || el.hasAttribute("data-words") || el.parentElement.closest("[data-reveal]")) return;
    if (!el.hasAttribute("data-reveal")) {
      var siblings = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty("--d", Math.min(siblings * 0.07, 0.42).toFixed(2) + "s");
      el.setAttribute("data-reveal", "");
    }
  });
  // Direção da entrada: o que está à esquerda do bloco entra pela esquerda,
  // o que está à direita entra pela direita, e o que está no centro sobe.
  document.querySelectorAll("main [data-reveal]").forEach(function (el) {
    if (el.matches(".tile, .photo-card, .swatch, .value, .prose__sec, .toc")) return;
    var box = el.closest(".container") || document.body;
    var b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (b.width < 760 || r.width > b.width * 0.7) return;
    var rel = (r.left + r.width / 2 - b.left) / b.width;
    if (rel < 0.4) el.setAttribute("data-from", "l");
    else if (rel > 0.6) el.setAttribute("data-from", "r");
  });
  // O conteúdo de cada seção só entra quando a cor daquela seção assume a tela
  // (a opacidade da seção, definida pela mistura de cor, passa de 60%).
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    setTimeout(function () { pendingReveal = revealEls; checkReveal(); }, introDelay ? introDelay - 200 : 0);
  }

  /* Texto que acende palavra por palavra conforme a rolagem */
  var revealTexts = Array.prototype.slice.call(document.querySelectorAll(".reveal-text, [data-words]"));
  function splitWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var span = document.createElement("span");
          span.className = "w";
          span.textContent = part;
          frag.appendChild(span);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        splitWords(child);
      }
    });
  }
  if (revealTexts.length && !reduceMotion) {
    revealTexts.forEach(splitWords);
    var ticking = false;
    var updateWords = function () {
      var vh = window.innerHeight;
      revealTexts.forEach(function (el) {
        var r = el.getBoundingClientRect();
        // Títulos curtos ([data-words]) ficam nítidos ao chegar no meio da tela
        var progress = el.hasAttribute("data-words") ? (vh * 0.92 - r.top) / (vh * 0.4) : (vh * 0.88 - r.top) / (r.height + vh * 0.45);
        progress = Math.max(0, Math.min(1, progress));
        var words = el.querySelectorAll(".w");
        var lit = Math.round(progress * words.length * 1.15);
        words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
      });
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateWords); }
    }, { passive: true });
    window.addEventListener("resize", updateWords);
    updateWords();
  }

  /* Filtro do portfólio */
  var chips = document.querySelectorAll("[data-filter]");
  if (chips.length) {
    var works = document.querySelectorAll(".work[data-cat]");
    var empty = document.querySelector("[data-works-empty]");
    var applyFilter = function (cat) {
      var visible = 0;
      works.forEach(function (w) {
        var show = cat === "todos" || w.getAttribute("data-cat").split(" ").indexOf(cat) !== -1;
        w.hidden = !show;
        if (show) visible++;
      });
      if (empty) empty.classList.toggle("is-hidden", visible > 0);
    };
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", "true");
        applyFilter(chip.getAttribute("data-filter"));
      });
    });
    applyFilter("todos");
  }

  /* Formulário de orçamento -> mensagem organizada no WhatsApp */
  var form = document.querySelector("#form-orcamento");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var get = function (name) { return (form.elements[name].value || "").trim(); };
      var servico = get("servico");
      var cidade = get("cidade");
      var error = form.querySelector(".form__error");
      if (!servico || !cidade) {
        error.classList.add("is-on");
        (servico ? form.elements.cidade : form.elements.servico).focus();
        return;
      }
      error.classList.remove("is-on");

      var lines = [
        "Olá! Vim pelo site da Higi Cloud e gostaria de solicitar um orçamento.",
        "",
        "*Serviço:* " + servico
      ];
      if (get("item")) lines.push("*Estofado/veículo:* " + get("item"));
      if (get("quantidade")) lines.push("*Quantidade de itens:* " + get("quantidade"));
      lines.push("*Cidade:* " + cidade);
      if (get("detalhes")) lines.push("*Informações adicionais:* " + get("detalhes"));

      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  }

  /* Índice das páginas internas: marca a seção em leitura */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.toggle("is-cur", a.getAttribute("href") === "#" + entry.target.id); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    tocLinks.forEach(function (a) {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (target) tocObserver.observe(target);
    });
  }

  /* Carrossel de trabalhos: setas rolam um card por vez */
  document.querySelectorAll("[data-carousel]").forEach(function (car) {
    var track = car.querySelector(".carousel__track");
    var prev = car.querySelector("[data-prev]"), next = car.querySelector("[data-next]");
    var step = function () { var card = track.firstElementChild; return card ? card.getBoundingClientRect().width + 14 : track.clientWidth; };
    var sync = function () {
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();

    // Arrastar com o mouse (no toque a rolagem nativa já faz o deslize)
    var drag = null, moved = false;
    track.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse" || ev.button !== 0) return;
      drag = { x: ev.clientX, left: track.scrollLeft, t: ev.timeStamp, v: 0, lx: ev.clientX, lt: ev.timeStamp };
      moved = false;
    });
    window.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) { moved = true; track.classList.add("is-dragging"); }
      var dt = ev.timeStamp - drag.lt;
      if (dt > 0) drag.v = (ev.clientX - drag.lx) / dt;
      drag.lx = ev.clientX; drag.lt = ev.timeStamp;
      track.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var d = drag; drag = null;
      if (!moved) return;
      var s = step();
      // projeta um pouco a velocidade do gesto e encaixa no card mais próximo
      var target = Math.round((track.scrollLeft - d.v * 180) / s) * s;
      track.classList.remove("is-dragging");
      track.scrollTo({ left: target, behavior: reduceMotion ? "auto" : "smooth" });
    });
    // Evita que soltar o arraste conte como clique em links do card
    track.addEventListener("click", function (ev) { if (moved) { ev.preventDefault(); ev.stopPropagation(); moved = false; } }, true);
    track.addEventListener("dragstart", function (ev) { ev.preventDefault(); });
  });

  /* Monte seu atendimento: etapas -> lista de itens -> mensagem no WhatsApp (sem preços) */
  var builder = document.querySelector("[data-builder]");
  var builderData = document.getElementById("builder-data");
  if (builder && builderData) {
    var cfg = JSON.parse(builderData.textContent);
    var PERIODS = ["Manhã", "Tarde", "Sem preferência"];
    var st = { step: 1, items: [], cur: null, period: "" };
    var $ = function (sel) { return builder.querySelector(sel); };
    var $$ = function (sel) { return Array.prototype.slice.call(builder.querySelectorAll(sel)); };

    var optButton = function (label, pressed, onClick) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "opt"; b.textContent = label;
      b.setAttribute("aria-pressed", String(pressed));
      b.addEventListener("click", onClick);
      return b;
    };
    var describe = function (item) {
      var svc = cfg.services[item.slug], parts = [];
      svc.q.forEach(function (q) {
        var v = item.a[q.id];
        if (q.type === "qty") parts.push(v + (v > 1 ? " unidades" : " unidade"));
        else if (q.type === "many") { if (v && v.length) parts.push(v.join(", ")); }
        else if (v) parts.push(v);
      });
      if (item.cond.length) parts.push(item.cond.join(", "));
      return parts.join(" · ");
    };

    function renderQuestions() {
      var box = $("[data-questions]"), svc = cfg.services[st.cur.slug];
      box.innerHTML = "";
      svc.q.forEach(function (q) {
        var wrap = document.createElement("div");
        wrap.className = "q";
        var label = document.createElement(q.type === "text" ? "label" : "span");
        label.className = "q__label"; label.textContent = q.label;
        wrap.appendChild(label);
        if (q.type === "one" || q.type === "many") {
          var opts = document.createElement("div");
          opts.className = "opts";
          q.opts.forEach(function (o) {
            var on = q.type === "one" ? st.cur.a[q.id] === o : (st.cur.a[q.id] || []).indexOf(o) !== -1;
            opts.appendChild(optButton(o, on, function () {
              if (q.type === "one") st.cur.a[q.id] = st.cur.a[q.id] === o ? "" : o;
              else {
                var list = st.cur.a[q.id] || [], i = list.indexOf(o);
                if (i === -1) list.push(o); else list.splice(i, 1);
                st.cur.a[q.id] = list;
              }
              renderQuestions();
            }));
          });
          wrap.appendChild(opts);
        } else if (q.type === "qty") {
          var qty = document.createElement("div");
          qty.className = "qty";
          qty.innerHTML = '<button type="button" aria-label="Diminuir">−</button><output aria-live="polite"></output><button type="button" aria-label="Aumentar">+</button>';
          qty.querySelector("output").textContent = st.cur.a[q.id];
          var btns = qty.querySelectorAll("button");
          btns[0].addEventListener("click", function () { st.cur.a[q.id] = Math.max(1, st.cur.a[q.id] - 1); qty.querySelector("output").textContent = st.cur.a[q.id]; });
          btns[1].addEventListener("click", function () { st.cur.a[q.id] = Math.min(99, st.cur.a[q.id] + 1); qty.querySelector("output").textContent = st.cur.a[q.id]; });
          wrap.appendChild(qty);
        } else {
          var id = "b-q-" + q.id;
          label.setAttribute("for", id);
          var field = document.createElement("div");
          field.className = "field";
          var ta = document.createElement("textarea");
          ta.id = id; ta.placeholder = q.ph || ""; ta.value = st.cur.a[q.id] || "";
          ta.addEventListener("input", function () { st.cur.a[q.id] = ta.value.trim(); });
          field.appendChild(ta);
          wrap.appendChild(field);
        }
        box.appendChild(wrap);
      });
    }

    function renderCond() {
      var box = $("[data-cond]");
      box.innerHTML = "";
      cfg.cond.forEach(function (c) {
        box.appendChild(optButton(c, st.cur.cond.indexOf(c) !== -1, function () {
          var unsure = cfg.cond[cfg.cond.length - 1], i = st.cur.cond.indexOf(c);
          if (i !== -1) st.cur.cond.splice(i, 1);
          else if (c === unsure) st.cur.cond = [c];
          else { st.cur.cond = st.cur.cond.filter(function (x) { return x !== unsure; }); st.cur.cond.push(c); }
          renderCond();
        }));
      });
      $("[data-obs]").value = st.cur.obs;
    }

    function renderPeriod() {
      var box = $("[data-period]");
      box.innerHTML = "";
      PERIODS.forEach(function (p) {
        box.appendChild(optButton(p, st.period === p, function () { st.period = st.period === p ? "" : p; renderPeriod(); }));
      });
    }

    function renderSummary() {
      var list = $("[data-sum]");
      list.innerHTML = "";
      st.items.forEach(function (item, i) {
        var li = document.createElement("li");
        li.innerHTML = "<strong></strong><small></small><button type=\"button\">Remover</button>";
        li.querySelector("strong").textContent = cfg.services[item.slug].label;
        li.querySelector("small").textContent = describe(item) || "Detalhes a combinar";
        li.querySelector("button").addEventListener("click", function () {
          st.items.splice(i, 1);
          renderSummary();
          if (!st.items.length && st.step >= 4) go(1);
          else if (st.step === 5) renderPreview();
        });
        list.appendChild(li);
      });
      $("[data-sum-empty]").hidden = st.items.length > 0;
      $(".bsum__add").hidden = st.items.length === 0 || st.step === 1;
    }

    function message() {
      var lines = ["Olá! Vim pelo site da Higi Cloud e montei meu atendimento:", ""];
      st.items.forEach(function (item, n) {
        var svc = cfg.services[item.slug];
        lines.push("*" + (n + 1) + ". " + svc.label + "*");
        svc.q.forEach(function (q) {
          var v = item.a[q.id];
          if (q.type === "qty") lines.push("Quantidade: " + v);
          else if (q.type === "many") { if (v && v.length) lines.push(q.label.replace(/\?$/, "") + ": " + v.join(", ")); }
          else if (v) lines.push(q.label.replace(/\?$/, "") + ": " + v);
        });
        if (item.cond.length) lines.push("Condição: " + item.cond.join(", "));
        if (item.obs) lines.push("Observações: " + item.obs);
        lines.push("");
      });
      lines.push("*Cidade:* " + $("[data-city]").value);
      var bairro = $("[data-bairro]").value.trim();
      if (bairro) lines.push("*Bairro:* " + bairro);
      if (st.period) lines.push("*Melhor período:* " + st.period);
      lines.push("", "Posso enviar fotos dos estofados por aqui.");
      return lines.join("\n");
    }
    function renderPreview() {
      var text = message();
      $("[data-preview]").textContent = text;
      $("[data-send]").href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text);
    }

    function go(n, noScroll) {
      st.step = n;
      $$("[data-step]").forEach(function (el) { el.hidden = el.getAttribute("data-step") !== String(n); });
      $$("[data-step-ind]").forEach(function (el) {
        var k = +el.getAttribute("data-step-ind");
        el.classList.toggle("is-cur", k === n);
        el.classList.toggle("is-done", k < n);
      });
      $("[data-step-n]").textContent = n;
      if (st.cur) $$("[data-cur-label]").forEach(function (el) { el.textContent = cfg.services[st.cur.slug].label.toLowerCase(); });
      if (n === 2) renderQuestions();
      if (n === 3) renderCond();
      if (n === 4) renderPeriod();
      if (n === 5) renderPreview();
      renderSummary();
      if (noScroll) return;
      var top = builder.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 90, behavior: reduceMotion ? "auto" : "smooth" });
    }

    function start(slug) {
      if (!cfg.services[slug]) return;
      var a = {};
      cfg.services[slug].q.forEach(function (q) { a[q.id] = q.type === "qty" ? 1 : q.type === "many" ? [] : ""; });
      st.cur = { slug: slug, a: a, cond: [], obs: "" };
      go(2);
    }

    $$("[data-pick]").forEach(function (b) { b.addEventListener("click", function () { start(b.getAttribute("data-pick")); }); });
    $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { go(st.step === 5 ? 4 : st.step - 1); }); });
    $$("[data-add]").forEach(function (b) { b.addEventListener("click", function () { st.cur = null; go(1); }); });
    $$("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (st.step === 2) go(3);
        else if (st.step === 3) {
          st.cur.obs = $("[data-obs]").value.trim();
          st.items.push(st.cur);
          st.cur = null;
          go(4);
        } else if (st.step === 4) {
          var ok = !!$("[data-city]").value;
          $("[data-city-error]").classList.toggle("is-on", !ok);
          if (!ok) { $("[data-city]").focus(); return; }
          go(5);
        }
      });
    });
    $("[data-city]").addEventListener("change", function () { $("[data-city-error]").classList.remove("is-on"); });

    var pre = new URLSearchParams(location.search).get("servico");
    if (pre && cfg.services[pre]) start(pre); else go(1, true);
  }
})();

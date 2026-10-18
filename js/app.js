/* Renders the public page entirely from data.json (or the owner's saved local edits). */
(function () {
  var P = window.Portfolio, h = P.h, icon = P.icon, safeUrl = P.safeUrl;

  function $(id) { return document.getElementById(id); }
  function fill(id, nodes) {
    var el = $(id);
    el.textContent = "";
    nodes.forEach(function (n) { if (n) el.appendChild(n); });
  }

  function sectionHead(idPrefix, eyebrow, heading, intro) {
    return h("div", { class: "section-head reveal" }, [
      eyebrow ? h("p", { class: "eyebrow", text: eyebrow }) : null,
      h("h2", { id: idPrefix + "-title", text: heading }),
      intro ? h("p", { class: "lede", text: intro }) : null
    ]);
  }

  function extLink(label, url) {
    var href = safeUrl(url);
    if (!href || !label) return null;
    var a = h("a", { class: "text-link", href: href, target: "_blank", rel: "noopener noreferrer" }, [
      h("span", { text: label }),
      icon("external", 16),
      h("span", { class: "sr-only", text: " (opens in a new tab)" })
    ]);
    return a;
  }

  /* ---------- Hero ---------- */
  function renderHero(d) {
    var hero = d.hero;
    var initials = (d.site.brand || hero.name.split(/\s+/).map(function (w) { return w[0]; }).join("")).slice(0, 3);
    var avatarSrc = hero.avatar;
    var avatar = h("div", { class: "avatar-wrap reveal" }, [
      h("div", { class: "avatar-ring" }, [
        avatarSrc
          ? h("img", { class: "avatar", src: avatarSrc, alt: "Portrait of " + hero.name, width: 360, height: 360 })
          : h("div", { class: "avatar avatar-fallback", role: "img", "aria-label": "Initials " + initials }, [h("span", { text: initials })])
      ])
    ]);

    var facts = h("ul", { class: "chips", "aria-label": "Quick facts" }, (hero.facts || []).map(function (f) {
      return h("li", { class: "chip" }, [icon(f.icon, 16), h("span", { text: f.label })]);
    }));

    var ctas = h("div", { class: "cta-row" }, [
      hero.primaryCta && hero.primaryCta.label
        ? h("a", { class: "btn btn-primary", href: hero.primaryCta.target || "#contact" }, [h("span", { text: hero.primaryCta.label }), icon("arrow-right", 18)])
        : null,
      hero.secondaryCta && hero.secondaryCta.label
        ? h("a", { class: "btn btn-ghost", href: hero.secondaryCta.target || "#passions", text: hero.secondaryCta.label })
        : null
    ]);

    var social = h("ul", { class: "social", "aria-label": "Social links" }, (hero.social || []).map(function (s) {
      var href = safeUrl(s.url);
      if (!href) return null;
      return h("li", {}, [
        h("a", { class: "social-link", href: href, target: "_blank", rel: "noopener noreferrer", "aria-label": s.label + " (opens in a new tab)", title: s.label }, [icon(s.icon, 22)])
      ]);
    }));

    var text = h("div", { class: "hero-text" }, [
      h("p", { class: "eyebrow reveal", text: hero.eyebrow }),
      h("h1", { id: "hero-name", class: "hero-name reveal" }, [h("span", { class: "grad", text: hero.name })]),
      h("p", { class: "hero-tagline reveal", text: hero.tagline }),
      facts, ctas, social
    ]);
    fill("hero", [text, avatar]);
  }

  /* ---------- About ---------- */
  function renderAbout(d) {
    var a = d.about;
    var paras = h("div", { class: "prose reveal" }, (a.paragraphs || []).map(function (t) { return h("p", { text: t }); }));
    var langs = h("div", { class: "card langs reveal" }, [
      h("h3", { text: a.languagesHeading || "Languages" }),
      h("ul", { class: "lang-list" }, (a.languages || []).map(function (l) {
        var strong = /fluent/i.test(l.level || "");
        return h("li", { class: "lang" + (strong ? " strong" : "") }, [
          h("span", { class: "lang-name", text: l.name }),
          h("span", { class: "lang-level", text: l.level })
        ]);
      }))
    ]);
    fill("about-body", [
      sectionHead("about", a.eyebrow, a.heading),
      h("div", { class: "about-grid" }, [paras, langs])
    ]);
  }

  /* ---------- Passions ---------- */
  function card(item) {
    var link = extLink(item.linkLabel, item.linkUrl);
    var media = null;
    if (item.image) {
      media = h("div", { class: "card-media" + (/fasca|logo/i.test(item.image) ? " contain" : "") }, [
        h("img", { src: item.image, alt: item.title + " photo", loading: "lazy", width: 640, height: 400 })
      ]);
    }
    return h("article", { class: "card project reveal" }, [
      media,
      h("div", { class: "card-body" }, [
        h("div", { class: "card-top" }, [
          h("span", { class: "tile" }, [icon(item.icon, 22)]),
          item.badge ? h("span", { class: "badge" + (/place|honorable|award/i.test(item.badge) ? " gold" : ""), text: item.badge }) : null
        ]),
        h("h4", { text: item.title }),
        item.subtitle ? h("p", { class: "card-sub", text: item.subtitle }) : null,
        item.description ? h("p", { text: item.description }) : null,
        item.highlights && item.highlights.length
          ? h("ul", { class: "highlights" }, item.highlights.map(function (t) {
              return h("li", {}, [icon("trophy", 16), h("span", { text: t })]);
            }))
          : null,
        link
      ])
    ]);
  }

  function renderPassions(d) {
    var p = d.passions;
    fill("passions-body", [
      sectionHead("passions", p.eyebrow, p.heading, p.intro),
      h("h3", { class: "group-title reveal", text: p.csHeading }),
      h("div", { class: "grid" }, (p.cs || []).map(card)),
      h("h3", { class: "group-title reveal", text: p.otherHeading }),
      h("div", { class: "grid" }, (p.other || []).map(card))
    ]);
  }

  /* ---------- Goals ---------- */
  function renderGoals(d) {
    var g = d.goals;
    var items = (g.items || []).map(function (it) {
      var future = /future/i.test(it.status || "");
      return h("li", { class: "goal reveal" + (future ? " future" : "") }, [
        h("span", { class: "tile" }, [icon(it.icon, 22)]),
        h("div", { class: "goal-body" }, [
          h("div", { class: "goal-top" }, [
            h("h4", { text: it.title }),
            it.status ? h("span", { class: "badge" + (future ? " violet" : ""), text: it.status }) : null
          ]),
          it.description ? h("p", { text: it.description }) : null,
          it.target ? h("p", { class: "target" }, [icon("clock", 16), h("span", { text: it.target })]) : null
        ])
      ]);
    });
    fill("goals-body", [
      sectionHead("goals", g.eyebrow, g.heading, g.intro),
      h("ol", { class: "goal-list" }, items)
    ]);
  }

  /* ---------- Contact ---------- */
  function renderContact(d) {
    var c = d.contact;
    var btn = h("button", { class: "btn btn-primary btn-lg", type: "button" }, [
      icon("mail", 20), h("span", { text: c.buttonLabel || "Contact me" })
    ]);
    btn.addEventListener("click", function () {
      if (!c.email) return;
      var url = "mailto:" + c.email + (c.subject ? "?subject=" + encodeURIComponent(c.subject) : "");
      window.location.href = url;
    });
    fill("contact-body", [
      h("div", { class: "contact-card reveal" }, [
        h("p", { class: "eyebrow", text: c.eyebrow }),
        h("h2", { id: "contact-title", text: c.heading }),
        h("p", { class: "lede", text: c.text }),
        btn
      ])
    ]);
  }

  /* ---------- Chrome ---------- */
  function renderChrome(d) {
    document.title = d.site.title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", d.site.description || "");

    var brand = $("brand");
    brand.textContent = "";
    brand.appendChild(h("span", { class: "brand-mark", text: d.site.brand || "RK" }));
    brand.appendChild(h("span", { class: "brand-name", text: d.hero.name }));

    fill("nav", []);
    (d.nav || []).forEach(function (n) {
      $("nav").appendChild(h("li", {}, [h("a", { href: n.target, text: n.label })]));
    });

    fill("footer", [h("p", { text: d.footer.text })]);
  }

  function setupThemeToggle() {
    var btn = $("theme-toggle");
    function paint() {
      var dark = P.currentTheme() === "dark";
      btn.textContent = "";
      btn.appendChild(icon(dark ? "sun" : "moon", 20));
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
    btn.addEventListener("click", function () { P.toggleTheme(); paint(); });
    paint();
  }

  function setupReveal() {
    var els = document.querySelectorAll(".reveal");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e, i) {
      e.style.transitionDelay = Math.min((i % 4) * 60, 180) + "ms";
      io.observe(e);
    });
  }

  function setupHeaderShadow() {
    var header = $("site-header");
    function on() { header.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", on, { passive: true });
    on();
  }

  function showBanner(source) {
    var b = $("local-banner");
    if (source !== "local") return;
    b.hidden = false;
    b.appendChild(h("span", { text: "Previewing your locally saved edits. Visitors see the published version." }));
    b.appendChild(h("a", { href: "admin.html", text: "Open editor" }));
    b.appendChild(h("button", { type: "button", text: "Discard local edits", onclick: function () { P.clearLocal(); location.reload(); } }));
  }

  function showError(err) {
    var main = $("main");
    main.textContent = "";
    main.appendChild(h("div", { class: "container error-box", role: "alert" }, [
      h("h1", { text: "Couldn't load portfolio data" }),
      h("p", { text: "data.json could not be loaded. If you opened this file directly from your computer, start a local server instead (for example, run \"npx serve\" in this folder) or view the deployed site." }),
      h("p", { class: "muted", text: String(err && err.message || err) })
    ]));
  }

  P.loadData().then(function (res) {
    var d = res.data;
    renderChrome(d); renderHero(d); renderAbout(d); renderPassions(d); renderGoals(d); renderContact(d);
    setupThemeToggle(); setupHeaderShadow(); showBanner(res.source);
    requestAnimationFrame(setupReveal);
  }).catch(showError);
})();

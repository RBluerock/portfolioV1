/* Client-side editor: builds a form from data.json, saves to localStorage, exports updated JSON. */
(function () {
  var P = window.Portfolio, h = P.h;
  var UNLOCK_KEY = "rk-portfolio-admin-unlocked";
  var HIDDEN_TOP_KEYS = { admin: true };
  var MULTILINE = { paragraphs: 1, description: 1, text: 1, tagline: 1, intro: 1 };

  var state = null;       // working copy being edited
  var published = null;   // used for the passcode hash
  var openPaths = {};     // remembers which <details> are open across re-renders
  var templates = {};     // blank item shapes keyed by normalized path

  function $(id) { return document.getElementById(id); }

  function setStatus(msg) {
    var s = $("status");
    s.textContent = msg;
    clearTimeout(setStatus.t);
    setStatus.t = setTimeout(function () { s.textContent = ""; }, 4000);
  }

  function prettify(key) {
    return key.replace(/([A-Z])/g, " $1").replace(/[-_]/g, " ").replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function blankLike(v) {
    if (typeof v === "string") return "";
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") {
      var o = {};
      Object.keys(v).forEach(function (k) { o[k] = blankLike(v[k]); });
      return o;
    }
    return v;
  }
  function normPath(path) { return path.replace(/\[\d+\]/g, "[]"); }
  function itemTitle(item, idx) {
    return (item && (item.title || item.label || item.name)) || "Item " + (idx + 1);
  }

  /* ----- generic field builders ----- */
  function stringField(parent, key, label) {
    var multiline = MULTILINE[key] || (typeof parent[key] === "string" && parent[key].length > 90);
    var input = multiline
      ? h("textarea", { rows: 3 })
      : h("input", { type: /url$/i.test(key) ? "url" : (key === "email" ? "email" : "text") });
    input.value = parent[key];
    if (key === "icon") return iconField(parent, key, label);
    input.addEventListener("input", function () { parent[key] = input.value; });
    return h("label", { class: "fld" }, [h("span", { text: label }), input]);
  }

  function iconField(parent, key, label) {
    var sel = h("select", {}, Object.keys(P.ICONS).map(function (n) { return h("option", { value: n, text: n }); }));
    sel.value = P.ICONS[parent[key]] ? parent[key] : "code";
    parent[key] = sel.value;
    sel.addEventListener("change", function () { parent[key] = sel.value; });
    return h("label", { class: "fld" }, [h("span", { text: label }), sel]);
  }

  function stringListField(arr, label, rerender) {
    var wrap = h("div", { class: "sub" }, [h("div", { class: "sub-title", text: label })]);
    var stack = h("div", { class: "list-stack" });
    arr.forEach(function (val, i) {
      var inp = h("input", { type: "text", "aria-label": label + " " + (i + 1) });
      inp.value = val;
      inp.addEventListener("input", function () { arr[i] = inp.value; });
      stack.appendChild(h("div", { class: "str-row" }, [
        inp,
        h("button", { class: "mini danger", type: "button", "aria-label": "Remove " + label + " " + (i + 1), text: "Remove", onclick: function () { arr.splice(i, 1); rerender(); } })
      ]));
    });
    wrap.appendChild(stack);
    wrap.appendChild(h("button", { class: "mini", type: "button", text: "+ Add", onclick: function () { arr.push(""); rerender(); } }));
    return wrap;
  }

  function objectListField(arr, label, path, rerender) {
    var np = normPath(path);
    if (arr.length && !templates[np]) templates[np] = blankLike(arr[0]);
    var wrap = h("div", { class: "sub" }, [h("div", { class: "sub-title", text: label })]);
    arr.forEach(function (item, i) {
      var ipath = path + "[" + i + "]";
      var det = h("details", { class: "item" });
      if (openPaths[ipath]) det.open = true;
      det.addEventListener("toggle", function () { openPaths[ipath] = det.open; });
      var tools = h("span", { class: "item-tools" }, [
        i > 0 ? h("button", { class: "mini", type: "button", text: "Up", "aria-label": "Move up", onclick: function (e) { e.preventDefault(); swap(arr, i, i - 1); rerender(); } }) : null,
        i < arr.length - 1 ? h("button", { class: "mini", type: "button", text: "Down", "aria-label": "Move down", onclick: function (e) { e.preventDefault(); swap(arr, i, i + 1); rerender(); } }) : null,
        h("button", { class: "mini danger", type: "button", text: "Remove", "aria-label": "Remove item", onclick: function (e) {
          e.preventDefault();
          if (confirm("Remove \"" + itemTitle(item, i) + "\"?")) { arr.splice(i, 1); rerender(); }
        } })
      ]);
      det.appendChild(h("summary", {}, [h("span", { text: itemTitle(item, i) }), tools]));
      var inner = h("div", { class: "item-inner" });
      objectFields(item, ipath, rerender).forEach(function (n) { inner.appendChild(n); });
      det.appendChild(inner);
      wrap.appendChild(det);
    });
    wrap.appendChild(h("button", { class: "mini", type: "button", text: "+ Add item", onclick: function () {
      var t = templates[np] || {};
      var fresh = JSON.parse(JSON.stringify(t));
      arr.push(fresh);
      openPaths[path + "[" + (arr.length - 1) + "]"] = true;
      rerender();
    } }));
    return wrap;
  }

  function swap(arr, a, b) { var t = arr[a]; arr[a] = arr[b]; arr[b] = t; }

  function objectFields(obj, path, rerender) {
    return Object.keys(obj).map(function (key) {
      var v = obj[key], label = prettify(key), p = path + "." + key;
      if (typeof v === "string") return stringField(obj, key, label);
      if (Array.isArray(v)) {
        var objects = v.length && typeof v[0] === "object";
        var known = /^(.*\.)?(cs|other|items|languages|social|facts|nav)$/.test(p);
        return objects || (!v.length && known) ? objectListField(v, label, p, rerender) : stringListField(v, label, rerender);
      }
      if (v && typeof v === "object") {
        var box = h("div", { class: "sub" }, [h("div", { class: "sub-title", text: label })]);
        objectFields(v, p, rerender).forEach(function (n) { box.appendChild(n); });
        return box;
      }
      return null;
    }).filter(Boolean);
  }

  function renderEditor() {
    var root = $("fields");
    root.textContent = "";
    var first = true;
    Object.keys(state).forEach(function (key) {
      if (HIDDEN_TOP_KEYS[key]) return;
      var sp = key;
      var det = h("details", { class: "section-card" });
      if (openPaths[sp] === undefined) openPaths[sp] = first;
      det.open = !!openPaths[sp];
      det.addEventListener("toggle", function () { openPaths[sp] = det.open; });
      first = false;
      det.appendChild(h("summary", { text: prettify(key) }));
      var inner = h("div", { class: "section-inner" });
      if (Array.isArray(state[key])) inner.appendChild(objectListField(state[key], prettify(key), key, renderEditor));
      else objectFields(state[key], key, renderEditor).forEach(function (n) { inner.appendChild(n); });
      det.appendChild(inner);
      root.appendChild(det);
    });
  }

  /* ----- actions ----- */
  function applyPasscode() {
    var np = $("new-pass").value;
    if (!np) return Promise.resolve();
    return P.sha256Hex(np).then(function (hash) {
      state.admin = state.admin || {};
      state.admin.passcodeHash = hash;
      $("new-pass").value = "";
    });
  }

  function save() {
    applyPasscode().then(function () {
      P.saveLocal(state);
      setStatus("Saved on this device.");
      $("source-note").textContent = "Showing your locally saved edits. Download the JSON to publish them.";
    }).catch(function (e) { setStatus("Could not save: " + e.message); });
  }

  function download() {
    applyPasscode().then(function () {
      var blob = new Blob([JSON.stringify(state, null, 2) + "\n"], { type: "application/json" });
      var a = h("a", { href: URL.createObjectURL(blob), download: "data.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      setStatus("Downloaded data.json.");
    });
  }

  function reset() {
    if (!confirm("Discard your locally saved edits and reload the published data.json?")) return;
    P.clearLocal();
    P.fetchPublished().then(function (d) {
      state = d; openPaths = {};
      renderEditor();
      $("source-note").textContent = "Showing the published data.json.";
      setStatus("Local edits discarded.");
    }).catch(function (e) { setStatus("Could not load data.json: " + e.message); });
  }

  /* ----- gate ----- */
  function showEditor(source) {
    $("gate").hidden = true;
    $("editor").hidden = false;
    $("source-note").textContent = source === "local"
      ? "Showing your locally saved edits. Download the JSON to publish them."
      : "Showing the published data.json. Nothing is saved locally yet.";
    renderEditor();
  }

  function init(res) {
    state = JSON.parse(JSON.stringify(res.data));
    published = res.data;
    var hash = published.admin && published.admin.passcodeHash;
    var unlocked = false;
    try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === "1"; } catch (e) {}
    if (!hash || unlocked) return showEditor(res.source);

    $("gate").hidden = false;
    $("passcode").focus();
    $("gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("gate-error");
      P.sha256Hex($("passcode").value).then(function (hx) {
        if (hx === hash) {
          try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch (x) {}
          showEditor(res.source);
        } else {
          err.hidden = false;
          err.textContent = "That passcode isn't right. Try again.";
          $("passcode").select();
        }
      }).catch(function (ex) {
        err.hidden = false;
        err.textContent = "Couldn't check the passcode (" + ex.message + "). Use the deployed https site or localhost.";
      });
    });
  }

  $("save").addEventListener("click", save);
  $("download").addEventListener("click", download);
  $("reset").addEventListener("click", reset);
  $("lock").addEventListener("click", function () {
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) {}
    location.reload();
  });

  P.loadData().then(init).catch(function (e) {
    var el = $("load-error");
    el.hidden = false;
    el.textContent = "Couldn't load data.json (" + e.message + "). Serve the folder over http (for example \"npx serve\") instead of opening the file directly.";
  });
})();

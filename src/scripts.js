import { el as $el, empty as $empty } from "./lib/elements.js";
import { sleep as $pause, error as $boom } from "./lib/helpers.js";

const API = "https://api.artic.edu/api/v1";
const LIMIT = 20;

/**
 * Hreinsar parent og setur children inn.
 * @param {HTMLElement} parent
 * @param {HTMLElement|string|number|Array<HTMLElement|string|number>} kids
 * @returns {HTMLElement}
 */
function putKids(parent, kids) {
  $empty(parent);
  const list = (Array.isArray(kids) ? kids : [kids]).flat();
  for (const k of list) {
    if (k == null) continue;
    parent.appendChild(
      typeof k === "string" || typeof k === "number"
        ? document.createTextNode(String(k))
        : k
    );
  }
  return parent;
}

/**
 * Tæmir element.
 * @param {HTMLElement} node
 */
function wipe(node) {
  $empty(node);
}

/** @type {{ lastQuery: string, slow: boolean, forceError: boolean }} */
const S = { lastQuery: "", slow: false, forceError: false };

/**
 * Skilar IIIF myndaslóð fyrir image_id.
 * @param {string|null} id
 * @returns {string|null}
 */
function iiif(id) {
  return id ? `https://www.artic.edu/iiif/2/${id}/full/843,/0/default.jpg` : null;
}

/**
 * Skilar stöðublokk.
 * @param {"loading"|"error"|"empty"} kind
 * @param {string} msg
 * @returns {HTMLElement}
 */
function flagBox(kind, msg) {
  return $el("div", { class: `status status--${kind}` }, $el("p", {}, msg));
}

/**
 * Skilar label + input röð.
 * @param {string} labelText
 * @param {HTMLElement} inputEl
 * @returns {HTMLElement}
 */
function row(labelText, inputEl) {
  return $el(
    "label",
    { class: "form-row" },
    $el("span", { class: "form-row__label" }, labelText),
    inputEl
  );
}

const $root = document.querySelector("#app") ?? document.body;

const $h1 = $el("h1", {}, "Art Institute of Chicago – Leit");
const $lead = $el(
  "p",
  { class: "lead" },
  "Leitaðu að verkum; smelltu á titil til að sjá nánar. Prófaðu „slow“ eða „error“ í leitarreit eða með gátboxum."
);

const $q = $el("input", {
  type: "search",
  name: "q",
  placeholder: "t.d. monet, van gogh, landscape…",
  required: "true",
  autocomplete: "off",
  class: "input",
});

const $slow = $el("input", { type: "checkbox", id: "slow" });
const $err = $el("input", { type: "checkbox", id: "error" });

const $ctrls = $el(
  "div",
  { class: "controls" },
  row("Hæga hermun (slow)", $el("div", {}, $slow)),
  row("Villa í kalli (error)", $el("div", {}, $err))
);

const $submit = $el("button", { type: "submit", class: "button" }, "Leita");

const $form = $el(
  "form",
  { id: "search-form", class: "search" },
  row("Leitarorð", $q),
  $ctrls,
  $submit
);

const $h2a = $el("h2", {}, "Niðurstöður");
const $results = $el("div", { id: "results", class: "results" });

const $h2b = $el("h2", {}, "Stakt verk");
const $detail = $el("div", { id: "detail", class: "detail" });

putKids($root, [$h1, $lead, $form, $h2a, $results, $h2b, $detail]);

/**
 * Leitar verkum í AIC.
 * @param {string} q
 * @returns {Promise<Array<{id:number,title?:string}>>}
 */
async function fetchList(q) {
  const u = new URL(`${API}/artworks/search`);
  u.searchParams.set("q", q);
  u.searchParams.set("limit", String(LIMIT));
  u.searchParams.set("fields", "id,title");
  const wantSlow = S.slow || /\bslow\b/i.test(q);
  const wantError = S.forceError || /\berror\b/i.test(q);
  if (wantSlow) await $pause(1.2);
  if (wantError) $boom("Hermuð villa í leit");
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`Leit brást (${r.status})`);
  const j = await r.json();
  return j.data ?? [];
}

/**
 * Sækir eitt verk.
 * @param {string|number} id
 * @returns {Promise<{id:number,title:string,artist_title:string|null,date_display:string|null,dimensions:string|null,medium_display:string|null,credit_line:string|null,image_id:string|null}>}
 */
async function fetchOne(id) {
  const u = new URL(`${API}/artworks/${id}`);
  u.searchParams.set(
    "fields",
    [
      "id",
      "title",
      "artist_title",
      "date_display",
      "dimensions",
      "medium_display",
      "credit_line",
      "image_id",
    ].join(",")
  );
  if (S.slow) await $pause(1.2);
  if (S.forceError) $boom("Hermuð villa í sækja stakt verk");
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`Sækja verk brást (${r.status})`);
  const j = await r.json();
  return j.data;
}

/**
 * Teiknar lista af niðurstöðum.
 * @param {Array<{id:number,title?:string}>} items
 */
function paintList(items) {
  if (!items.length) {
    putKids($results, [flagBox("empty", "Engar niðurstöður.")]);
    return;
  }
  const list = $el(
    "ul",
    { class: "results__list" },
    ...items.map((it) =>
      $el(
        "li",
        {},
        $el(
          "a",
          { href: `?id=${encodeURIComponent(it.id)}`, "data-id": String(it.id), class: "result__link" },
          it.title || `#${it.id}`
        )
      )
    )
  );
  putKids($results, [list]);
}

/**
 * Teiknar stakt verk.
 * @param {{id:number,title:string,artist_title:string|null,date_display:string|null,dimensions:string|null,medium_display:string|null,credit_line:string|null,image_id:string|null}} a
 */
function paintOne(a) {
  const img = iiif(a.image_id);
  const back = $el("a", { href: "./", class: "button button--back" }, "← Til baka í leit");
  const meta = $el(
    "dl",
    { class: "meta" },
    $el("dt", {}, "Höfundur"),
    $el("dd", {}, a.artist_title || "—"),
    $el("dt", {}, "Dagsetning"),
    $el("dd", {}, a.date_display || "—"),
    $el("dt", {}, "Miðill"),
    $el("dd", {}, a.medium_display || "—"),
    $el("dt", {}, "Stærð"),
    $el("dd", {}, a.dimensions || "—"),
    $el("dt", {}, "Heimild"),
    $el("dd", {}, a.credit_line || "—")
  );
  putKids($detail, [
    back,
    $el("h3", {}, a.title || `#${a.id}`),
    img ? $el("img", { src: img, alt: a.title || "" }) : $el("div", { class: "noimg" }, "Engin mynd"),
    meta,
  ]);
}

/**
 * Hreinsar nánari sýn.
 */
function clearDetail() {
  wipe($detail);
}

/**
 * Keyrir leit og birtir niðurstöður.
 * @param {string} q
 */
async function runSearch(q) {
  putKids($results, [flagBox("loading", "Sæki…")]);
  try {
    const items = await fetchList(q);
    paintList(items);
  } catch (e) {
    putKids($results, [flagBox("error", e?.message || "Villa í leit")]);
  }
}

/**
 * Sýnir eitt verk út frá id.
 * @param {string|number} id
 */
async function showOne(id) {
  putKids($detail, [flagBox("loading", "Sæki verk…")]);
  try {
    const a = await fetchOne(id);
    paintOne(a);
  } catch (e) {
    putKids($detail, [flagBox("error", e?.message || "Villa í verki")]);
  }
}

$form.addEventListener("submit", (evt) => {
  evt.preventDefault();
  const q = $q.value.trim();
  S.lastQuery = q;
  S.slow = $slow.checked || /\bslow\b/i.test(q);
  S.forceError = $err.checked || /\berror\b/i.test(q);
  clearDetail();
  runSearch(q);
});

/**
 * Ræsir forrit; sýnir stakt verk ef ?id= er til.
 */
function boot() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (id) showOne(id);
}

boot();

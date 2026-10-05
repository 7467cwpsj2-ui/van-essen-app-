/* Solenne — galerij, variantkeuze, winkelwagen-lade (Shopify AJAX Cart API) */
(function () {
  const theme = window.theme || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Geld ---------- */
  function formatMoney(cents) {
    const format = theme.moneyFormat || "€{{amount_with_comma_separator}}";
    const value = (Number(cents) || 0) / 100;
    const fixed = (decimals, thousands, decimal) => {
      const [i, d] = value.toFixed(decimals).split(".");
      const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return d ? int + decimal + d : int;
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case "amount": return fixed(2, ",", ".");
        case "amount_no_decimals": return fixed(0, ",", ".");
        case "amount_with_comma_separator": return fixed(2, ".", ",");
        case "amount_no_decimals_with_comma_separator": return fixed(0, ".", ",");
        case "amount_with_apostrophe_separator": return fixed(2, "'", ".");
        default: return fixed(2, ".", ",");
      }
    });
  }
  theme.formatMoney = formatMoney;

  let toastTimer;
  function toast(msg) {
    const t = $("#Toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2800);
  }

  /* ---------- Mobiel menu ---------- */
  const menuBtn = $("#MenuToggle");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const nav = $("#MobileNav");
      const open = nav.hidden;
      nav.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open);
    });
  }

  /* ---------- Galerij ---------- */
  function initGallery(root) {
    const stage = $(".stage", root);
    if (!stage) return null;
    const main = $(".main", stage);
    const blur = $(".blur", stage);
    const cap = $(".cap", stage);
    const thumbs = $$(".thumb", root);
    let index = 0;

    function show(i) {
      if (!thumbs.length) return;
      index = (i + thumbs.length) % thumbs.length;
      const t = thumbs[index];
      main.src = t.dataset.src;
      if (t.dataset.srcset) main.srcset = t.dataset.srcset; else main.removeAttribute("srcset");
      main.alt = t.dataset.alt || "";
      main.classList.toggle("cover", t.dataset.fit === "cover");
      if (blur) blur.src = t.dataset.src;
      if (cap) { cap.textContent = t.dataset.cap || ""; cap.hidden = !t.dataset.cap; }
      thumbs.forEach((el, j) => el.setAttribute("aria-pressed", j === index));
      const track = t.parentElement;
      track.scrollTo({ left: t.offsetLeft - track.clientWidth / 2 + t.clientWidth / 2, behavior: "smooth" });
    }

    thumbs.forEach((t, i) => t.addEventListener("click", () => show(i)));
    const prev = $(".prev", stage), next = $(".next", stage);
    if (prev) prev.addEventListener("click", () => show(index - 1));
    if (next) next.addEventListener("click", () => show(index + 1));

    let x0 = null;
    stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    });

    return {
      showMedia(mediaId) {
        const i = thumbs.findIndex((t) => t.dataset.mediaId === String(mediaId));
        if (i > -1) show(i);
      },
    };
  }

  /* ---------- Productformulier ---------- */
  function initProduct(section) {
    const dataEl = $("[data-product-json]", section);
    const form = $("form[data-product-form]", section);
    if (!dataEl || !form) return;
    const product = JSON.parse(dataEl.textContent);
    const gallery = initGallery(section);
    const idInput = $('input[name="id"]', form);
    const addBtn = $("[data-add-button]", form);
    const priceEl = $("[data-price]", section);
    const compareEl = $("[data-compare]", section);
    const stickyPrice = $("[data-sticky-price]", section);
    const stickyBtn = $("[data-sticky-add]", section);
    const errorEl = $("[data-form-error]", form);

    function selectedOptions() {
      return $$("[data-option]", section).map((fs) => {
        const checked = $("input:checked", fs);
        return checked ? checked.value : null;
      });
    }

    function findVariant(options) {
      return product.variants.find((v) => v.options.every((o, i) => o === options[i]));
    }

    // Prijs per rij-optie tonen (bijv. "Set: Duo — €49") op basis van de overige keuzes
    function updateRowPrices() {
      const current = selectedOptions();
      $$("[data-option]", section).forEach((fs, pos) => {
        $$(".row-opt", fs).forEach((row) => {
          const input = $("input", row);
          const opts = current.slice();
          opts[pos] = input.value;
          const v = findVariant(opts);
          const bp = $(".bp", row);
          if (bp) bp.textContent = v ? formatMoney(v.price) : "";
          row.classList.toggle("is-unavailable", !v || !v.available);
        });
        const value = $(".value", fs);
        if (value) value.textContent = current[pos] || "";
      });
    }

    function update() {
      const variant = findVariant(selectedOptions());
      updateRowPrices();
      if (!variant) {
        addBtn.disabled = true;
        addBtn.textContent = theme.strings.unavailable;
        if (stickyBtn) stickyBtn.disabled = true;
        return;
      }
      idInput.value = variant.id;
      addBtn.disabled = !variant.available;
      addBtn.textContent = variant.available ? theme.strings.addToCart : theme.strings.soldOut;
      if (stickyBtn) { stickyBtn.disabled = !variant.available; stickyBtn.textContent = addBtn.textContent; }
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (stickyPrice) stickyPrice.textContent = formatMoney(variant.price);
      if (compareEl) {
        const show = variant.compare_at_price && variant.compare_at_price > variant.price;
        compareEl.hidden = !show;
        if (show) compareEl.textContent = formatMoney(variant.compare_at_price);
      }
      if (variant.featured_media && gallery) gallery.showMedia(variant.featured_media.id);
      const url = new URL(window.location.href);
      url.searchParams.set("variant", variant.id);
      window.history.replaceState({}, "", url.toString());
    }

    section.addEventListener("change", (e) => { if (e.target.closest("[data-option]")) update(); });

    // Hoeveelheid
    const qtyInput = $('input[name="quantity"]', form);
    $$("[data-qty]", form).forEach((b) => b.addEventListener("click", () => {
      const next = Math.max(1, (parseInt(qtyInput.value, 10) || 1) + Number(b.dataset.qty));
      qtyInput.value = next;
    }));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;
      addBtn.setAttribute("aria-busy", "true");
      try {
        const res = await fetch(theme.routes.cartAdd, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.description || data.message || theme.strings.error);
        await cart.refresh();
        cart.open();
      } catch (err) {
        if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; }
        else toast(err.message);
      } finally {
        addBtn.removeAttribute("aria-busy");
      }
    });

    if (stickyBtn) stickyBtn.addEventListener("click", () => form.requestSubmit());

    update();
  }

  /* ---------- Winkelwagen-lade ---------- */
  const cart = {
    drawer: null,
    async refresh() {
      const res = await fetch(theme.routes.cart, { headers: { Accept: "application/json" } });
      const data = await res.json();
      this.render(data);
      return data;
    },
    render(data) {
      $$("[data-cart-count]").forEach((el) => (el.textContent = "(" + data.item_count + ")"));
      const d = this.drawer;
      if (!d) return;
      $("[data-cart-subtotal]", d).textContent = formatMoney(data.total_price);
      $("[data-checkout]", d).disabled = data.item_count === 0;

      const ship = $("[data-ship]", d);
      const threshold = theme.freeShippingThreshold || 0;
      if (ship) {
        ship.hidden = !threshold;
        if (threshold) {
          const left = Math.max(0, threshold - data.total_price);
          $("[data-ship-text]", d).textContent = left > 0
            ? theme.strings.shippingLeft.replace("[amount]", formatMoney(left))
            : theme.strings.shippingFree;
          $("[data-ship-meter]", d).style.width = Math.min(100, (data.total_price / threshold) * 100) + "%";
        }
      }

      const lines = $("[data-cart-lines]", d);
      if (!data.items.length) {
        lines.innerHTML = '<div class="empty">' + theme.strings.emptyCart + "</div>";
        return;
      }
      lines.innerHTML = data.items.map((item, i) => {
        const img = item.image ? item.image + (item.image.includes("?") ? "&" : "?") + "width=200" : "";
        const variant = item.variant_title && !item.product_has_only_default_variant
          ? "<small>" + escapeHtml(item.variant_title) + "</small>" : "";
        return '<div class="line">'
          + '<a class="ph" href="' + item.url + '">' + (img ? '<img src="' + img + '" alt="" loading="lazy">' : "") + "</a>"
          + "<div><b>" + escapeHtml(item.product_title) + "</b>" + variant
          + '<span class="line-qty"><button type="button" data-line="' + (i + 1) + '" data-q="' + (item.quantity - 1) + '" aria-label="Minder">−</button>'
          + item.quantity
          + '<button type="button" data-line="' + (i + 1) + '" data-q="' + (item.quantity + 1) + '" aria-label="Meer">+</button>'
          + '<button type="button" class="rm" data-line="' + (i + 1) + '" data-q="0">' + theme.strings.remove + "</button></span></div>"
          + '<span class="lp">' + formatMoney(item.final_line_price) + "</span></div>";
      }).join("");
    },
    async change(line, quantity) {
      const res = await fetch(theme.routes.cartChange, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ line, quantity }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.description || theme.strings.error); return; }
      this.render(data);
    },
    open() {
      if (!this.drawer) { window.location.href = theme.routes.cartUrl; return; }
      this.drawer.setAttribute("aria-hidden", "false");
      $("#CartScrim").hidden = false;
      document.documentElement.style.overflow = "hidden";
      $(".x", this.drawer).focus();
    },
    close() {
      if (!this.drawer) return;
      this.drawer.setAttribute("aria-hidden", "true");
      $("#CartScrim").hidden = true;
      document.documentElement.style.overflow = "";
    },
  };
  theme.cart = cart;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    cart.drawer = $("#CartDrawer");
    if (cart.drawer) {
      $$("[data-open-cart]").forEach((b) => b.addEventListener("click", (e) => {
        if (document.body.classList.contains("template-cart")) return;
        e.preventDefault();
        cart.refresh().then(() => cart.open());
      }));
      $(".x", cart.drawer).addEventListener("click", () => cart.close());
      $("#CartScrim").addEventListener("click", () => cart.close());
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") cart.close(); });
      $("[data-cart-lines]", cart.drawer).addEventListener("click", (e) => {
        const b = e.target.closest("[data-line]");
        if (b) cart.change(Number(b.dataset.line), Number(b.dataset.q));
      });
    }

    $$("[data-product-section]").forEach(initProduct);

    // Theme editor: secties opnieuw initialiseren na bewerken
    document.addEventListener("shopify:section:load", (e) => {
      const s = e.target.querySelector("[data-product-section]");
      if (s) initProduct(s);
    });
  });
})();

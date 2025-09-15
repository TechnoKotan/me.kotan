(function () {
  var KEY = "kotan_consent_v1";
  var banner = document.getElementById("cookieBanner");
  if (!banner) return;

  banner.innerHTML =
    "" +
    "<p>Мы используем куки только для аналитики (GA4). " +
    "Нажми «Принять» чтобы включить сбор статистики.</p>" +
    '<div class="cookie-actions">' +
    '<button id="cookieAccept" class="cookie-btn primary">Принять</button>' +
    '<button id="cookieReject" class="cookie-btn">Отклонить</button>' +
    '<button id="cookieMore" class="cookie-btn link">Политика</button>' +
    "</div>";

  function show() {
    banner.classList.add("show");
    banner.removeAttribute("hidden");
  }
  function hide() {
    banner.classList.remove("show");
    banner.setAttribute("hidden", "");
  }

  var stored = localStorage.getItem(KEY);
  if (!stored) show();

  document.getElementById("cookieAccept")?.addEventListener("click", function () {
    localStorage.setItem(KEY, "granted");
    if (typeof window.acceptAnalyticsConsent === "function") {
      window.acceptAnalyticsConsent();
    }
    hide();
  });

  document.getElementById("cookieReject")?.addEventListener("click", function () {
    localStorage.setItem(KEY, "denied");
    // оставляем denied как в default + отправим тех. событие
    window.gtag && gtag("consent", "update", { analytics_storage: "denied" });
    window.dataLayer && dataLayer.push({ event: "consent_denied" });
    hide();
  });

  document.getElementById("cookieMore")?.addEventListener("click", function () {
    window.open("/privacy.html", "_blank"); // сделаешь позже страницу политики
  });

  // Публичный метод для футера «Управлять куки»
  window.manageCookies = function () {
    localStorage.removeItem(KEY);
    show();
  };
})();

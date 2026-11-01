// Best-effort fingerprints for spotting installed apps in public HTML.
// `patterns` are matched (case-insensitively) against script, stylesheet and
// iframe URLs plus inline script text. `selectors` match widget markup.
// Apps that only load after user interaction or consent can be missed.

export const APP_CATEGORIES = [
  "reviews",
  "chat",
  "email",
  "search",
  "recommendations",
  "popup",
];

export const APP_FINGERPRINTS = [
  // Reviews
  {
    id: "judgeme",
    name: "Judge.me",
    categories: ["reviews"],
    patterns: ["judge.me", "judgeme"],
    selectors: [".jdgm-widget", ".jdgm-preview-badge"],
  },
  {
    id: "loox",
    name: "Loox",
    categories: ["reviews"],
    patterns: ["loox.io"],
    selectors: ["#looxReviews", ".loox-rating"],
  },
  {
    id: "yotpo",
    name: "Yotpo",
    categories: ["reviews"],
    patterns: ["yotpo"],
    selectors: [".yotpo-widget-instance", ".yotpo.bottomLine"],
  },
  {
    id: "okendo",
    name: "Okendo",
    categories: ["reviews"],
    // Not plain "okendo": Okendo also sells loyalty and quizzes.
    patterns: ["okendo-reviews", "reviews-widget-plus", "oke-reviews"],
    selectors: ["[data-oke-widget]", "[data-oke-reviews-widget]"],
  },
  {
    id: "stamped",
    name: "Stamped",
    categories: ["reviews"],
    patterns: ["stamped.io"],
    selectors: ["#stamped-main-widget", ".stamped-product-reviews-badge"],
  },
  {
    id: "junip",
    name: "Junip",
    categories: ["reviews"],
    patterns: ["junip"],
  },
  {
    id: "reviewsio",
    name: "REVIEWS.io",
    categories: ["reviews"],
    patterns: ["reviews.io", "reviewsio"],
  },

  // Chat / support
  {
    id: "gorgias",
    name: "Gorgias",
    categories: ["chat"],
    patterns: ["gorgias"],
    selectors: ["#gorgias-chat-container"],
  },
  {
    id: "tidio",
    name: "Tidio",
    categories: ["chat"],
    patterns: ["tidio"],
    selectors: ["#tidio-chat"],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    categories: ["chat"],
    patterns: ["zdassets.com", "zendesk"],
  },
  {
    id: "intercom",
    name: "Intercom",
    categories: ["chat"],
    patterns: ["intercom.io", "intercomcdn"],
  },
  {
    id: "shopify-inbox",
    name: "Shopify Inbox",
    categories: ["chat"],
    patterns: ["shopify-chat", "inbox-chat"],
    selectors: ["#shopify-chat", "inbox-online-store-chat"],
  },
  {
    id: "reamaze",
    name: "Re:amaze",
    categories: ["chat"],
    patterns: ["reamaze"],
  },
  {
    id: "livechat",
    name: "LiveChat",
    categories: ["chat"],
    patterns: ["livechatinc.com"],
  },

  // Email / SMS
  {
    id: "klaviyo",
    name: "Klaviyo",
    categories: ["email"],
    patterns: ["klaviyo"],
  },
  {
    id: "omnisend",
    name: "Omnisend",
    categories: ["email"],
    patterns: ["omnisend", "omnisrc"],
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    categories: ["email"],
    patterns: ["chimpstatic.com", "list-manage.com"],
  },
  {
    id: "privy",
    name: "Privy",
    categories: ["email", "popup"],
    patterns: ["privy.com", "privymktg"],
  },
  {
    id: "postscript",
    name: "Postscript",
    categories: ["email"],
    patterns: ["postscript.io"],
  },
  {
    id: "attentive",
    name: "Attentive",
    categories: ["email", "popup"],
    patterns: ["attn.tv", "attentivemobile"],
  },
  {
    id: "shopify-forms",
    name: "Shopify Forms",
    categories: ["email", "popup"],
    patterns: ["forms.shopifyapps.com", "shopify-forms"],
  },

  // Search
  {
    id: "searchanise",
    name: "Searchanise",
    categories: ["search"],
    patterns: ["searchanise"],
  },
  {
    id: "boost",
    name: "Boost AI Search & Filter",
    categories: ["search"],
    patterns: ["boostcommerce", "boost-pfs", "boost-sd", "bc-sf-filter"],
  },
  {
    id: "algolia",
    name: "Algolia",
    categories: ["search"],
    patterns: ["algolia"],
  },
  {
    id: "klevu",
    name: "Klevu",
    categories: ["search"],
    patterns: ["klevu"],
  },
  {
    id: "doofinder",
    name: "Doofinder",
    categories: ["search"],
    patterns: ["doofinder"],
  },
  {
    id: "searchspring",
    name: "Searchspring",
    categories: ["search"],
    patterns: ["searchspring"],
  },

  // Recommendations / upsell
  {
    id: "rebuy",
    name: "Rebuy",
    categories: ["recommendations"],
    patterns: ["rebuyengine"],
  },
  {
    id: "limespot",
    name: "LimeSpot",
    categories: ["recommendations"],
    patterns: ["limespot", "personalizer.io"],
  },
  {
    id: "wiser",
    name: "Wiser",
    categories: ["recommendations"],
    patterns: ["wiser-recommendations", "expertvillagemedia"],
  },
  {
    id: "frequently-bought-together",
    name: "Frequently Bought Together",
    categories: ["recommendations"],
    patterns: ["codeblackbelt", "frequently-bought-together"],
  },
  {
    id: "nosto",
    name: "Nosto",
    categories: ["recommendations", "search"],
    patterns: ["nosto.com", "nostojs"],
  },

  // Popups
  {
    id: "justuno",
    name: "Justuno",
    categories: ["popup"],
    patterns: ["justuno"],
  },
  {
    id: "optinmonster",
    name: "OptinMonster",
    categories: ["popup"],
    patterns: ["optinmonster", "omappapi"],
  },
  {
    id: "poptin",
    name: "Poptin",
    categories: ["popup"],
    patterns: ["poptin"],
  },
  {
    id: "wisepops",
    name: "Wisepops",
    categories: ["popup"],
    patterns: ["wisepops"],
  },
];

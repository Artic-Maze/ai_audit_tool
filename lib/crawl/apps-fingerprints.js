// Best-effort fingerprints for spotting installed apps in public HTML.
// `patterns` are matched (case-insensitively) against script, stylesheet and
// iframe URLs plus inline script text. `selectors` match widget markup.
// Apps that only load after user interaction or consent can be missed.
// Brands whose name is an everyday word (Gladly, Drift, Ada) are matched by
// domain only: inline scripts also carry product text.

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
  {
    id: "bazaarvoice",
    name: "Bazaarvoice",
    categories: ["reviews"],
    patterns: ["bazaarvoice"],
  },
  {
    id: "powerreviews",
    name: "PowerReviews",
    categories: ["reviews"],
    patterns: ["powerreviews"],
  },
  {
    id: "trustpilot",
    name: "Trustpilot",
    categories: ["reviews"],
    patterns: ["widget.trustpilot.com"],
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
  {
    id: "gladly",
    name: "Gladly",
    categories: ["chat"],
    patterns: ["gladly.com"],
  },
  {
    id: "kustomer",
    name: "Kustomer",
    categories: ["chat"],
    patterns: ["kustomerapp.com"],
  },
  {
    id: "ada",
    name: "Ada",
    categories: ["chat"],
    patterns: ["ada.support"],
  },
  {
    id: "drift",
    name: "Drift",
    categories: ["chat"],
    patterns: ["js.driftt.com"],
  },
  {
    id: "freshchat",
    name: "Freshchat",
    categories: ["chat"],
    patterns: ["freshchat"],
  },
  {
    id: "richpanel",
    name: "Richpanel",
    categories: ["chat"],
    patterns: ["richpanel"],
  },
  {
    id: "helpscout",
    name: "Help Scout",
    categories: ["chat"],
    patterns: ["helpscout.net"],
  },
  {
    id: "crisp",
    name: "Crisp",
    categories: ["chat"],
    patterns: ["client.crisp.chat"],
  },
  {
    id: "tawk",
    name: "Tawk.to",
    categories: ["chat"],
    patterns: ["embed.tawk.to"],
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
  {
    id: "yotpo-sms",
    name: "Yotpo SMS & Email",
    categories: ["email", "popup"],
    patterns: ["smsbump"],
  },
  {
    id: "listrak",
    name: "Listrak",
    categories: ["email"],
    patterns: ["listrak"],
  },
  {
    id: "bluecore",
    name: "Bluecore",
    categories: ["email"],
    patterns: ["bluecore"],
  },
  {
    id: "iterable",
    name: "Iterable",
    categories: ["email"],
    patterns: ["iterable.com"],
  },
  {
    id: "braze",
    name: "Braze",
    categories: ["email"],
    patterns: ["braze.com", "appboycdn"],
  },
  {
    id: "emarsys",
    name: "Emarsys",
    categories: ["email"],
    patterns: ["emarsys", "scarabresearch"],
  },
  {
    id: "sailthru",
    name: "Sailthru",
    categories: ["email"],
    patterns: ["sailthru"],
  },
  {
    id: "cordial",
    name: "Cordial",
    categories: ["email"],
    patterns: ["cordial.io", "cordial.com"],
  },
  {
    id: "dotdigital",
    name: "Dotdigital",
    categories: ["email"],
    patterns: ["dotdigital"],
  },
  {
    id: "drip",
    name: "Drip",
    categories: ["email"],
    patterns: ["getdrip.com"],
  },
  {
    id: "bloomreach-engagement",
    name: "Bloomreach Engagement",
    categories: ["email"],
    patterns: ["exponea"],
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
  {
    id: "constructor",
    name: "Constructor",
    categories: ["search", "recommendations"],
    patterns: ["cnstrc.com", "constructor.io"],
  },
  {
    id: "bloomreach",
    name: "Bloomreach Discovery",
    categories: ["search", "recommendations"],
    patterns: ["brcdn.com", "bloomreach"],
  },
  {
    id: "fast-simon",
    name: "Fast Simon",
    categories: ["search"],
    patterns: ["fastsimon", "instantsearchplus"],
  },
  {
    id: "findify",
    name: "Findify",
    categories: ["search"],
    patterns: ["findify"],
  },
  {
    id: "coveo",
    name: "Coveo",
    categories: ["search"],
    patterns: ["coveo"],
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
  {
    id: "dynamic-yield",
    name: "Dynamic Yield",
    categories: ["recommendations"],
    patterns: ["dynamicyield"],
  },
  {
    id: "clerk",
    name: "Clerk.io",
    categories: ["search", "recommendations"],
    patterns: ["clerk.io"],
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

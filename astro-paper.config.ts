import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://sonhmai.github.io/",
    title: "Son's blog",
    description: "Notes on software, databases, and distributed systems.",
    author: "Sonny",
    profile: "https://github.com/sonhmai",
    ogImage: "social-card.png",
    lang: "en",
    timezone: "Asia/Ho_Chi_Minh",
  },
  posts: { perPage: 20, perIndex: 8 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: false,
    showBackButton: false,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [{ name: "github", url: "https://github.com/sonhmai" }],
  shareLinks: [],
});

import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "EVspark",
  version: packageJson.version,
  copyright: `© ${currentYear}, EVspark.`,
  meta: {
    title: "EVspark — AI-Powered EV Charging Network & Digital Twin",
    description:
      "Real-time AI wait time predictions, smart routing, and digital twin simulation across Maharashtra's EV charging stations.",
  },
};

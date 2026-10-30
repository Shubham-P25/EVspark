export const clerkAppearance = {
  variables: {
    colorPrimary: "#c2410c", colorText: "#17181b", colorBackground: "transparent",
    colorInputBackground: "#ffffff", colorInputText: "#17181b", borderRadius: "14px",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none", border: "none", background: "transparent" },
    card: { boxShadow: "none", border: "none", background: "transparent", padding: 0, gap: 18 },
    headerTitle: { fontSize: 30, fontWeight: 600, letterSpacing: "-0.04em" },
    headerSubtitle: { color: "#4a4c52" },
    formButtonPrimary: { height: 48, borderRadius: 999, background: "#c2410c", textTransform: "none", fontWeight: 600, fontSize: 14, boxShadow: "0 10px 22px -10px rgba(194,65,12,.8)" },
    formFieldInput: { height: 48, borderRadius: 999, padding: "0 18px", border: "1px solid rgba(23,24,27,.15)" },
    socialButtonsBlockButton: { height: 48, borderRadius: 999, border: "1px solid rgba(23,24,27,.15)" },
    footerAction: { display: "none" },
  },
} as const;


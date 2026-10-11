import type { Metadata } from "next";
import "./styles.css";
import "./premium.css";
import "./marketplace.css";
import "./admin.css";
import "./admin-overrides.css";

export const metadata: Metadata = {
  title: { default: "Tulia Wellness | Mombasa Massage", template: "%s | Tulia Wellness" },
  description: "Book trusted massage at our Nyali studio, your home, or hotel in Mombasa.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import Link from "next/link";
import { Icons } from "@/components/global/icons";
import { Zap, Mail, MapPin } from "lucide-react";

const FOOTER_LINKS = {
  product: [
    { label: "Explore", href: "/explore" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Submit App", href: "/submit" },
    { label: "Documentation", href: "/docs" },
  ],
  company: [
    { label: "About", href: "/#about" },
    { label: "Blog", href: "/#blog" },
    { label: "Careers", href: "/#careers" },
    { label: "Contact", href: "/#contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/#privacy" },
    { label: "Terms of Service", href: "/#terms" },
    { label: "Cookie Policy", href: "/#cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 md:px-6">

        {/* Main Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 md:py-16">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display text-xl font-bold tracking-tighter">
                Cast<span className="text-primary">Kit</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              Stripe + Firebase for Web3 social apps. Build, deploy, earn.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mr-1" />
              v0.1.0 — Public Alpha
            </div>

            {/* Socials */}
            <div className="flex items-center gap-3 mt-2">
              {[
                { Icon: Icons.gitHub, href: "https://github.com", label: "GitHub", hoverColor: "hover:text-foreground" },
                { Icon: Icons.twitter, href: "https://twitter.com", label: "Twitter", hoverColor: "hover:text-secondary" },
                { Icon: Icons.discord, href: "https://discord.com", label: "Discord", hoverColor: "hover:text-accent" },
              ].map(({ Icon, href, label, hoverColor }) => (
                <Link
                  key={label}
                  href={href}
                  className={`text-muted-foreground ${hoverColor} transition-colors duration-200 p-1.5 rounded-lg hover:bg-white/5`}
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Product
            </h4>
            <ul className="flex flex-col gap-2.5">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Company
            </h4>
            <ul className="flex flex-col gap-2.5">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Contact
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:hello@castkit.dev"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
                >
                  <Mail className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                  hello@castkit.dev
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                  San Francisco, CA
                </span>
              </li>
            </ul>
            <ul className="flex flex-col gap-2 mt-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t border-border/30 gap-3 text-xs text-muted-foreground font-mono">
          <span>© 2026 CastKit. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Built with
            <span className="text-primary">♥</span>
            for Web3 developers
          </span>
        </div>

      </div>
    </footer>
  );
}

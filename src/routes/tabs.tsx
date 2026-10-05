import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  Compass,
  Clock3,
  Map as MapIcon,
  GraduationCap,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tabs")({
  component: TabsLayout,
});

const TABS = [
  { to: "/tabs/descubrir", label: "Descubrir", icon: Compass },
  { to: "/tabs/cronologia", label: "Cronología", icon: Clock3 },
  { to: "/tabs/mapas", label: "Mapas", icon: MapIcon },
  { to: "/tabs/aprende", label: "Aprende", icon: GraduationCap },
  { to: "/tabs/perfil", label: "Perfil", icon: User },
] as const;

/** App shell: five-tab bottom navigation (spec §4). */
function TabsLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-ink">
      <main className="flex-1">
        <Outlet />
      </main>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-parchment/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-2xl">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                activeOptions={{ exact: false }}
                activeProps={{
                  className: "text-terracotta",
                  "aria-current": "page",
                }}
                className={cn(
                  "tap-target flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-ink/55 transition-colors hover:text-ink",
                )}
              >
                <tab.icon className="h-6 w-6" aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

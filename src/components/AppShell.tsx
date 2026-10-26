import { Link, NavLink, Outlet } from "react-router";

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? "bg-paper text-ink" : "text-mute hover:text-ink"}`;

export function AppShell() {
    return (
        <div className="flex h-full flex-col">
            <nav className="flex items-center gap-4 border-b border-line bg-white px-4 py-2" aria-label="Main">
                <Link to="/" className="mr-2 text-lg font-bold tracking-right">FlowBoard</Link>
                <NavLink to="/" end className={linkCls}>Dashboard</NavLink>
                <NavLink to="/executions" className={linkCls}>Executions</NavLink>
            </nav>
            <main className="min-h-0 flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}
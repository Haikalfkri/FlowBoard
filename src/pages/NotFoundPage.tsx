import { Link } from "react-router";

export default function NotFoundPage({ title = "Page not found", message = "This address doesn't match anything in FlowBoard." }) {
    return (
        <div className="mx-auto max-w-md p-8 text-center">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-mute">{message}</p>
            <Link to="/" className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
                Back to dashboard
            </Link>
        </div>
    )
}
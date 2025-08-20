"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, HeartHandshake, Lightbulb, Rocket } from "lucide-react";
import '../styles/globals.css';

// --- DATA ---
type Feature = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
};

const features: Feature[] = [
    {
        id: "mission",
        title: "Mission-Driven",
        description: "I care deeply about building humane, accessible interfaces. This project explores intuitive communication with delightful UX.",
        icon: <HeartHandshake className="h-7 w-7" />,
    },
    {
        id: "craft",
        title: "Craft & Clarity",
        description: "I love crisp UI, thoughtful details, and performance-minded code. Modern animations, minimal cognitive load.",
        icon: <Lightbulb className="h-7 w-7" />,
    },
    {
        id: "momentum",
        title: "Momentum",
        description: "Shipping is a muscle. I iterate fast, validate early, and keep moving. Energy in, momentum out.",
        icon: <Rocket className="h-7 w-7" />,
    },
    {
        id: "spark",
        title: "A Little Spark",
        description: "Playfulness matters. Smooth micro-interactions and subtle depth bring interfaces to life.",
        icon: <Sparkles className="h-7 w-7" />,
    },
];

// --- CUSTOM HOOKS ---

/**
 * Custom hook to detect when an element is intersecting the viewport.
 */
function useIntersection<T extends HTMLElement>(options?: IntersectionObserverInit) {
    const ref = useRef<T | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // The observer now directly uses the first entry, as we're only observing one element.
        const observer = new IntersectionObserver(
            ([entry]) => setIsIntersecting(entry.isIntersecting),
            options
        );

        observer.observe(element);
        return () => observer.unobserve(element);
    }, [options]); // Dependency on options object

    return { ref, isIntersecting } as const;
}

/**
 * Custom hook to efficiently track scroll position for parallax effects.
 */
function useParallax() {
    const [scrollY, setScrollY] = useState(0);
    const ticking = useRef(false);

    const onScroll = useCallback(() => {
        if (!ticking.current) {
            window.requestAnimationFrame(() => {
                setScrollY(window.scrollY);
                ticking.current = false;
            });
            ticking.current = true;
        }
    }, []);

    useEffect(() => {
        window.addEventListener("scroll", onScroll, { passive: true });
        // Initial call to set position
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [onScroll]);

    return scrollY;
}


// --- UI COMPONENTS ---

function RevealCard({ feature, index }: { feature: Feature; index: number }) {
    // FIX: Memoize the options object to prevent the IntersectionObserver
    // from being re-created on every render.
    const intersectionOptions = useMemo(() => ({ threshold: 0.4 }), []);
    const { ref, isIntersecting } = useIntersection<HTMLDivElement>(intersectionOptions);

    return (
        <section className="relative flex min-h-screen items-center justify-center">
            <div ref={ref} className="relative w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-12">
                <div
                    className={
                        "relative mx-auto rounded-3xl border border-slate-200/50 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl p-10 sm:p-12 md:p-14 transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] " +
                        (isIntersecting ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.98]")
                    }
                    style={{ boxShadow: "0 20px 70px -20px rgba(15, 23, 42, 0.45), inset 0 1px 0 0 rgba(255,255,255,.06)" }}
                >
                    <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-teal-400/25 via-blue-500/15 to-indigo-500/25 blur-3xl -z-10" />
                    <div className="flex items-center gap-4 text-teal-600 dark:text-teal-400">
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/30">
                            {feature.icon}
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">{feature.title}</h3>
                    </div>
                    <p className="mt-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg sm:text-xl">
                        {feature.description}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                        <span className="px-3 py-1 text-xs uppercase tracking-wider rounded-full bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 ring-1 ring-slate-900/10 dark:ring-white/10">
                            #{index + 1}
                        </span>
                        <span className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-teal-500/10 to-blue-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/20">
                            parallax-pop
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

function GetInTouchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, message }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to send message.");
            }
            setStatus({ ok: true, msg: "Thanks! I'll get back to you soon." });
            setName("");
            setEmail("");
            setMessage("");
        } catch (err) {
            // FIX: Simplified and safer error message handling.
            const message = err instanceof Error ? err.message : "An unexpected error occurred.";
            setStatus({ ok: false, msg: message });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-xl rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl p-8 sm:p-10">
                <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-teal-400/20 via-blue-500/10 to-indigo-500/20 blur-2xl -z-10" />
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Get in touch</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Fill the form and it will be saved directly to a CSV.</p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                    {/* FIX: Added `htmlFor` and `id` for accessibility. */}
                    <div>
                        <label htmlFor="contact-name" className="block text-sm mb-1">Name</label>
                        <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-950/40 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label htmlFor="contact-email" className="block text-sm mb-1">Email</label>
                        <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-950/40 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label htmlFor="contact-message" className="block text-sm mb-1">Message</label>
                        <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-950/40 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    {status && (
                        <div className={"text-sm " + (status.ok ? "text-teal-600" : "text-rose-500")}>{status.msg}</div>
                    )}
                    <div className="mt-4 flex items-center justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 ring-1 ring-slate-300/60 dark:ring-slate-700/60 hover:bg-slate-100/40 dark:hover:bg-slate-800/40">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 rounded-xl text-white bg-teal-600 hover:bg-teal-700 transition-colors">Send</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---

export default function AboutPage() {
    const scrollY = useParallax();
    const [showContact, setShowContact] = useState(false);

    const layers = useMemo(() => ({
        stars: { transform: `translateY(${scrollY * 0.15}px)` },
        nebula: { transform: `translateY(${scrollY * 0.25}px) scale(1.05)` },
        planet: { transform: `translateY(${scrollY * 0.4}px)` },
    }), [scrollY]);

    return (
        <div className="relative overflow-x-hidden bg-slate-900 text-white font-sans">
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute inset-0" style={layers.stars}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.07),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.05),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.06),transparent_30%)]" />
                </div>
                <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 h-[65vh] w-[90vw] rounded-full blur-3xl" style={layers.nebula}>
                    <div className="h-full w-full bg-gradient-to-r from-teal-400/25 via-blue-500/15 to-indigo-500/25" />
                </div>
                <div className="absolute bottom-[-10%] right-[-8%] h-[55vh] w-[55vh] rounded-full bg-gradient-to-tr from-fuchsia-500/10 to-violet-500/20 blur-2xl shadow-[inset_0_0_60px_rgba(255,255,255,0.05)]" style={layers.planet} />
            </div>

            <header className="relative flex min-h-[85vh] flex-col items-center justify-center text-center px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,.08),transparent_40%)]" />
                <div className="relative">
                    <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/40 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 backdrop-blur-md">
                        <Sparkles className="h-4 w-4 text-teal-500" />
                        About Me
                    </div>
                    <h1 className="relative max-w-4xl text-balance text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white">
                        Giving a Voice to the Voiceless
                    </h1>
                    <p className="mt-10 max-w-3xl mx-auto text-xl sm:text-2xl text-slate-600 dark:text-slate-300">
                        I am SoulSpeak. I listen when words can’t be spoken. 
                        I read the smallest nod, sense concern, and turn it into a voice that can ask, 
                        answer, and call for help. I’m built to bridge silence and connection — with care, empathy, and the power of AI.
                        Every pixel, every nod, brings us closer to restoring connection, dignity, and independence
                    </p>
                </div>
            </header>

            <main>
                {features.map((feature, idx) => (
                    <RevealCard key={feature.id} feature={feature} index={idx} />
                ))}
            </main>

            <section className="relative py-24">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <div className="relative rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl p-12 shadow-2xl">
                        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-teal-400/20 via-blue-500/10 to-indigo-500/20 blur-2xl -z-10" />
                        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">Let’s build something great</h2>
                        <p className="mt-4 text-slate-600 dark:text-slate-300">
                            Drop a message. It saves directly to a CSV on the server.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3 justify-center">
                            <button onClick={() => setShowContact(true)} className="px-6 py-3 rounded-2xl text-white bg-teal-600 hover:bg-teal-700 transition-all">
                                Get in touch
                            </button>
                            <Link href="/" className="px-6 py-3 rounded-2xl text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30 hover:bg-teal-500/10 transition-all">Back to Home</Link>
                        </div>
                    </div>
                </div>
            </section>

            <GetInTouchModal isOpen={showContact} onClose={() => setShowContact(false)} />
        </div>
    );
}
"use client";
import {
  Pencil,
  Users,
  Zap,
  Download,
  Lock,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/authToken";

function App() {
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    router.replace(token ? "/rooms" : "/signin");
  }, [router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setIsDark(savedTheme === "dark" || (!savedTheme && prefersDark));
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil
              className="w-7 h-7 text-slate-800 dark:text-slate-200"
              strokeWidth={2.5}
            />
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Excalidraw
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium"
            >
              How it works
            </a>
            <a
              href="#about"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium"
            >
              About
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-slate-400 dark:text-slate-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>
            <button
              onClick={() => {
                router.push("/signin");
              }}
              className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-all hover:shadow-lg font-medium"
            >
              Signin
            </button>
            <button
              onClick={() => {
                router.push("/signup");
              }}
              className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-all hover:shadow-lg font-medium"
            >
              Signup
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <section className="max-w-7xl mx-auto px-6 text-center mb-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Virtual whiteboard for sketching hand-drawn diagrams
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight">
            Sketch your ideas,
            <br />
            <span className="bg-gradient-to-r from-slate-600 to-slate-900 dark:from-slate-400 dark:to-slate-200 bg-clip-text text-transparent">
              share your vision
            </span>
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            A minimalist, open-source virtual whiteboard for creating beautiful
            hand-drawn style diagrams. Collaborate in real-time with your team.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all hover:shadow-2xl hover:-translate-y-0.5 font-semibold text-lg">
              Launch App
            </button>
            <button className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:shadow-lg font-semibold text-lg">
              View Examples
            </button>
          </div>

          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-transparent to-transparent z-10"></div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-5xl mx-auto">
              <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                <Pencil
                  className="w-24 h-24 text-slate-300 dark:text-slate-600"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-7xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Powerful features wrapped in a simple, intuitive interface
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Real-time Collaboration
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Work together seamlessly with your team. See changes instantly
                as others draw and edit.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Lightning Fast
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Optimized performance ensures smooth drawing experience even
                with complex diagrams.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Privacy First
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Your data stays yours. End-to-end encryption keeps your diagrams
                secure and private.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                <Download className="w-7 h-7 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Export Anywhere
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Export to PNG, SVG, or clipboard. Share your work in any format
                you need.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                <Pencil className="w-7 h-7 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Hand-drawn Style
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Beautiful sketchy aesthetic makes your diagrams feel personal
                and approachable.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                No Learning Curve
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Intuitive interface means you can start creating immediately. No
                tutorials needed.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="max-w-5xl mx-auto px-6 mb-32">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 rounded-3xl p-12 md:p-16 text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start in seconds
            </h2>
            <p className="text-xl text-slate-300 dark:text-slate-400 mb-12 leading-relaxed">
              No sign-up required. Just open and start drawing.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-start">
                <div className="w-12 h-12 bg-white/10 dark:bg-white/5 rounded-lg flex items-center justify-center mb-4 font-bold text-2xl">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">Open the app</h3>
                <p className="text-slate-300 dark:text-slate-400">
                  Click to launch and you&apos;re ready to go
                </p>
              </div>

              <div className="flex flex-col items-start">
                <div className="w-12 h-12 bg-white/10 dark:bg-white/5 rounded-lg flex items-center justify-center mb-4 font-bold text-2xl">
                  2
                </div>
                <h3 className="text-xl font-bold mb-2">Start sketching</h3>
                <p className="text-slate-300 dark:text-slate-400">
                  Use simple tools to create your diagram
                </p>
              </div>

              <div className="flex flex-col items-start">
                <div className="w-12 h-12 bg-white/10 dark:bg-white/5 rounded-lg flex items-center justify-center mb-4 font-bold text-2xl">
                  3
                </div>
                <h3 className="text-xl font-bold mb-2">Share your work</h3>
                <p className="text-slate-300 dark:text-slate-400">
                  Export or invite others to collaborate
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Open source & free forever
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
            Built with love by the community, for the community. Join thousands
            of users creating beautiful diagrams every day.
          </p>
          <button className="px-8 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all hover:shadow-2xl hover:-translate-y-0.5 font-semibold text-lg">
            Get Started Now
          </button>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 mt-32">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Pencil className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Excalidraw
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              © 2025 Excalidraw Clone. Open source and free to use.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                GitHub
              </a>
              <a
                href="#"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Twitter
              </a>
              <a
                href="#"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

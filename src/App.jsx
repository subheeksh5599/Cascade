import { useState, useEffect } from "react";
import About from "./components/About";
import Hero from "./components/Hero";
import NavBar from "./components/Navbar";
import Features from "./components/Features";
import Story from "./components/Story";
import Contact from "./components/Contact";
import { EditorPage } from "./editor/EditorPage";

function App() {
  const [page, setPage] = useState(() => window.location.hash === "#editor" ? "editor" : "home");

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === "#editor" ? "editor" : "home");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (page === "editor") return <EditorPage />;

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden">
      <NavBar />
      <Hero />
      <About />
      <Features />
      <Story />
      <Contact />
    </main>
  );
}

export default App;

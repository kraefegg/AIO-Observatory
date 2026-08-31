import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Services } from './components/sections/Services';
import { Maritime } from './components/sections/Maritime';
import { Energy } from './components/sections/Energy';
import { AiTech } from './components/sections/AiTech';
import { EmbeddedIoT } from './components/sections/EmbeddedIoT';
import { Platforms } from './components/sections/Platforms';
import { Projects } from './components/sections/Projects';
import { Cases } from './components/sections/Cases';
import { Feasibility } from './components/sections/Feasibility';
import { Rnd } from './components/sections/Rnd';
import { Founder } from './components/sections/Founder';
import { Contact } from './components/sections/Contact';

function App() {
  return (
    <div className="min-h-screen bg-graphite-950">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Maritime />
        <Energy />
        <AiTech />
        <EmbeddedIoT />
        <Projects />
        <Cases />
        <Platforms />
        <Feasibility />
        <Rnd />
        <Founder />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;

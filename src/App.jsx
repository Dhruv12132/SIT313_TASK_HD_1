import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./Navbar";
import Banner from "./Banner";
import About from "./About";
import Projects from "./Projects";
import Gallery from "./Gallery";
import Contact from "./Contact";

import Articles from "./Articles";
import Tutorials from "./Tutorials";
import Footer from "./route/Footer";

import Login from "./route/Login";
import Signup from "./route/Signup";
 
import Post from "./route/Post";
import BrowsePosts from "./route/BrowsePosts";
import Subscribe from "./Subscribe";
import Pricing from "./Pricing";
function Home() {
  return (
    <>
      <Banner />
      <About />
      <Projects />
      <Gallery />
      <Contact />
      <Articles />
      <Tutorials />
      <Subscribe />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/post" element={<Post />} />
        <Route path="/browse-posts" element={<BrowsePosts />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;

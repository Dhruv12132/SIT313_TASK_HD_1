
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./AuthContext";

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

import AdminDashboard from "./route/AdminDashboard";
import ManagePosts from "./route/ManagePosts";
import ManageUsers from "./route/ManageUsers";

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
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/post" element={<Post />} />
          <Route path="/browse-posts" element={<BrowsePosts />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/posts" element={<ManagePosts />} />
          <Route path="/admin/users" element={<ManageUsers />} />
        </Routes>

        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

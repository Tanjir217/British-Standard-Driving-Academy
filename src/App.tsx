import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, Routes, Route } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { Home } from "./pages/Home";
import { Booking } from "./pages/Booking";
import { Packages } from "./pages/Packages";
import { Lessons } from "./pages/Lessons";
import { Instructors } from "./pages/Instructors";
import { InstructorDetail } from "./pages/InstructorDetail";
import { Portal } from "./pages/Portal";
import { Login } from "./pages/Login";
import { AuthCallback } from "./pages/AuthCallback";
import { FAQ } from "./pages/FAQ";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { JoinOurTeam } from "./pages/JoinOurTeam";
import { NotFound } from "./pages/NotFound";
import { AdminGate } from "./pages/AdminGate";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminLogin } from "./pages/AdminLogin";
import "./styles.css";

function Scroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { pathname, search } = useLocation();
  const query = new URLSearchParams(search);
  const wixAdminRoute = pathname === "/" ? query.get("bsdaAdmin") : null;
  const isAuthRoute = pathname === "/login" || pathname === "/auth/callback";
  const isAdminRoute = pathname.startsWith("/admin");

  // Wix static hosting has no SPA fallback for clean deep links. The server
  // redirects /admin URLs to /?bsdaAdmin=..., which loads this same app entry.
  if (wixAdminRoute === "login") return <AdminLogin />;
  if (wixAdminRoute === "dashboard") return <AdminGate />;

  // Keep direct/local admin routes working and enforce the same admin gate.
  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminGate />} />
      </Routes>
    );
  }

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    );
  }

  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route
          path="/instructors/:instructorId"
          element={<InstructorDetail />}
        />
        <Route path="/portal" element={<Portal />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/join-our-team" element={<JoinOurTeam />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SiteLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Scroll />
      <AppRoutes />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

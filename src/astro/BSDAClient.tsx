import { StrictMode, useEffect } from "react";
import { BrowserRouter, useLocation, Routes, Route } from "react-router-dom";
import { SiteLayout } from "../components/SiteLayout";
import { Home } from "../pages/Home";
import { Booking } from "../pages/Booking";
import { Packages } from "../pages/Packages";
import { Lessons } from "../pages/Lessons";
import { Instructors } from "../pages/Instructors";
import { InstructorDetail } from "../pages/InstructorDetail";
import { Portal } from "../pages/Portal";
import { Login } from "../pages/Login";
import { AuthCallback } from "../pages/AuthCallback";
import { FAQ } from "../pages/FAQ";
import { NotFound } from "../pages/NotFound";
import { AdminDashboard } from "../pages/AdminDashboard";
import "../styles.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const isAuthRoute = pathname === "/login" || pathname === "/auth/callback";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
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
        <Route path="/instructors/:instructorId" element={<InstructorDetail />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SiteLayout>
  );
}

/**
 * Client-rendered bridge for the existing React Router application.
 * Keeping this component isolated lets the Astro migration proceed without
 * rewriting every interactive page before the Wix runtime is validated.
 */
export function BSDAClient() {
  return (
    <StrictMode>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </StrictMode>
  );
}

import React, { useEffect } from "react";
import "./landing/tokens.css";

import LandingHeader from "../components/landing/LandingHeader";
import HeroSection from "../components/landing/HeroSection";
import FeaturesStrip from "../components/landing/FeaturesStrip";
import HowItWorks from "../components/landing/HowItWorks";
import ProductShowcase from "../components/landing/ProductShowcase";
import BenefitsSection from "../components/landing/BenefitsSection";
import TestimonialSection from "../components/landing/TestimonialSection";
import PricingSection from "../components/landing/PricingSection";
import FAQSection from "../components/landing/FAQSection";
import FinalCTA from "../components/landing/FinalCTA";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#0A2A20";
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  return (
    <div className="landing-scope">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesStrip />
        <HowItWorks />
        <ProductShowcase />
        <BenefitsSection />
        <TestimonialSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

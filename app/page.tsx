import HeroSection from "@/components/home/HeroSection";
import ScrollStorytelling from "@/components/home/ScrollStorytelling";
import FeaturedServices from "@/components/home/FeaturedServices";

export default function HomePage() {
  return (
    <div className="space-y-0">
      <HeroSection />
      <ScrollStorytelling />
      <FeaturedServices />
    </div>
  );
}
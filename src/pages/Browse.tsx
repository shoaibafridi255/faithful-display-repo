import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeaturedListings from "@/components/FeaturedListings";
import { useSearchParams } from "react-router-dom";

const Browse = () => {
  const [params] = useSearchParams();
  const q = params.get("q");
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <section className="container mx-auto px-4 py-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Browse <span className="text-gradient-eco">Materials</span>
          </h1>
          <p className="text-muted-foreground">
            {q ? `Showing results for "${q}"` : "Discover available industrial byproducts from local businesses."}
          </p>
        </section>
        <FeaturedListings />
      </main>
      <Footer />
    </div>
  );
};

export default Browse;
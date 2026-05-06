import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/store/cart";
import { products } from "@/data/catalog";

const Wishlist = () => {
  const { wishlist } = useCart();
  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <Layout>
      <div className="container-x py-12">
        <h1 className="font-display text-4xl uppercase sm:text-5xl">Wishlist</h1>
        {items.length === 0 ? (
          <div className="mt-12 rounded-lg border bg-secondary/40 py-20 text-center">
            <Heart className="mx-auto text-muted-foreground" size={40} />
            <p className="mt-4 font-display text-2xl uppercase">No favorites yet</p>
            <p className="mt-1 text-muted-foreground">Tap the heart on any product to save it here.</p>
            <Button variant="accent" className="mt-6" asChild><Link to="/">Browse products</Link></Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;

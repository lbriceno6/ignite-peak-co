import protein from "@/assets/product-protein.jpg";
import creatine from "@/assets/product-creatine.jpg";
import preworkout from "@/assets/product-preworkout.jpg";
import vitamins from "@/assets/product-vitamins.jpg";
import snack from "@/assets/product-snack.jpg";
import shaker from "@/assets/product-shaker.jpg";
import bcaa from "@/assets/product-bcaa.jpg";

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortBenefit: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  label?: "Best Seller" | "New" | "Offer";
  image: string;
  category: string;
  goal: string[];
  flavors?: string[];
  sizes?: string[];
  brand: string;
  subscriptionEnabled?: boolean;
  subscriptionDiscountPercent?: number;
  subscriptionIntervals?: number[]; // days
  supplier?: { slug: string; business_name: string; logo_url?: string | null } | null;
};

export const products: Product[] = [
  {
    id: "1", slug: "iso-whey-elite", name: "Iso Whey Elite", shortBenefit: "27g protein per serving · ultra-fast absorption",
    price: 49.9, oldPrice: 64.9, rating: 4.9, reviews: 1284, label: "Best Seller",
    image: protein, category: "Protein", goal: ["build-muscle", "recovery"],
    flavors: ["Chocolate", "Vanilla", "Cookies & Cream", "Strawberry"], sizes: ["900g", "2kg", "4kg"], brand: "VOLTRA",
    subscriptionEnabled: true, subscriptionDiscountPercent: 15, subscriptionIntervals: [30, 60, 90],
  },
  {
    id: "2", slug: "creatine-monohydrate", name: "Creatine Monohydrate", shortBenefit: "Pure micronized · explosive strength",
    price: 24.9, rating: 4.8, reviews: 932, label: "Best Seller",
    image: creatine, category: "Creatine", goal: ["build-muscle", "energy"],
    sizes: ["300g", "500g", "1kg"], brand: "VOLTRA",
    subscriptionEnabled: true, subscriptionDiscountPercent: 10, subscriptionIntervals: [30, 60, 90],
  },
  {
    id: "3", slug: "ignite-pre-workout", name: "Ignite Pre-Workout", shortBenefit: "300mg caffeine · zero crash formula",
    price: 39.9, oldPrice: 49.9, rating: 4.7, reviews: 612, label: "Offer",
    image: preworkout, category: "Pre-Workout", goal: ["energy"],
    flavors: ["Tropical Storm", "Blue Raspberry", "Watermelon"], sizes: ["300g"], brand: "VOLTRA",
  },
  {
    id: "4", slug: "daily-multi-vitamin", name: "Daily Multi Complex", shortBenefit: "26 essential nutrients · immune support",
    price: 19.9, rating: 4.6, reviews: 421, label: "New",
    image: vitamins, category: "Vitamins", goal: ["wellness"],
    sizes: ["60 caps", "120 caps"], brand: "VOLTRA",
    subscriptionEnabled: true, subscriptionDiscountPercent: 12, subscriptionIntervals: [30, 60, 90],
  },
  {
    id: "5", slug: "protein-bar-crunch", name: "Protein Bar Crunch", shortBenefit: "20g protein · only 2g sugar",
    price: 2.9, rating: 4.5, reviews: 287,
    image: snack, category: "Snacks", goal: ["lose-fat", "build-muscle"],
    flavors: ["Choc Brownie", "Salted Caramel", "Peanut Butter"], brand: "VOLTRA",
  },
  {
    id: "6", slug: "pro-shaker-700", name: "Pro Shaker 700ml", shortBenefit: "Leak-proof · BPA-free",
    price: 9.9, oldPrice: 14.9, rating: 4.8, reviews: 1530, label: "Offer",
    image: shaker, category: "Accessories", goal: [],
    brand: "VOLTRA",
  },
  {
    id: "7", slug: "bcaa-recovery", name: "BCAA Recovery 2:1:1", shortBenefit: "Faster recovery · less muscle soreness",
    price: 29.9, rating: 4.7, reviews: 498,
    image: bcaa, category: "Amino Acids", goal: ["recovery"],
    flavors: ["Lemon Ice", "Berry Blast"], sizes: ["400g"], brand: "VOLTRA",
  },
  {
    id: "8", slug: "vegan-protein", name: "Vegan Protein Blend", shortBenefit: "Plant-based · 24g protein",
    price: 44.9, rating: 4.6, reviews: 312, label: "New",
    image: protein, category: "Protein", goal: ["build-muscle", "wellness"],
    flavors: ["Cocoa", "Vanilla"], sizes: ["750g"], brand: "VOLTRA",
  },
];

export const categories = [
  { slug: "protein", name: "Protein", icon: "🥤" },
  { slug: "creatine", name: "Creatine", icon: "⚡" },
  { slug: "pre-workout", name: "Pre-Workout", icon: "🔥" },
  { slug: "vitamins", name: "Vitamins", icon: "💊" },
  { slug: "snacks", name: "Healthy Snacks", icon: "🍫" },
  { slug: "functional", name: "Functional Food", icon: "🥣" },
  { slug: "accessories", name: "Accessories", icon: "🎽" },
];

export const goals = [
  { slug: "build-muscle", name: "Build Muscle", desc: "High-protein essentials" },
  { slug: "lose-fat", name: "Lose Fat", desc: "Lean & cutting formulas" },
  { slug: "energy", name: "More Energy", desc: "Pre-workouts & boosters" },
  { slug: "recovery", name: "Better Recovery", desc: "BCAAs, glutamine, sleep" },
  { slug: "wellness", name: "Daily Wellness", desc: "Vitamins & immunity" },
];

export const reviews = [
  { name: "Marcus T.", rating: 5, title: "Game changer", text: "Iso Whey Elite mixes perfectly and tastes incredible. My recovery has never been better.", verified: true },
  { name: "Sarah K.", rating: 5, title: "Pure quality", text: "I've tried many brands — this one is the most transparent and effective. Shipping was super fast.", verified: true },
  { name: "David R.", rating: 5, title: "Insane pumps", text: "Ignite Pre-Workout gives me focused energy without any jitters. New PR every week.", verified: true },
  { name: "Lena M.", rating: 4, title: "Great taste", text: "Vegan protein that actually tastes good. Finally!", verified: true },
];

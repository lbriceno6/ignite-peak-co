import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index.tsx";
import Category from "./pages/Category.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";
import About from "./pages/About.tsx";
import Blog from "./pages/Blog.tsx";
import Contact from "./pages/Contact.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Search from "./pages/Search.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import MyProfile from "./pages/MyProfile.tsx";
import MyOrders from "./pages/MyOrders.tsx";
import OrderDetail from "./pages/OrderDetail.tsx";
import MySubscriptions from "./pages/MySubscriptions.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import ProductForm from "./pages/admin/ProductForm.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail.tsx";
import AdminCustomers from "./pages/admin/AdminCustomers.tsx";
import AdminBlog from "./pages/admin/AdminBlog.tsx";
import BlogForm from "./pages/admin/BlogForm.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminHome from "./pages/admin/AdminHome.tsx";
import AdminHeroSlides from "./pages/admin/AdminHeroSlides.tsx";
import AdminHomeBlocks from "./pages/admin/AdminHomeBlocks.tsx";
import AdminGoalCards from "./pages/admin/AdminGoalCards.tsx";
import AdminNavigation from "./pages/admin/AdminNavigation.tsx";
import AdminFooter from "./pages/admin/AdminFooter.tsx";
import AdminSiteLinks from "./pages/admin/AdminSiteLinks.tsx";
import AdminContact from "./pages/admin/AdminContact.tsx";
import AdminAbout from "./pages/admin/AdminAbout.tsx";
import AdminSuppliers from "./pages/admin/AdminSuppliers.tsx";
import AdminPayments from "./pages/admin/AdminPayments.tsx";
import AdminTestimonials from "./pages/admin/AdminTestimonials.tsx";
import AdminShipping from "./pages/admin/AdminShipping.tsx";
import AdminSubscription from "./pages/admin/AdminSubscription.tsx";
import Shipping from "./pages/policies/Shipping.tsx";
import Returns from "./pages/policies/Returns.tsx";
import Terms from "./pages/policies/Terms.tsx";
import Privacy from "./pages/policies/Privacy.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/categoria/:slug" element={<Category />} />
            <Route path="/categorias/:slug" element={<Category />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/producto/:slug" element={<ProductDetail />} />
            <Route path="/productos/:slug" element={<ProductDetail />} />
            <Route path="/products" element={<Search />} />
            <Route path="/productos" element={<Search />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/carrito" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pagar" element={<Checkout />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/favoritos" element={<Wishlist />} />
            <Route path="/search" element={<Search />} />
            <Route path="/buscar" element={<Search />} />
            <Route path="/about" element={<About />} />
            <Route path="/sobre-nosotros" element={<About />} />
            <Route path="/nosotros" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/contactanos" element={<Contact />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/my-orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/my-subscriptions" element={<ProtectedRoute><MySubscriptions /></ProtectedRoute>} />

            <Route path="/shipping-policies" element={<Shipping />} />
            <Route path="/returns-policies" element={<Returns />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id/edit" element={<ProductForm />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="blog/new" element={<BlogForm />} />
              <Route path="blog/:id/edit" element={<BlogForm />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="home" element={<AdminHome />} />
              <Route path="hero-slides" element={<AdminHeroSlides />} />
              <Route path="home-blocks" element={<AdminHomeBlocks />} />
              <Route path="goal-cards" element={<AdminGoalCards />} />
              <Route path="navigation" element={<AdminNavigation />} />
              <Route path="footer" element={<AdminFooter />} />
              <Route path="site-links" element={<AdminSiteLinks />} />
              <Route path="contact" element={<AdminContact />} />
              <Route path="about" element={<AdminAbout />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="testimonials" element={<AdminTestimonials />} />
              <Route path="shipping" element={<AdminShipping />} />
              <Route path="subscription" element={<AdminSubscription />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

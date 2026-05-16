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
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/search" element={<Search />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/my-orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

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
              <Route path="home" element={<AdminHome />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

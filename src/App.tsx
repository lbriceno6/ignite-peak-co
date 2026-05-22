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
import { ScrollToTop } from "@/components/ScrollToTop";
import { ReferralTracker } from "@/components/ReferralTracker";
import { ResellerRoute } from "@/components/ResellerRoute";
import { ResellerLayout } from "@/components/reseller/ResellerLayout";
import ResellerProgram from "./pages/ResellerProgram.tsx";
import ResellerDashboard from "./pages/reseller/ResellerDashboard.tsx";
import ResellerLink from "./pages/reseller/ResellerLink.tsx";
import ResellerSales from "./pages/reseller/ResellerSales.tsx";
import ResellerPayouts from "./pages/reseller/ResellerPayouts.tsx";
import ResellerSettings from "./pages/reseller/ResellerSettings.tsx";
import AdminResellers from "./pages/admin/AdminResellers.tsx";
import AdminResellerTiers from "./pages/admin/AdminResellerTiers.tsx";
import AdminResellerPayouts from "./pages/admin/AdminResellerPayouts.tsx";
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
import MyStoreCredit from "./pages/MyStoreCredit.tsx";
import ResellerSaleDetail from "./pages/reseller/ResellerSaleDetail.tsx";
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
import AdminFilterOptions from "./pages/admin/AdminFilterOptions.tsx";
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
import AdminEmail from "./pages/admin/AdminEmail.tsx";
import AdminTheme from "./pages/admin/AdminTheme.tsx";
import AdminSeo from "./pages/admin/AdminSeo.tsx";
import AdminChatAI from "./pages/admin/AdminChatAI.tsx";
import AdminAiConfig from "./pages/admin/AdminAiConfig.tsx";
import { ThemeProvider } from "./components/ThemeProvider";
import Shipping from "./pages/policies/Shipping.tsx";
import Returns from "./pages/policies/Returns.tsx";
import Terms from "./pages/policies/Terms.tsx";
import Privacy from "./pages/policies/Privacy.tsx";
import SellWithUs from "./pages/SellWithUs.tsx";
import SupplierStorefront from "./pages/SupplierStorefront.tsx";
import { SupplierRoute } from "./components/SupplierRoute";
import { SupplierLayout } from "./components/supplier/SupplierLayout";
import SupplierSignup from "./pages/supplier/SupplierSignup.tsx";
import SupplierDashboard from "./pages/supplier/SupplierDashboard.tsx";
import SupplierProducts from "./pages/supplier/SupplierProducts.tsx";
import SupplierProductForm from "./pages/supplier/SupplierProductForm.tsx";
import SupplierOrders from "./pages/supplier/SupplierOrders.tsx";
import SupplierProfile from "./pages/supplier/SupplierProfile.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import SeoLanding from "./pages/SeoLanding.tsx";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { RedirectGate } from "@/components/RedirectGate";
import { CookieBanner } from "@/components/CookieBanner";
import { CookiePreferencesModal } from "@/components/CookiePreferencesModal";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import Cookies from "./pages/policies/Cookies.tsx";

const VisitorTrackingMount = () => { useVisitorTracking(); return null; };

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
          <ThemeProvider>
            <ScrollToTop />
            <ReferralTracker />
            <AnalyticsScripts />
            <RedirectGate />
            <VisitorTrackingMount />
            <CookieBanner />
            <CookiePreferencesModal />
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
            <Route path="/my-store-credit" element={<ProtectedRoute><MyStoreCredit /></ProtectedRoute>} />

            <Route path="/shipping-policies" element={<Shipping />} />
            <Route path="/returns-policies" element={<Returns />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/politica-de-privacidad" element={<Privacy />} />
            <Route path="/politica-de-cookies" element={<Cookies />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            {/* SEO landing pages */}
            <Route path="/objetivo/:slug" element={<SeoLanding kind="objetivo" />} />
            <Route path="/ingrediente/:slug" element={<SeoLanding kind="ingrediente" />} />
            <Route path="/beneficio/:slug" element={<SeoLanding kind="beneficio" />} />

            {/* Marketplace / Suppliers */}
            <Route path="/vende-con-nosotros" element={<SellWithUs />} />
            <Route path="/vender-con-nosotros" element={<SellWithUs />} />
            <Route path="/sell-with-us" element={<SellWithUs />} />
            <Route path="/proveedor/:slug" element={<SupplierStorefront />} />
            <Route path="/supplier/signup" element={<SupplierSignup />} />
            <Route path="/supplier" element={<SupplierRoute><SupplierLayout /></SupplierRoute>}>
              <Route index element={<SupplierDashboard />} />
              <Route path="products" element={<SupplierProducts />} />
              <Route path="products/new" element={<SupplierProductForm />} />
              <Route path="products/:id/edit" element={<SupplierProductForm />} />
              <Route path="orders" element={<SupplierOrders />} />
              <Route path="profile" element={<SupplierProfile />} />
            </Route>

            {/* Reseller program */}
            <Route path="/programa-revendedor" element={<ResellerProgram />} />
            <Route path="/reseller" element={<ResellerRoute><ResellerLayout /></ResellerRoute>}>
              <Route index element={<ResellerDashboard />} />
              <Route path="link" element={<ResellerLink />} />
              <Route path="sales" element={<ResellerSales />} />
              <Route path="sales/:id" element={<ResellerSaleDetail />} />
              <Route path="payouts" element={<ResellerPayouts />} />
              <Route path="settings" element={<ResellerSettings />} />
            </Route>

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
              <Route path="filter-options" element={<AdminFilterOptions />} />
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
              <Route path="email" element={<AdminEmail />} />
              <Route path="theme" element={<AdminTheme />} />
              <Route path="resellers" element={<AdminResellers />} />
              <Route path="reseller-tiers" element={<AdminResellerTiers />} />
              <Route path="reseller-payouts" element={<AdminResellerPayouts />} />
              <Route path="seo" element={<AdminSeo />} />
              <Route path="chat-ia" element={<AdminChatAI />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </ThemeProvider>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

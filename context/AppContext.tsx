import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import { productService, Product as ApiProduct } from '@/services/productService';

// Re-export Product interface from productService for consistency
export type Product = ApiProduct;

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isEmailVerified?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  avatar?: string;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  items: CartItem[];
}

interface AppState {
  user: User | null;
  cart: CartItem[];
  wishlist: Product[];
  products: Product[];
  categories: string[];
  brands: string[];
  orders: Order[];
  isLoading: boolean;
  isLoadingProducts: boolean;
  error: string | null;
  productsError: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PRODUCTS_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS_ERROR'; payload: string | null }
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_BRANDS'; payload: string[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_TO_WISHLIST'; payload: Product }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: string }
  | { type: 'SET_WISHLIST'; payload: Product[] }
  | { type: 'CLEAR_WISHLIST' }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'REFRESH_PRODUCTS' };

const initialState: AppState = {
  user: null,
  cart: [],
  wishlist: [],
  products: [],
  categories: [],
  brands: [],
  orders: [],
  isLoading: false,
  isLoadingProducts: false,
  error: null,
  productsError: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_PRODUCTS_LOADING':
      return { ...state, isLoadingProducts: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PRODUCTS_ERROR':
      return { ...state, productsError: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, productsError: null };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_BRANDS':
      return { ...state, brands: action.payload };
    case 'SET_CART':
      return { ...state, cart: action.payload };
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { ...action.payload, quantity: 1 }],
      };
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.payload),
      };
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'SET_WISHLIST':
      return { ...state, wishlist: action.payload };
    case 'ADD_TO_WISHLIST':
      const isAlreadyInWishlist = state.wishlist.some(item => item.id === action.payload.id);
      if (isAlreadyInWishlist) {
        return state;
      }
      return {
        ...state,
        wishlist: [...state.wishlist, action.payload],
      };
    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        wishlist: state.wishlist.filter(item => item.id !== action.payload),
      };
    case 'CLEAR_WISHLIST':
      return { ...state, wishlist: [] };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.payload],
      };
    case 'REMOVE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload),
      };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? action.payload : product
        ),
      };
    case 'REFRESH_PRODUCTS':
      // Trigger a refresh of products from API
      return { ...state, isLoadingProducts: true, productsError: null };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from storage on app start
  useEffect(() => {
    loadCart();
    loadWishlist();
    loadProductsFromAPI();
    loadCategories();
    loadBrands();
    loadUser();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    saveCart();
  }, [state.cart]);

  // Save wishlist to storage whenever it changes
  useEffect(() => {
    saveWishlist();
  }, [state.wishlist]);

  const loadCart = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        dispatch({ type: 'SET_CART', payload: JSON.parse(cartData) });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(state.cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const loadWishlist = async () => {
    try {
      const wishlistData = await AsyncStorage.getItem('wishlist');
      if (wishlistData) {
        dispatch({ type: 'SET_WISHLIST', payload: JSON.parse(wishlistData) });
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const saveWishlist = async () => {
    try {
      await AsyncStorage.setItem('wishlist', JSON.stringify(state.wishlist));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  const loadUser = async () => {
    try {
      // First try to get user from AsyncStorage (for offline access)
      const cachedUserData = await AsyncStorage.getItem('user');
      if (cachedUserData) {
        dispatch({ type: 'SET_USER', payload: JSON.parse(cachedUserData) });
      }

      // Then try to get fresh user data from API if authenticated
      if (await authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          dispatch({ type: 'SET_USER', payload: currentUser });
        } else {
          // Token might be expired, clear user data
          await AsyncStorage.removeItem('user');
          dispatch({ type: 'SET_USER', payload: null });
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadProductsFromAPI = async () => {
    try {
      dispatch({ type: 'SET_PRODUCTS_LOADING', payload: true });
      dispatch({ type: 'SET_PRODUCTS_ERROR', payload: null });

      const response = await productService.getProducts({ 
        sortBy: 'createdAt', 
        sortOrder: 'desc',
        limit: 50 // Load more products initially
      });

      if (response.success && response.data?.products) {
        dispatch({ type: 'SET_PRODUCTS', payload: response.data.products });
      } else {
        // Fallback to cached products if API fails
        const cachedProducts = await productService.getCachedProducts();
        if (cachedProducts.length > 0) {
          dispatch({ type: 'SET_PRODUCTS', payload: cachedProducts });
          dispatch({ type: 'SET_PRODUCTS_ERROR', payload: 'Showing cached products. Pull to refresh for latest data.' });
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      
      // Try cached products first
      const cachedProducts = await productService.getCachedProducts();
      if (cachedProducts.length > 0) {
        dispatch({ type: 'SET_PRODUCTS', payload: cachedProducts });
        dispatch({ type: 'SET_PRODUCTS_ERROR', payload: 'Network error. Showing cached products.' });
      }
    } finally {
      dispatch({ type: 'SET_PRODUCTS_LOADING', payload: false });
    }
  };

  const loadCategories = async () => {
    try {
      const response = await productService.getCategories();
      if (response.success && response.data) {
        dispatch({ type: 'SET_CATEGORIES', payload: response.data });
      } else {
        // Fallback to default categories
        dispatch({ type: 'SET_CATEGORIES', payload: ['Smartphones', 'Laptops', 'Wearables', 'Headphones', 'Accessories'] });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      dispatch({ type: 'SET_CATEGORIES', payload: ['Smartphones', 'Laptops', 'Wearables', 'Headphones', 'Accessories'] });
    }
  };

  const loadBrands = async () => {
    try {
      const response = await productService.getBrands();
      if (response.success && response.data) {
        dispatch({ type: 'SET_BRANDS', payload: response.data });
      } else {
        // Fallback to default brands
        dispatch({ type: 'SET_BRANDS', payload: ['Apple', 'Samsung', 'Sony', 'ASUS', 'Fitbit'] });
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      dispatch({ type: 'SET_BRANDS', payload: ['Apple', 'Samsung', 'Sony', 'ASUS', 'Fitbit'] });
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Product-specific hooks for easier access
export function useProducts() {
  const { state, dispatch } = useApp();
  
  const refreshProducts = async () => {
    dispatch({ type: 'REFRESH_PRODUCTS' });
    try {
      const response = await productService.getProducts({ 
        sortBy: 'createdAt', 
        sortOrder: 'desc',
        limit: 50 
      });
      
      if (response.success && response.data?.products) {
        dispatch({ type: 'SET_PRODUCTS', payload: response.data.products });
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
      dispatch({ type: 'SET_PRODUCTS_ERROR', payload: 'Failed to refresh products' });
    } finally {
      dispatch({ type: 'SET_PRODUCTS_LOADING', payload: false });
    }
  };

  return {
    products: state.products,
    categories: state.categories,
    brands: state.brands,
    isLoading: state.isLoadingProducts,
    error: state.productsError,
    refreshProducts,
  };
}

// Helper functions
export const getCartTotal = (cart: CartItem[]) => {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
};

export const getCartItemsCount = (cart: CartItem[]) => {
  return cart.reduce((count, item) => count + item.quantity, 0);
};

export const isInWishlist = (wishlist: Product[], productId: string) => {
  return wishlist.some(item => item.id === productId);
};

export const getWishlistItemsCount = (wishlist: Product[]) => {
  return wishlist.length;
};
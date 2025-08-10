import { useState, useEffect, useCallback, useRef } from 'react';
import { productService, Product, ProductFilters } from '@/services/productService';

interface UseProductsResult {
  products: Product[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  totalProducts: number;
  currentPage: number;
  currentFilters: ProductFilters;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  filterProducts: (filters: ProductFilters) => Promise<void>;
  clearFilters: () => Promise<void>;
  clearError: () => void;
}

interface UseProductsOptions {
  initialFilters?: ProductFilters;
  pageSize?: number;
  enablePagination?: boolean;
  enableCache?: boolean;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const {
    initialFilters = {},
    pageSize = 20,
    enablePagination = true,
    enableCache = true,
  } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<ProductFilters>(initialFilters);

  const filtersRef = useRef<ProductFilters>(initialFilters);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const lastRequestIdRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  useEffect(() => {
    filtersRef.current = currentFilters;
  }, [currentFilters]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const generateRequestId = useCallback((filters: ProductFilters, page: number): string => {
    return `${JSON.stringify(filters)}-${page}-${Date.now()}`;
  }, []);

  const fetchProducts = useCallback(async (
    filters: ProductFilters = {},
    page: number = 1,
    append: boolean = false,
    skipIfSameFilters: boolean = false
  ) => {
    if (skipIfSameFilters && 
        JSON.stringify(filters) === JSON.stringify(filtersRef.current) && 
        products.length > 0 && 
        !append) {
      return;
    }

    const requestId = generateRequestId(filters, page);
    lastRequestIdRef.current = requestId;

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (!append) {
        setIsLoading(true);
      }
      setError(null);

      const requestFilters: ProductFilters = {
        ...filters,
        page,
        limit: pageSize,
      };

      const response = await productService.getProducts(requestFilters, {
        signal: abortControllerRef.current.signal
      });

      if (!isMountedRef.current || lastRequestIdRef.current !== requestId) {
        return;
      }

      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      if (response.success && response.data?.products) {
        const newProducts = response.data.products;

        if (append) {
          setProducts(prev => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }

        const responseTotal = response.data.total || response.total || newProducts.length;
        setTotalProducts(responseTotal);

        const totalPages = response.data.totalPages || Math.ceil(responseTotal / pageSize);
        setHasMore(newProducts.length === pageSize && page < totalPages);
        setCurrentPage(page);

        if (enableCache && !append && page === 1) {
          try {
            await productService.cacheProducts(newProducts);
          } catch {
            // ignore cache errors
          }
        }
      } else {
        const errorMessage = response.message || 'Failed to fetch products';
        setError(errorMessage);

        if (enableCache && !append && page === 1) {
          try {
            const cachedProducts = await productService.getCachedProducts();
            if (cachedProducts.length > 0) {
              setProducts(cachedProducts);
              setTotalProducts(cachedProducts.length);
              setError('Showing cached products. Pull to refresh for latest data.');
            }
          } catch {}
        }
      }
    } catch (error: any) {
      if (!isMountedRef.current || lastRequestIdRef.current !== requestId) {
        return;
      }

      if (error.name === 'AbortError') {
        return;
      }

      setError('Network error. Please check your connection.');

      if (enableCache && !append && page === 1) {
        try {
          const cachedProducts = await productService.getCachedProducts();
          if (cachedProducts.length > 0) {
            setProducts(cachedProducts);
            setTotalProducts(cachedProducts.length);
            setError('Showing cached products. Pull to refresh for latest data.');
          }
        } catch {}
      }
    } finally {
      if (isMountedRef.current && lastRequestIdRef.current === requestId) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [pageSize, enableCache, generateRequestId, products.length]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await fetchProducts(filtersRef.current, 1, false);
  }, [fetchProducts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isRefreshing) {
      return;
    }
    const nextPage = currentPage + 1;
    await fetchProducts(filtersRef.current, nextPage, true);
  }, [hasMore, isLoading, isRefreshing, currentPage, fetchProducts]);

  const clearFilters = useCallback(async () => {
    const emptyFilters = {};
    if (Object.keys(filtersRef.current).length === 0) {
      return;
    }
    setCurrentFilters(emptyFilters);
    setCurrentPage(1);
    setHasMore(true);
    await fetchProducts(emptyFilters, 1, false);
  }, [fetchProducts]);

  const searchProducts = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      await clearFilters();
      return;
    }

    const searchFilters = { 
      ...filtersRef.current, 
      search: trimmedQuery
    };

    if (filtersRef.current.search === trimmedQuery) {
      return;
    }

    setCurrentFilters(searchFilters);
    setCurrentPage(1);
    setHasMore(true);
    await fetchProducts(searchFilters, 1, false);
  }, [fetchProducts, clearFilters]);

  const filterProducts = useCallback(async (filters: ProductFilters) => {
    if (!isInitializedRef.current) {
      return;
    }

    const newFilters = { ...filters };
    if ('search' in filters) {
      const searchValue = filters.search?.trim();
      if (!searchValue) {
        delete newFilters.search;
      } else {
        newFilters.search = searchValue;
      }
    }

    Object.keys(newFilters).forEach(key => {
      const value = newFilters[key as keyof ProductFilters];
      if (value === undefined || value === null || value === '') {
        delete newFilters[key as keyof ProductFilters];
      }
    });

    const currentFiltersString = JSON.stringify(filtersRef.current);
    const newFiltersString = JSON.stringify(newFilters);

    if (currentFiltersString === newFiltersString) {
      return;
    }

    setCurrentFilters(newFilters);
    setCurrentPage(1);
    setHasMore(true);
    await fetchProducts(newFilters, 1, false);
  }, [fetchProducts]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchProducts(initialFilters, 1, false);
      isInitializedRef.current = true;
    };
    loadInitialData();
  }, []);

  return {
    products,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    totalProducts,
    currentPage,
    currentFilters,
    refresh,
    loadMore,
    searchProducts,
    filterProducts,
    clearFilters,
    clearError,
  };
}

import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { ServiceOrder, OrderStatus, PaymentMethod } from '@/types';
import { isToday, isYesterday, startOfMonth, endOfMonth, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

interface OSFiltersState {
  searchTerm: string;
  statusFilter: OrderStatus | 'all';
  paymentFilter: PaymentMethod | 'all';
  dateFilter: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom';
  customDateRange: { start: Date | null; end: Date | null };
}

interface OSFiltersConfig {
  persistKey?: string;
  debounceMs?: number;
}

export function useOSFilters(orders: ServiceOrder[], config: OSFiltersConfig = {}) {
  const { persistKey = 'help_smart_os_filters', debounceMs = 150 } = config;

  // Load saved filters or defaults
  const loadSavedFilters = (): OSFiltersState => {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          customDateRange: {
            start: parsed.customDateRange?.start ? new Date(parsed.customDateRange.start) : null,
            end: parsed.customDateRange?.end ? new Date(parsed.customDateRange.end) : null
          }
        };
      }
    } catch {
      // Fallback to defaults if parsing fails
    }
    
    return {
      searchTerm: '',
      statusFilter: 'aberta',
      paymentFilter: 'all',
      dateFilter: 'all',
      customDateRange: { start: null, end: null }
    };
  };

  const [filters, setFilters] = useState<OSFiltersState>(loadSavedFilters);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.searchTerm);

  // Persist filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify(filters));
    } catch {
      // Ignore localStorage errors
    }
  }, [filters, persistKey]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters.searchTerm, debounceMs]);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(orders, {
      keys: [
        { name: 'customerName', weight: 0.4 },
        { name: 'customerPhone', weight: 0.3 },
        { name: 'description', weight: 0.2 },
        { name: 'notes', weight: 0.1 }
      ],
      threshold: 0.3, // Lower = more strict matching
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2
    });
  }, [orders]);

  // Apply all filters
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter using Fuse.js
    if (debouncedSearchTerm.trim()) {
      const searchResults = fuse.search(debouncedSearchTerm.trim());
      result = searchResults.map(({ item }) => item);
    }

    // Status filter
    if (filters.statusFilter !== 'all') {
      result = result.filter(order => order.status === filters.statusFilter);
    }

    // Payment method filter
    if (filters.paymentFilter !== 'all') {
      result = result.filter(order => order.paymentMethod === filters.paymentFilter);
    }

    // Date filter
    if (filters.dateFilter !== 'all') {
      const now = new Date();
      
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        
        switch (filters.dateFilter) {
          case 'today':
            return isToday(orderDate);
          
          case 'yesterday':
            return isYesterday(orderDate);
          
          case '7days':
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            return isAfter(orderDate, sevenDaysAgo);
          
          case 'month':
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            return isAfter(orderDate, monthStart) && isBefore(orderDate, monthEnd);
          
          case 'custom':
            if (!filters.customDateRange.start || !filters.customDateRange.end) {
              return true; // Show all if range not properly set
            }
            const rangeStart = startOfDay(filters.customDateRange.start);
            const rangeEnd = endOfDay(filters.customDateRange.end);
            return isAfter(orderDate, rangeStart) && isBefore(orderDate, rangeEnd);
          
          default:
            return true;
        }
      });
    }

    return result;
  }, [orders, debouncedSearchTerm, filters, fuse]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.searchTerm.trim() ||
      filters.statusFilter !== 'aberta' ||
      filters.paymentFilter !== 'all' ||
      filters.dateFilter !== 'all'
    );
  }, [filters]);

  // Filter update functions
  const updateSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const updateStatusFilter = (statusFilter: OrderStatus | 'all') => {
    setFilters(prev => ({ ...prev, statusFilter }));
  };

  const updatePaymentFilter = (paymentFilter: PaymentMethod | 'all') => {
    setFilters(prev => ({ ...prev, paymentFilter }));
  };

  const updateDateFilter = (dateFilter: 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom') => {
    setFilters(prev => ({ ...prev, dateFilter }));
  };

  const updateCustomDateRange = (customDateRange: { start: Date | null; end: Date | null }) => {
    setFilters(prev => ({ ...prev, customDateRange }));
  };

  const clearAllFilters = () => {
    const defaultFilters: OSFiltersState = {
      searchTerm: '',
      statusFilter: 'aberta',
      paymentFilter: 'all',
      dateFilter: 'all',
      customDateRange: { start: null, end: null }
    };
    setFilters(defaultFilters);
  };

  return {
    // Current filter state
    filters,
    
    // Filtered results
    filteredOrders,
    hasActiveFilters,
    
    // Update functions
    updateSearch,
    updateStatusFilter,
    updatePaymentFilter,
    updateDateFilter,
    updateCustomDateRange,
    clearAllFilters,
    
    // For direct component props binding
    searchTerm: filters.searchTerm,
    statusFilter: filters.statusFilter,
    paymentFilter: filters.paymentFilter,
    dateFilter: filters.dateFilter,
    customDateRange: filters.customDateRange
  };
}
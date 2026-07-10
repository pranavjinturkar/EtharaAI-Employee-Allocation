import { useState, useEffect, useCallback } from 'react';
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
export function usePagination<T, P extends Record<string, any>>(
  fetchFn: (params: P & { page: number; limit: number }) => Promise<PaginatedResponse<T>>,
  params: P,
  limit: number = 50
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // Reset to page 1 when filter params change
  useEffect(() => {
    setPage(1);
  }, [JSON.stringify(params)]);
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFn({ ...params, page, limit });
      setData(response.data);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, JSON.stringify(params), page, limit]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setPage(p);
    }
  };
  
  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  return {
    data,
    loading,
    error,
    page,
    limit,
    total,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    refresh: loadData
  };
}
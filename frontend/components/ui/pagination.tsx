import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}
export function Pagination({ currentPage, totalPages, onPageChange, isLoading }: PaginationProps) {
  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="items-center gap-1 hidden md:flex">
          {getPages().map((page, i) => (
            page === '...' ? (
              <div key={i} className="px-2 text-gray-500"><MoreHorizontal className="w-4 h-4" /></div>
            ) : (
              <Button
                key={i}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={currentPage === page ? "bg-ethara-green hover:bg-ethara-green/90 text-white" : ""}
                onClick={() => onPageChange(page as number)}
                disabled={isLoading}
              >
                {page}
              </Button>
            )
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
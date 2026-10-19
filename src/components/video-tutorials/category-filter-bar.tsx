interface CategoryFilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide" role="group" aria-label="Filter tutorials by category">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          aria-pressed={selectedCategory === category}
          className={`shrink-0 border px-3.5 py-2 text-xs font-semibold transition ${
            selectedCategory === category
              ? "border-brand bg-brand text-white"
              : "border-border bg-white text-muted hover:border-brand/50 hover:text-brand"
          }`}
        >
          {category === "all" ? "All Categories" : category}
        </button>
      ))}
    </div>
  );
}

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { difficultyColors, tagColors, type LeetCodeProblem } from "~/lib/types";
import problemsData from "~/data/problems.json";
import { X, Moon, Sun, Filter } from "lucide-react";

export const loader = async () => {
  const problems = problemsData as LeetCodeProblem[];
  return json({ problems });
};

export const meta: MetaFunction = () => {
  return [
    { title: "LeetCode Problems Dashboard" },
    { name: "description", content: "Enhanced LeetCode problems with AI-generated tags and subtags" },
  ];
};

interface AppliedFilters {
  searchTerm: string;
  difficulty: string;
  tags: Set<string>;
  subtags: Set<string>;
  ratingMin: number;
  ratingMax: number;
  sortBy: string;
}

interface PendingFilters {
  searchTerm: string;
  difficulty: string;
  selectedTags: Set<string>;
  selectedSubtags: Set<string>;
  ratingMin: string;
  ratingMax: string;
  sortBy: string;
}

export default function Index() {
  const { problems } = useLoaderData<typeof loader>();
  
  // Theme loading state
  const [themeLoaded, setThemeLoaded] = useState(false);
  
  // Mobile filters modal state
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leetcode-dashboard-theme');
      return saved === 'light' ? false : true; // Default to dark unless explicitly light
    }
    return true; // Default to dark
  });

  // Apply theme changes and set loaded state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('leetcode-dashboard-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('leetcode-dashboard-theme', 'light');
    }
    
    // Add slight delay to show loader
    setTimeout(() => {
      setThemeLoaded(true);
    }, 500);
  }, [darkMode]);

  // Applied filters (what's actually filtering the data)
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    searchTerm: "",
    difficulty: "all",
    tags: new Set(),
    subtags: new Set(),
    ratingMin: 0,
    ratingMax: 4000,
    sortBy: "rating-asc"
  });

  // Pending filters (what user is currently setting)
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>({
    searchTerm: "",
    difficulty: "all",
    selectedTags: new Set(),
    selectedSubtags: new Set(),
    ratingMin: "",
    ratingMax: "",
    sortBy: "rating-asc"
  });

  // Pagination for better performance
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('leetcode-dashboard-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setAppliedFilters({
          searchTerm: filters.searchTerm || "",
          difficulty: filters.difficulty || "all",
          tags: new Set(filters.tags || []),
          subtags: new Set(filters.subtags || []),
          ratingMin: filters.ratingMin || 0,
          ratingMax: filters.ratingMax || 4000,
          sortBy: filters.sortBy || "rating-asc"
        });
        setPendingFilters({
          searchTerm: filters.searchTerm || "",
          difficulty: filters.difficulty || "all",
          selectedTags: new Set(filters.tags || []),
          selectedSubtags: new Set(filters.subtags || []),
          ratingMin: filters.ratingMin || "",
          ratingMax: filters.ratingMax || "",
          sortBy: filters.sortBy || "rating-asc"
        });
      } catch (e) {
        console.error('Failed to load saved filters:', e);
      }
    }
  }, []);

  // Memoize expensive computations with proper dependencies
  const computedData = useMemo(() => {
    // Get all unique tags
    const allTagsSet = new Set<string>();
    problems.forEach(problem => {
      if (problem.topicTags) {
        problem.topicTags.forEach(tag => allTagsSet.add(tag.name));
      }
    });
    const allTags = Array.from(allTagsSet).sort();

    return { allTags };
  }, [problems]);

  // Get subtags for currently selected tags (optimized)
  const availableSubtags = useMemo(() => {
    if (pendingFilters.selectedTags.size === 0) return [];
    
    const subtagsSet = new Set<string>();
    const selectedTagsArray = Array.from(pendingFilters.selectedTags);
    
    problems.forEach(problem => {
      if (problem.topicTags) {
        problem.topicTags.forEach(tag => {
          if (selectedTagsArray.includes(tag.name) && tag.subtags) {
            tag.subtags.forEach(subtag => subtagsSet.add(subtag));
          }
        });
      }
    });
    return Array.from(subtagsSet).sort();
  }, [problems, pendingFilters.selectedTags]);

  // Optimized filtering and sorting
  const filteredAndSortedProblems = useMemo(() => {
    let filtered = problems;

    // Apply filters only if they exist
    if (appliedFilters.searchTerm) {
      const searchLower = appliedFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(problem => 
        problem.Title.toLowerCase().includes(searchLower) ||
        problem.ID.toString().includes(searchLower)
      );
    }

    if (appliedFilters.difficulty !== "all") {
      filtered = filtered.filter(problem => 
        (problem.problemDetails?.difficulty || "Hard") === appliedFilters.difficulty
      );
    }

    if (appliedFilters.tags.size > 0) {
      const tagsArray = Array.from(appliedFilters.tags);
      filtered = filtered.filter(problem => 
        problem.topicTags?.some(tag => tagsArray.includes(tag.name))
      );
    }

    if (appliedFilters.subtags.size > 0) {
      const subtagsArray = Array.from(appliedFilters.subtags);
      filtered = filtered.filter(problem =>
        problem.topicTags?.some(tag => 
          tag.subtags?.some(subtag => subtagsArray.includes(subtag))
        )
      );
    }

    if (appliedFilters.ratingMin > 0 || appliedFilters.ratingMax < 4000) {
      filtered = filtered.filter(problem => 
        problem.Rating >= appliedFilters.ratingMin && 
        problem.Rating <= appliedFilters.ratingMax
      );
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (appliedFilters.sortBy) {
        case "rating-desc": return b.Rating - a.Rating;
        case "rating-asc": return a.Rating - b.Rating;
        case "id-asc": return a.ID - b.ID;
        case "id-desc": return b.ID - a.ID;
        case "title-asc": return a.Title.localeCompare(b.Title);
        case "title-desc": return b.Title.localeCompare(a.Title);
        default: return a.Rating - b.Rating;
      }
    });

    return [...filtered];
  }, [problems, appliedFilters]);

  // Paginated results for better performance
  const paginatedProblems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedProblems.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedProblems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedProblems.length / pageSize);

  // Optimized callbacks to prevent unnecessary re-renders
  const applyFilters = useCallback(() => {
    const newFilters = {
      searchTerm: pendingFilters.searchTerm,
      difficulty: pendingFilters.difficulty,
      tags: new Set(pendingFilters.selectedTags),
      subtags: new Set(pendingFilters.selectedSubtags),
      ratingMin: pendingFilters.ratingMin ? parseInt(pendingFilters.ratingMin) : 0,
      ratingMax: pendingFilters.ratingMax ? parseInt(pendingFilters.ratingMax) : 4000,
      sortBy: pendingFilters.sortBy
    };
    
    setAppliedFilters(newFilters);
    setCurrentPage(1);
    
    // Save to localStorage
    localStorage.setItem('leetcode-dashboard-filters', JSON.stringify({
      ...newFilters,
      tags: Array.from(newFilters.tags),
      subtags: Array.from(newFilters.subtags)
    }));
  }, [pendingFilters]);

  const clearAllFilters = useCallback(() => {
    const resetFilters = {
      searchTerm: "",
      difficulty: "all",
      selectedTags: new Set<string>(),
      selectedSubtags: new Set<string>(),
      ratingMin: "",
      ratingMax: "",
      sortBy: "rating-asc"
    };
    setPendingFilters(resetFilters);
    setAppliedFilters({
      searchTerm: "",
      difficulty: "all",
      tags: new Set(),
      subtags: new Set(),
      ratingMin: 0,
      ratingMax: 4000,
      sortBy: "rating-asc"
    });
    setCurrentPage(1);
    
    // Clear localStorage
    localStorage.removeItem('leetcode-dashboard-filters');
  }, []);

  const removeAppliedFilter = useCallback((type: string, value?: string) => {
    const newApplied = { ...appliedFilters };
    const newPending = { ...pendingFilters };

    switch (type) {
      case "search":
        newApplied.searchTerm = "";
        newPending.searchTerm = "";
        break;
      case "difficulty":
        newApplied.difficulty = "all";
        newPending.difficulty = "all";
        break;
      case "tag":
        if (value) {
          newApplied.tags.delete(value);
          newPending.selectedTags.delete(value);
          newApplied.tags = new Set(newApplied.tags);
          newPending.selectedTags = new Set(newPending.selectedTags);
        }
        break;
      case "subtag":
        if (value) {
          newApplied.subtags.delete(value);
          newPending.selectedSubtags.delete(value);
          newApplied.subtags = new Set(newApplied.subtags);
          newPending.selectedSubtags = new Set(newPending.selectedSubtags);
        }
        break;
      case "rating":
        newApplied.ratingMin = 0;
        newApplied.ratingMax = 4000;
        newPending.ratingMin = "";
        newPending.ratingMax = "";
        break;

    }

    setAppliedFilters(newApplied);
    setPendingFilters(newPending);
    setCurrentPage(1);
  }, [appliedFilters, pendingFilters]);

  const toggleTag = useCallback((tagName: string) => {
    setPendingFilters(prev => {
      const newSelectedTags = new Set(prev.selectedTags);
      const newSelectedSubtags = new Set(prev.selectedSubtags);
      
      if (newSelectedTags.has(tagName)) {
        newSelectedTags.delete(tagName);
        // Remove subtags for this tag
        problems.forEach(problem => {
          if (problem.topicTags) {
            const tag = problem.topicTags.find(t => t.name === tagName);
            if (tag && tag.subtags) {
              tag.subtags.forEach(subtag => newSelectedSubtags.delete(subtag));
            }
          }
        });
      } else {
        newSelectedTags.add(tagName);
      }
      
      return {
        ...prev,
        selectedTags: newSelectedTags,
        selectedSubtags: newSelectedSubtags
      };
    });
  }, [problems]);

  const toggleSubtag = useCallback((subtagName: string) => {
    setPendingFilters(prev => {
      const newSelectedSubtags = new Set(prev.selectedSubtags);
      if (newSelectedSubtags.has(subtagName)) {
        newSelectedSubtags.delete(subtagName);
      } else {
        newSelectedSubtags.add(subtagName);
      }
      return {
        ...prev,
        selectedSubtags: newSelectedSubtags
      };
    });
  }, []);

  const hasActiveFilters = appliedFilters.searchTerm || 
                          appliedFilters.difficulty !== "all" ||
                          appliedFilters.tags.size > 0 ||
                          appliedFilters.subtags.size > 0 ||
                          appliedFilters.ratingMin > 0 ||
                          appliedFilters.ratingMax < 4000;

  // Show loader until theme is loaded
  if (!themeLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            StepCode
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-900 flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="mx-auto max-w-7xl">
          <div className="text-center space-y-2 relative">
            <div className="absolute top-0 right-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              StepCode
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-md">Leetcode problems with granular tags & subtags plus difficulty rating based on ELO.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-4">
        <div className="mx-auto max-w-7xl">




          {/* Applied Filters - Mobile only */}
          {hasActiveFilters && (
            <div className="lg:hidden flex-shrink-0 mb-4">
              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-md border-2">
                <CardHeader className="bg-slate-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-6 py-4 rounded-t-lg">
                  <CardTitle className="dark:text-white text-sm">Applied Filters</CardTitle>
                </CardHeader>
                <CardContent className="max-h-20 overflow-y-auto bg-gradient-to-b from-white to-slate-50 dark:from-gray-800 dark:to-gray-850 rounded-b-lg px-6 py-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    {appliedFilters.searchTerm && (
                      <Badge variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                        Search: "{appliedFilters.searchTerm}"
                        <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("search")} />
                      </Badge>
                    )}
                    {appliedFilters.difficulty !== "all" && (
                      <Badge variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                        Difficulty: {appliedFilters.difficulty}
                        <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("difficulty")} />
                      </Badge>
                    )}
                    {Array.from(appliedFilters.tags).map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                        Tag: {tag}
                        <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("tag", tag)} />
                      </Badge>
                    ))}
                    {Array.from(appliedFilters.subtags).map((subtag) => (
                      <Badge key={subtag} variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                        Subtag: {subtag}
                        <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("subtag", subtag)} />
                      </Badge>
                    ))}
                    {(appliedFilters.ratingMin > 0 || appliedFilters.ratingMax < 4000) && (
                      <Badge variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                        Rating: {appliedFilters.ratingMin}-{appliedFilters.ratingMax}
                        <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("rating")} />
                      </Badge>
                    )}

                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Mobile Filter Button */}
            <div className="lg:hidden flex-shrink-0">
              <Button 
                onClick={() => setShowFiltersModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-blue-500 flex items-center justify-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Open Filters
              </Button>
            </div>

            {/* Left Column - Filters (Desktop) */}
            <div className="hidden lg:flex lg:col-span-4 flex-col">
              {/* Applied Filters - Above filters panel */}
              {hasActiveFilters && (
                <div className="flex-shrink-0 mb-4">
                  <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-md border-2">
                    <CardHeader className="bg-slate-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-6 py-4 rounded-t-lg">
                      <CardTitle className="dark:text-white text-sm">Applied Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-20 overflow-y-auto bg-gradient-to-b from-white to-slate-50 dark:from-gray-800 dark:to-gray-850 rounded-b-lg px-6 py-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        {appliedFilters.searchTerm && (
                          <Badge variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                            Search: &quot;{appliedFilters.searchTerm}&quot;
                            <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("search")} />
                          </Badge>
                        )}
                        {appliedFilters.difficulty !== "all" && (
                          <Badge variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                            Difficulty: {appliedFilters.difficulty}
                            <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("difficulty")} />
                          </Badge>
                        )}
                        {Array.from(appliedFilters.tags).map((tag) => (
                          <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                            Tag: {tag}
                            <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("tag", tag)} />
                          </Badge>
                        ))}
                        {Array.from(appliedFilters.subtags).map((subtag) => (
                          <Badge key={subtag} variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                            Subtag: {subtag}
                            <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("subtag", subtag)} />
                          </Badge>
                        ))}
                        {(appliedFilters.ratingMin > 0 || appliedFilters.ratingMax < 4000) && (
                          <Badge variant="secondary" className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-800">
                            Rating: {appliedFilters.ratingMin}-{appliedFilters.ratingMax}
                            <X className="h-3 w-3 ml-1" onClick={() => removeAppliedFilter("rating")} />
                          </Badge>
                        )}

                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                          Clear All
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {/* Filters - Scrollable */}
              <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg bg-gradient-to-b from-white to-slate-50 dark:from-gray-800 dark:to-gray-850">
                <Card className="dark:bg-transparent bg-transparent border-0 shadow-none">
                  <CardHeader className="sticky top-0 bg-white bg-slate-50 dark:bg-gray-700 z-10 border-b border-gray-200 dark:border-gray-600 shadow-sm px-6 py-4">
                    <CardTitle className="dark:text-white">
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                  {/* Search */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Search</label>
                    <Input
                      placeholder="Search by title or ID..."
                      value={pendingFilters.searchTerm}
                      onChange={(e) => setPendingFilters(prev => ({...prev, searchTerm: e.target.value}))}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>

                  {/* Filter Controls */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Difficulty</label>
                      <select
                        value={pendingFilters.difficulty}
                        onChange={(e) => setPendingFilters(prev => ({...prev, difficulty: e.target.value}))}
                        className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Sort By</label>
                      <select
                        value={pendingFilters.sortBy}
                        onChange={(e) => setPendingFilters(prev => ({...prev, sortBy: e.target.value}))}
                        className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="rating-asc">Rating (Low to High)</option>
                        <option value="rating-desc">Rating (High to Low)</option>
                        <option value="id-asc">ID (Ascending)</option>
                        <option value="id-desc">ID (Descending)</option>
                        <option value="title-asc">Title (A-Z)</option>
                        <option value="title-desc">Title (Z-A)</option>
                      </select>
                    </div>
                  </div>

                  {/* Rating Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Rating Range</label>
                    <div className="flex gap-3 items-center">
                      <Input
                        placeholder="Min (e.g., 1000)"
                        value={pendingFilters.ratingMin}
                        onChange={(e) => setPendingFilters(prev => ({...prev, ratingMin: e.target.value}))}
                        className="w-36 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <span className="text-slate-400 dark:text-slate-500 font-medium">to</span>
                      <Input
                        placeholder="Max (e.g., 3000)"
                        value={pendingFilters.ratingMax}
                        onChange={(e) => setPendingFilters(prev => ({...prev, ratingMax: e.target.value}))}
                        className="w-36 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Filter by Tags</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {computedData.allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={pendingFilters.selectedTags.has(tag) ? "default" : "outline"}
                          className={`cursor-pointer hover:scale-105 ${
                            pendingFilters.selectedTags.has(tag) 
                              ? "shadow-sm bg-blue-600 text-white hover:bg-blue-700" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          }`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Subtags */}
                  {availableSubtags.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Filter by Subtags</label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {availableSubtags.map((subtag) => (
                          <Badge
                            key={subtag}
                            variant={pendingFilters.selectedSubtags.has(subtag) ? "default" : "outline"}
                            className={`cursor-pointer hover:scale-105 text-xs ${
                              pendingFilters.selectedSubtags.has(subtag) 
                                ? "shadow-sm bg-purple-600 text-white hover:bg-purple-700" 
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            }`}
                            onClick={() => toggleSubtag(subtag)}
                          >
                            {subtag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              </div>

              {/* Fixed Apply Button */}
              <div className="flex-shrink-0 mt-4">
                <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-lg border border-gray-200 dark:border-gray-600">
                  <CardContent className="px-6 py-4 bg-slate-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex gap-2">
                      <Button onClick={applyFilters} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        Apply Filters
                      </Button>
                      <Button variant="outline" onClick={clearAllFilters} className="px-4">
                        Clear All
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column - Table */}
            <div className="lg:col-span-8">
              <Card className="dark:bg-gray-800 dark:border-gray-700 flex flex-col shadow-lg border border-gray-200 dark:border-gray-600">
              <CardHeader className="bg-slate-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-6 py-4 rounded-t-lg">
                <CardTitle className="dark:text-white truncate">
                  Problems ({filteredAndSortedProblems.length})
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedProblems.length)} - {Math.min(currentPage * pageSize, filteredAndSortedProblems.length)} of {filteredAndSortedProblems.length} problems
                  {appliedFilters.sortBy && (
                    <span className="ml-2">
                      • Sorted by {appliedFilters.sortBy.replace("-", " ").replace("desc", "(descending)").replace("asc", "(ascending)")}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
                <CardContent className="p-0 flex flex-col">
                  <div className="max-h-96 overflow-auto rounded-b-lg bg-gradient-to-b from-white to-slate-50 dark:from-gray-800 dark:to-gray-850">
                  {/* Sticky Header */}
                  <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-500 shadow-md">
                    <div className="grid grid-cols-12 gap-2 lg:gap-4 p-2 lg:p-4 text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-300">
                      <div className="col-span-1">ID</div>
                      <div className="col-span-4 lg:col-span-4">Title</div>
                      <div className="col-span-2">Diff</div>
                      <div className="col-span-1">Rating</div>
                      <div className="col-span-4">Tags</div>
                    </div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedProblems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-gray-400 dark:text-gray-500 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                          No problems found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Try adjusting your filters to see more results
                        </p>
                      </div>
                    ) : (
                      paginatedProblems.map((problem) => (
                      <div key={problem.ID} className="grid grid-cols-12 gap-2 lg:gap-4 p-2 lg:p-4 hover:bg-slate-50 dark:hover:bg-gray-700 border-b dark:border-gray-600">
                        <div className="col-span-1 font-mono text-xs lg:text-sm dark:text-slate-300">{problem.ID}</div>
                        <div className="col-span-4">
                          <div className="font-medium text-sm lg:text-base dark:text-white truncate">{problem.Title}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 hidden lg:block">
                            {problem.ContestID_en} • {problem.ProblemIndex}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge className={difficultyColors[(problem.problemDetails?.difficulty || "Hard") as keyof typeof difficultyColors]}>
                            {problem.problemDetails?.difficulty || "Hard"}
                          </Badge>
                        </div>
                        <div className="col-span-1 font-mono text-xs lg:text-sm dark:text-slate-300">
                          {Math.round(problem.Rating)}
                        </div>
                        <div className="col-span-4">
                          <div className="max-h-20 lg:max-h-32 overflow-y-auto space-y-1">
                            {problem.topicTags && problem.topicTags.length > 0 ? problem.topicTags.map((tag, tagIndex) => (
                              <div key={tag.name} className="flex items-start gap-1 flex-wrap">
                                <Badge
                                  className="text-xs flex-shrink-0 border-gray-300 dark:border-gray-600"
                                  variant="outline"
                                >
                                  {tag.name}
                                </Badge>
                                {tag.subtags && tag.subtags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 max-w-32 lg:max-w-40 overflow-x-auto">
                                    {tag.subtags.map((subtag) => (
                                      <Badge
                                        key={subtag}
                                        variant="secondary"
                                        className="text-xs flex-shrink-0 border-gray-300 dark:border-gray-600"
                                      >
                                        {subtag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )) : (
                              <Badge variant="outline" className="text-xs text-slate-400 dark:text-slate-500">
                                No tags
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-600">
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Mobile Filters Modal */}
          {showFiltersModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
              <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-2xl border-l-2 border-blue-500">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 shadow-sm rounded-t-lg">
                    <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filters
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowFiltersModal(false)}
                      className="dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-scroll p-4 space-y-6 bg-gradient-to-b from-white to-slate-50 dark:from-gray-800 dark:to-gray-850">
                    {/* Search */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Search</label>
                      <Input
                        placeholder="Search by title or ID..."
                        value={pendingFilters.searchTerm}
                        onChange={(e) => setPendingFilters(prev => ({...prev, searchTerm: e.target.value}))}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Difficulty</label>
                        <select
                          value={pendingFilters.difficulty}
                          onChange={(e) => setPendingFilters(prev => ({...prev, difficulty: e.target.value}))}
                          className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="all">All Difficulties</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Sort By</label>
                        <select
                          value={pendingFilters.sortBy}
                          onChange={(e) => setPendingFilters(prev => ({...prev, sortBy: e.target.value}))}
                          className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="rating-asc">Rating (Low to High)</option>
                          <option value="rating-desc">Rating (High to Low)</option>
                          <option value="id-asc">ID (Ascending)</option>
                          <option value="id-desc">ID (Descending)</option>
                          <option value="title-asc">Title (A-Z)</option>
                          <option value="title-desc">Title (Z-A)</option>
                        </select>
                      </div>
                    </div>

                    {/* Rating Range */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Rating Range</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Min"
                          value={pendingFilters.ratingMin}
                          onChange={(e) => setPendingFilters(prev => ({...prev, ratingMin: e.target.value}))}
                          className="flex-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <span className="text-slate-400 dark:text-slate-500">to</span>
                        <Input
                          placeholder="Max"
                          value={pendingFilters.ratingMax}
                          onChange={(e) => setPendingFilters(prev => ({...prev, ratingMax: e.target.value}))}
                          className="flex-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Filter by Tags</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {computedData.allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={pendingFilters.selectedTags.has(tag) ? "default" : "outline"}
                            className={`cursor-pointer hover:scale-105 ${
                              pendingFilters.selectedTags.has(tag) 
                                ? "shadow-sm bg-blue-600 text-white hover:bg-blue-700" 
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            }`}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Subtags */}
                    {availableSubtags.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Filter by Subtags</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                          {availableSubtags.map((subtag) => (
                            <Badge
                              key={subtag}
                              variant={pendingFilters.selectedSubtags.has(subtag) ? "default" : "outline"}
                              className={`cursor-pointer hover:scale-105 text-xs ${
                                pendingFilters.selectedSubtags.has(subtag) 
                                  ? "shadow-sm bg-purple-600 text-white hover:bg-purple-700" 
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                              }`}
                              onClick={() => toggleSubtag(subtag)}
                            >
                              {subtag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 shadow-inner rounded-b-lg">
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          applyFilters();
                          setShowFiltersModal(false);
                        }} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        Apply Filters
                      </Button>
                      <Button variant="outline" onClick={clearAllFilters} className="px-4">
                        Clear All
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
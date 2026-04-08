"use client";

import type {
  ColorStoriesFiltersFormValues,
  ColorStoryCategory,
  ColorStory,
  ColorStoryPayload,
  ColorStoryStatus,
} from "@/types/colorStories.types";

import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import type { Key } from "react";
import { useEffect, useRef, useState } from "react";

import {
  createColorStoryCategory,
  createColorStory,
  deleteColorStoryCategoryById,
  deleteColorStoryById,
  getColorStoryCategories,
  getColorStories,
  getColorStoriesErrorMessage,
  getColorStoryById,
  updateColorStoryCategoryById,
  updateColorStoryById,
  updateColorStoryStatus,
} from "@/api/colorStories.api";
import ColorStoriesFilters from "@/components/colorStories/ColorStoriesFilters";
import { useDebounce } from "@/hooks/useDebounce";

interface StoryFormState {
  title: string;
  excerpt: string;
  palette: string;
  category: string;
  authorName: string;
  authorAvatar: string;
  authorReadTime: string;
  authorDate: string;
  tags: string;
  status: "0" | "1";
  publishedAt: string;
}

interface StoryFormErrors {
  title: string;
  excerpt: string;
  palette: string;
  category: string;
  authorName: string;
  authorAvatar: string;
  authorReadTime: string;
  authorDate: string;
  tags: string;
  status: string;
  publishedAt: string;
}

const INITIAL_FILTERS: ColorStoriesFiltersFormValues = {
  search: "",
  status: "all",
  category: "",
};

const defaultFormState: StoryFormState = {
  title: "",
  excerpt: "",
  palette: "",
  category: "",
  authorName: "",
  authorAvatar: "",
  authorReadTime: "",
  authorDate: "",
  tags: "",
  status: "0",
  publishedAt: "",
};

const initialFormErrors: StoryFormErrors = {
  title: "",
  excerpt: "",
  palette: "",
  category: "",
  authorName: "",
  authorAvatar: "",
  authorReadTime: "",
  authorDate: "",
  tags: "",
  status: "",
  publishedAt: "",
};

function padNumber(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatStoryDateLabel(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate(),
  )}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function toIsoDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getStatusLabel(status: ColorStoryStatus): string {
  return status === 1 ? "Published" : "Draft";
}

function getStatusColor(status: ColorStoryStatus): "success" | "warning" {
  return status === 1 ? "success" : "warning";
}

function parseDelimitedValues(value: string): string[] {
  return value.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
}

function isValidHexColor(value: string): boolean {
  return /^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/i.test(value);
}

function normalizePaletteValues(value: string): string[] {
  return Array.from(
    new Set(parseDelimitedValues(value).map((e) => e.toUpperCase())),
  );
}

function isValidUrl(value: string): boolean {
  try { new URL(value); return true; } catch { return false; }
}

function getAuthorInitials(name?: string): string {
  if (!name) return "CS";
  return name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getFormFromStory(story: ColorStory): StoryFormState {
  return {
    title: story.title ?? "",
    excerpt: story.excerpt ?? "",
    palette: story.palette.join(", "),
    category: story.category ?? "",
    authorName: story.author.name ?? "",
    authorAvatar: story.author.avatar ?? "",
    authorReadTime: story.author.readTime ?? "",
    authorDate: story.author.date ?? "",
    tags: story.tags.join(", "),
    status: story.status === 1 ? "1" : "0",
    publishedAt: toDateTimeLocalValue(story.published_at),
  };
}

function getFiltersKey(
  search: string,
  status: ColorStoriesFiltersFormValues["status"],
  category: string,
): string {
  return [search, status, category].join("|");
}

function getCategoryStoriesLabel(count: number): string {
  return count === 1 ? "1 story" : `${count} stories`;
}

export default function ColorStories() {
  const [stories, setStories] = useState<ColorStory[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStories, setTotalStories] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [categories, setCategories] = useState<ColorStoryCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDraftName, setCategoryDraftName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [filters, setFilters] = useState<ColorStoriesFiltersFormValues>(INITIAL_FILTERS);
  const previousFiltersKeyRef = useRef(
    getFiltersKey(INITIAL_FILTERS.search, INITIAL_FILTERS.status, INITIAL_FILTERS.category),
  );

  const [selectedStory, setSelectedStory] = useState<ColorStory | null>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formState, setFormState] = useState<StoryFormState>(defaultFormState);
  const [formErrors, setFormErrors] = useState<StoryFormErrors>(initialFormErrors);
  const [pendingDeleteStory, setPendingDeleteStory] = useState<{ id: number; title: string } | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const { isOpen: isViewModalOpen, onOpen: onViewOpen, onOpenChange: onViewOpenChange } = useDisclosure();
  const { isOpen: isFormModalOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isCategoriesModalOpen, onOpen: onCategoriesOpen, onClose: onCategoriesClose } = useDisclosure();

  const debouncedSearch = useDebounce(filters.search.trim(), 400);
  const hasActiveFilters = Boolean(filters.search.trim() || filters.status !== "all" || filters.category.trim());
  const activeFilterCount = [filters.search.trim(), filters.status !== "all" ? filters.status : "", filters.category.trim()].filter(Boolean).length;
  const publishedStoriesOnPage = stories.filter((s) => s.status === 1).length;
  const draftStoriesOnPage = stories.filter((s) => s.status === 0).length;
  const totalStoriesLabel = totalStories === 1 ? "1 story" : `${totalStories.toLocaleString()} stories`;
  const visibleCategories = categories.filter((c) => c.name.toLowerCase().includes(categorySearch.trim().toLowerCase()));
  const isEditMode = editingStoryId !== null;
  const isEditingCategory = editingCategoryId !== null;

  const emptyStoriesContent = (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <p className="text-sm font-medium text-foreground">
        {hasActiveFilters ? "No color stories found for the selected filters." : "No color stories found."}
      </p>
      <p className="text-sm text-default-500">
        {hasActiveFilters ? "Try clearing one or more filters." : "Create your first story to start building this library."}
      </p>
    </div>
  );

  useEffect(() => {
    const currentFiltersKey = getFiltersKey(debouncedSearch, filters.status, filters.category.trim());
    if (previousFiltersKeyRef.current !== currentFiltersKey) {
      previousFiltersKeyRef.current = currentFiltersKey;
      if (page !== 1) { setPage(1); return; }
    }

    let isActive = true;
    const loadStories = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await getColorStories({
          page,
          per_page: limit,
          search: debouncedSearch || undefined,
          status: filters.status === "all" ? undefined : (Number(filters.status) as ColorStoryStatus),
          category: filters.category.trim() || undefined,
        });
        if (!isActive) return;
        setStories(result.data);
        setTotalStories(result.total);
        setTotalPages(Math.max(result.total_pages, 1));
      } catch (fetchError) {
        if (!isActive) return;
        setError(getColorStoriesErrorMessage(fetchError));
        setStories([]);
        setTotalStories(0);
        setTotalPages(1);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void loadStories();
    return () => { isActive = false; };
  }, [page, limit, debouncedSearch, filters.category, filters.status, reloadToken]);

  useEffect(() => {
    let isActive = true;
    const loadCategories = async () => {
      setIsCategoriesLoading(true);
      try {
        const result = await getColorStoryCategories();
        if (!isActive) return;
        setCategories(result.data);
      } catch (fetchError) {
        if (!isActive) return;
        addToast({ title: "Categories Unavailable", description: getColorStoriesErrorMessage(fetchError), color: "danger", radius: "full", timeout: 3000 });
      } finally {
        if (isActive) setIsCategoriesLoading(false);
      }
    };
    void loadCategories();
    return () => { isActive = false; };
  }, [reloadToken]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const triggerReload = () => setReloadToken((prev) => prev + 1);
  const resetForm = () => { setEditingStoryId(null); setFormState(defaultFormState); setFormErrors(initialFormErrors); };
  const resetCategoryForm = () => { setEditingCategoryId(null); setCategoryDraftName(""); };

  const handleFilterChange = <K extends keyof ColorStoriesFiltersFormValues>(key: K, value: ColorStoriesFiltersFormValues[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    previousFiltersKeyRef.current = getFiltersKey(INITIAL_FILTERS.search, INITIAL_FILTERS.status, INITIAL_FILTERS.category);
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handleFormValueChange = <K extends keyof StoryFormState>(key: K, value: StoryFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const openCategoriesModal = () => { resetCategoryForm(); setCategorySearch(""); onCategoriesOpen(); };
  const startCategoryCreate = () => { setEditingCategoryId(null); setCategoryDraftName(""); onCategoriesOpen(); };
  const startCategoryEdit = (category: ColorStoryCategory) => { setEditingCategoryId(category.id); setCategoryDraftName(category.name); onCategoriesOpen(); };
  const openCreateModal = () => { resetForm(); onFormOpen(); };

  const openViewModal = async (id: number) => {
    setSelectedStory(null);
    setIsViewLoading(true);
    onViewOpen();
    try {
      const story = await getColorStoryById(id);
      setSelectedStory(story);
    } catch (fetchError) {
      addToast({ title: "Load Failed", description: getColorStoriesErrorMessage(fetchError), color: "danger", radius: "full", timeout: 3000 });
    } finally {
      setIsViewLoading(false);
    }
  };

  const openEditModal = async (id: number) => {
    resetForm();
    setEditingStoryId(id);
    setIsFormLoading(true);
    onFormOpen();
    try {
      const story = await getColorStoryById(id);
      setFormState(getFormFromStory(story));
    } catch (fetchError) {
      addToast({ title: "Load Failed", description: getColorStoriesErrorMessage(fetchError), color: "danger", radius: "full", timeout: 3000 });
      onFormClose();
      resetForm();
    } finally {
      setIsFormLoading(false);
    }
  };

  const openDeleteModal = (story: ColorStory) => {
    setPendingDeleteStory({ id: story.id, title: story.title?.trim() ? story.title : "this story" });
    onDeleteOpen();
  };

  const handleSaveCategory = async () => {
    const nextName = categoryDraftName.trim();
    if (!nextName) {
      addToast({ title: "Validation Error", description: "Category name is required.", color: "danger", radius: "full", timeout: 3000 });
      return;
    }
    const currentCategory = editingCategoryId === null ? null : (categories.find((c) => c.id === editingCategoryId) ?? null);
    setIsSubmittingCategory(true);
    try {
      if (editingCategoryId !== null) {
        const result = await updateColorStoryCategoryById(editingCategoryId, nextName);
        if (currentCategory && currentCategory.name !== nextName) {
          if (filters.category === currentCategory.name) handleFilterChange("category", nextName);
          if (formState.category === currentCategory.name) handleFormValueChange("category", nextName);
        }
        addToast({ title: "Category Updated", description: result.message ?? "Color story category updated successfully.", color: "success", radius: "full", timeout: 3000 });
      } else {
        const result = await createColorStoryCategory(nextName);
        if (!formState.category) handleFormValueChange("category", nextName);
        addToast({ title: "Category Created", description: result.message ?? "Color story category created successfully.", color: "success", radius: "full", timeout: 3000 });
      }
      setCategoryDraftName("");
      setEditingCategoryId(null);
      triggerReload();
    } catch (submitError) {
      addToast({ title: editingCategoryId !== null ? "Update Failed" : "Create Failed", description: getColorStoriesErrorMessage(submitError), color: "danger", radius: "full", timeout: 3000 });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: ColorStoryCategory) => {
    setDeletingCategoryId(category.id);
    try {
      const result = await deleteColorStoryCategoryById(category.id);
      if (filters.category === category.name) handleFilterChange("category", "");
      if (formState.category === category.name) handleFormValueChange("category", "");
      addToast({ title: "Category Deleted", description: result.message ?? "Color story category deleted successfully.", color: "success", radius: "full", timeout: 3000 });
      if (editingCategoryId === category.id) resetCategoryForm();
      triggerReload();
    } catch (deleteError) {
      addToast({ title: "Delete Failed", description: getColorStoriesErrorMessage(deleteError), color: "danger", radius: "full", timeout: 3000 });
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const buildPayload = (): ColorStoryPayload | null => {
    const nextErrors: StoryFormErrors = { ...initialFormErrors };
    const title = formState.title.trim();
    const excerpt = formState.excerpt.trim();
    const category = formState.category.trim();
    const palette = normalizePaletteValues(formState.palette);
    const authorName = formState.authorName.trim();
    const authorAvatar = formState.authorAvatar.trim();
    const authorReadTime = formState.authorReadTime.trim();
    const authorDateInput = formState.authorDate.trim();
    const tags = parseDelimitedValues(formState.tags);
    const status = formState.status === "1" ? 1 : 0;
    const publishedAt = toIsoDateTime(formState.publishedAt);

    if (!title) nextErrors.title = "Title is required.";
    if (!excerpt) nextErrors.excerpt = "Excerpt is required.";
    if (!category) nextErrors.category = "Category is required.";
    if (palette.length === 0) nextErrors.palette = "Add at least one hex color.";
    else if (palette.some((c) => !isValidHexColor(c))) nextErrors.palette = "Palette colors must be valid hex values like #FF6B6B.";
    if (!authorName) nextErrors.authorName = "Author name is required.";
    if (authorAvatar && !isValidUrl(authorAvatar)) nextErrors.authorAvatar = "Author avatar must be a valid URL.";
    if (!authorReadTime) nextErrors.authorReadTime = "Read time is required.";
    if (status === 1 && !publishedAt) nextErrors.publishedAt = "Published stories need a publish date and time.";

    setFormErrors(nextErrors);
    const firstError = Object.values(nextErrors).find(Boolean);
    if (firstError) {
      addToast({ title: "Validation Error", description: firstError, color: "danger", radius: "full", timeout: 3000 });
      return null;
    }

    const authorDate = authorDateInput || formatStoryDateLabel(publishedAt) || undefined;
    return {
      title, excerpt, palette, category,
      author_name: authorName,
      author_avatar: authorAvatar || null,
      author_date: authorDate || null,
      read_time: authorReadTime,
      tags, status,
      published_at: publishedAt,
    };
  };

  const handleSaveStory = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setIsSubmittingForm(true);
    try {
      if (editingStoryId) {
        const result = await updateColorStoryById(editingStoryId, payload);
        addToast({ title: "Story Updated", description: result.message ?? "Color story updated successfully.", color: "success", radius: "full", timeout: 3000 });

        // Manual state update with safe guard
        const updatedStory = result.data || result.story;
        setStories((prev) => {
          if (!updatedStory) return prev;
          return prev.map((s) => (s.id === editingStoryId ? updatedStory : s));
        });
      } else {
        const result = await createColorStory(payload);
        addToast({ title: "Story Created", description: result.message ?? "Color story created successfully.", color: "success", radius: "full", timeout: 3000 });

        // Manual state update for new story
        const newStory = result.data || result.story;
        setStories((prev) => {
          if (!newStory) return prev;
          return [newStory, ...prev];
        });
        setTotalStories((prev) => prev + 1);
      }
      onFormClose();
      resetForm();
    } catch (submitError) {
      addToast({ title: editingStoryId ? "Update Failed" : "Create Failed", description: getColorStoriesErrorMessage(submitError), color: "danger", radius: "full", timeout: 3000 });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!pendingDeleteStory) return;
    const { id } = pendingDeleteStory;
    setDeletingStoryId(id);
    try {
      const result = await deleteColorStoryById(id);
      addToast({ title: "Story Deleted", description: result.message ?? "Color story deleted successfully.", color: "success", radius: "full", timeout: 3000 });

      // Immediate state update
      setStories((prev) => prev.filter((s) => s.id !== id));
      setTotalStories((prev) => Math.max(0, prev - 1));

      if (stories.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } catch (deleteError) {
      addToast({ title: "Delete Failed", description: getColorStoriesErrorMessage(deleteError), color: "danger", radius: "full", timeout: 3000 });
    } finally {
      setDeletingStoryId(null);
      setPendingDeleteStory(null);
      onDeleteClose();
    }
  };

  const handleStatusChange = async (story: ColorStory) => {
    const nextStatus: ColorStoryStatus = story.status === 1 ? 0 : 1;
    const storyId = story.id;

    setStatusUpdatingId(storyId);

    // Optimistic update
    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId ? { ...s, status: nextStatus } : s
      )
    );

    try {
      const result = await updateColorStoryStatus(storyId, nextStatus);
      addToast({
        title: nextStatus === 1 ? "Story Published" : "Moved To Draft",
        description: result.message ?? (nextStatus === 1 ? "Color story published successfully." : "Color story moved back to draft."),
        color: "success", radius: "full", timeout: 3000,
      });

      // Verify with server response if possible
      if (result.data || result.story) {
        const updatedStory = result.data || result.story;
        setStories((prev) => {
          if (!updatedStory) return prev;
          return prev.map((s) => (s.id === storyId ? updatedStory : s));
        });
      }
    } catch (statusError) {
      // Revert on error
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId ? { ...s, status: story.status } : s
        )
      );
      addToast({ title: "Status Update Failed", description: getColorStoriesErrorMessage(statusError), color: "danger", radius: "full", timeout: 3000 });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <>
      <Card shadow="md">
        <CardBody className="gap-6 p-4 sm:p-6">
          {/* ── Header ── */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Color Stories</h2>
                <Dropdown placement="bottom-start">
                  <DropdownTrigger>
                    <Button endContent={<Icon icon="mdi:chevron-down" width={16} />} size="sm" variant="flat">
                      Categories
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Category actions">
                    <DropdownItem
                      key="manage-categories"
                      description="Search, edit, and remove existing categories"
                      startContent={<Icon icon="mdi:shape-outline" width={16} />}
                      onPress={openCategoriesModal}
                    >
                      Manage Categories
                    </DropdownItem>
                    <DropdownItem
                      key="create-category"
                      description="Add a new category option for stories"
                      startContent={<Icon icon="mdi:plus-circle-outline" width={16} />}
                      onPress={startCategoryCreate}
                    >
                      Add Category
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                <Chip color={hasActiveFilters ? "primary" : "default"} size="sm" variant="flat">
                  {hasActiveFilters ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : "Showing all stories"}
                </Chip>
                <Chip color="success" size="sm" variant="flat">{publishedStoriesOnPage} published</Chip>
                <Chip color="warning" size="sm" variant="flat">{draftStoriesOnPage} draft</Chip>
              </div>
              <p className="text-sm text-default-500">{totalStoriesLabel}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button isLoading={isLoading} startContent={!isLoading && <Icon icon="solar:refresh-bold" width={18} />} variant="flat" onPress={triggerReload}>
                Refresh
              </Button>
              <Button color="primary" startContent={<Icon icon="mdi:plus" width={18} />} onPress={openCreateModal}>
                Add Story
              </Button>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="bg-content1">
            <ColorStoriesFilters
              categories={categories}
              hasActiveFilters={hasActiveFilters}
              isLoading={isLoading}
              values={filters}
              onCategoryChange={(value) => handleFilterChange("category", value)}
              onClear={handleClearFilters}
              onSearchChange={(value) => handleFilterChange("search", value)}
              onStatusChange={(value) => handleFilterChange("status", value)}
            />
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {/* ── desktop ── */}
          <div className="hidden xl:block">
            <Table
              aria-label="Color stories table"
              classNames={{
                base: "min-h-[320px]",
                wrapper: "overflow-x-auto shadow-none p-0 bg-transparent",
                table: "w-full",
                th: "bg-default-100 text-[11px] font-semibold uppercase tracking-[0.16em] text-default-600",
                td: "py-4 align-top",
                emptyWrapper: "py-14 text-default-500",
              }}
            >
              <TableHeader>
                <TableColumn className="w-[22%]">Story</TableColumn>
                <TableColumn className="w-[10%]">Category</TableColumn>
                <TableColumn className="w-[15%]">Palette</TableColumn>
                <TableColumn className="w-[15%]">Author</TableColumn>
                <TableColumn className="w-[12%]">Tags</TableColumn>
                <TableColumn className="w-[10%]">Status</TableColumn>
                <TableColumn className="w-[8%]">Updated</TableColumn>
                <TableColumn className="w-[8%] text-right">Action</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={emptyStoriesContent}
                isLoading={isLoading}
                items={stories}
                loadingContent={<Spinner label="Loading color stories..." />}
              >
                {(story: ColorStory) => (
                  <TableRow
                    key={String(story.id)}
                    className="cursor-pointer transition-colors hover:bg-default-50 focus-within:bg-default-50"
                    tabIndex={0}
                    onClick={() => openViewModal(story.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openViewModal(story.id); }
                    }}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{story.title || "-"}</p>
                          <span className="text-xs text-default-400">#{story.id}</span>
                        </div>
                        <p className="line-clamp-3 text-sm text-default-500">{story.excerpt || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell><Chip size="sm" variant="flat">{story.category || "-"}</Chip></TableCell>
                    <TableCell>
                      {story.palette.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {story.palette.slice(0, 5).map((color) => (
                              <span key={color} className="h-6 w-6 rounded-full border border-default-200 shadow-sm" style={{ backgroundColor: color }} title={color} />
                            ))}
                          </div>
                          <p className="text-xs font-mono text-default-500">{story.palette.join(", ")}</p>
                        </div>
                      ) : <span className="text-sm text-default-500">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <Avatar className="shrink-0 bg-primary text-white font-semibold" name={getAuthorInitials(story.author.name)} radius="full" size="sm" src={story.author.avatar} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{story.author.name || "-"}</p>
                          <p className="text-xs text-default-500">{story.author.readTime || "Read time not set"}</p>
                          <p className="text-xs text-default-400">{story.author.date || formatStoryDateLabel(story.published_at) || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {story.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {story.tags.slice(0, 2).map((tag) => <Chip key={tag} size="sm" variant="flat">{tag}</Chip>)}
                          {story.tags.length > 2 ? (
                            <Tooltip content={story.tags.join(", ")}>
                              <Chip size="sm" variant="flat">+{story.tags.length - 2}</Chip>
                            </Tooltip>
                          ) : null}
                        </div>
                      ) : <span className="text-sm text-default-500">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Chip color={getStatusColor(story.status)} size="sm" variant="flat">{getStatusLabel(story.status)}</Chip>
                        <p className="text-xs text-default-500">{story.published_at ? formatDateTime(story.published_at) : "Not published"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-default-600">{formatDateTime(story.updated_at || story.created_at)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Tooltip content="Edit story">
                          <Button isIconOnly color="secondary" size="sm" startContent={<Icon height={16} icon="mdi:pencil-outline" width={16} />} variant="flat" onClick={(e) => e.stopPropagation()} onPress={() => openEditModal(story.id)} />
                        </Tooltip>
                        <Tooltip content={story.status === 1 ? "Move to draft" : "Publish story"}>
                          <Button isIconOnly color={story.status === 1 ? "warning" : "success"} isDisabled={statusUpdatingId !== null || deletingStoryId !== null} isLoading={statusUpdatingId === story.id} size="sm" startContent={statusUpdatingId !== story.id ? <Icon height={16} icon={story.status === 1 ? "mdi:file-document-edit-outline" : "mdi:publish"} width={16} /> : undefined} variant="flat" onClick={(e) => e.stopPropagation()} onPress={() => handleStatusChange(story)} />
                        </Tooltip>
                        <Tooltip content="Delete story">
                          <Button isIconOnly color="danger" isDisabled={deletingStoryId !== null || statusUpdatingId !== null} isLoading={deletingStoryId === story.id} size="sm" startContent={deletingStoryId !== story.id ? <Icon height={16} icon="mdi:delete-outline" width={16} /> : undefined} variant="flat" onClick={(e) => e.stopPropagation()} onPress={() => openDeleteModal(story)} />
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Mobile card list ── */}
          <div className="grid md:grid-cols-2 gap-3 xl:hidden">
            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Spinner label="Loading color stories..." />
              </div>
            ) : stories.length === 0 ? (
              emptyStoriesContent
            ) : (
              stories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-2xl border border-default-200 bg-content1 p-4 space-y-3 cursor-pointer active:bg-default-50 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => openViewModal(story.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openViewModal(story.id); } }}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold text-foreground text-sm leading-snug">{story.title || "-"}</p>
                        <span className="text-xs text-default-400">#{story.id}</span>
                      </div>
                      <p className="line-clamp-2 text-xs text-default-500 mt-1">{story.excerpt || "-"}</p>
                    </div>
                    <Chip color={getStatusColor(story.status)} size="sm" variant="flat" className="shrink-0">
                      {getStatusLabel(story.status)}
                    </Chip>
                  </div>

                  {/* Author + Category row */}
                  <div className="flex items-center gap-3">
                    <Avatar className="shrink-0 bg-primary text-white font-semibold" name={getAuthorInitials(story.author.name)} radius="full" size="sm" src={story.author.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{story.author.name || "-"}</p>
                      <p className="text-xs text-default-400">{story.author.readTime || "Read time not set"}</p>
                    </div>
                    <Chip size="sm" variant="flat" className="shrink-0">{story.category || "-"}</Chip>
                  </div>

                  {/* Palette */}
                  {story.palette.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {story.palette.slice(0, 6).map((color) => (
                        <span key={color} className="h-5 w-5 rounded-full border border-default-200 shadow-sm" style={{ backgroundColor: color }} title={color} />
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {story.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {story.tags.slice(0, 3).map((tag) => <Chip key={tag} size="sm" variant="flat">{tag}</Chip>)}
                      {story.tags.length > 3 && <Chip size="sm" variant="flat">+{story.tags.length - 3}</Chip>}
                    </div>
                  )}

                  {/* Updated + Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-default-100">
                    <p className="text-xs text-default-400">{formatDateTime(story.updated_at || story.created_at)}</p>
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Tooltip content="Edit story">
                        <Button isIconOnly color="secondary" size="sm" startContent={<Icon height={15} icon="mdi:pencil-outline" width={15} />} variant="flat" onPress={() => openEditModal(story.id)} />
                      </Tooltip>
                      <Tooltip content={story.status === 1 ? "Move to draft" : "Publish story"}>
                        <Button isIconOnly color={story.status === 1 ? "warning" : "success"} isDisabled={statusUpdatingId !== null || deletingStoryId !== null} isLoading={statusUpdatingId === story.id} size="sm" startContent={statusUpdatingId !== story.id ? <Icon height={15} icon={story.status === 1 ? "mdi:file-document-edit-outline" : "mdi:publish"} width={15} /> : undefined} variant="flat" onPress={() => handleStatusChange(story)} />
                      </Tooltip>
                      <Tooltip content="Delete story">
                        <Button isIconOnly color="danger" isDisabled={deletingStoryId !== null || statusUpdatingId !== null} isLoading={deletingStoryId === story.id} size="sm" startContent={deletingStoryId !== story.id ? <Icon height={15} icon="mdi:delete-outline" width={15} /> : undefined} variant="flat" onPress={() => openDeleteModal(story)} />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Pagination ── */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              disallowEmptySelection
              className="w-full sm:w-28"
              label="Limit"
              selectedKeys={[String(limit)]}
              size="sm"
              onChange={(e) => {
                const nextLimit = Number(e.target.value);
                if (nextLimit !== limit) { setLimit(nextLimit); setPage(1); }
              }}
            >
              <SelectItem key="10">10</SelectItem>
              <SelectItem key="25">25</SelectItem>
              <SelectItem key="50">50</SelectItem>
            </Select>

            <div className="flex justify-center sm:justify-end">
              <Pagination showControls color="primary" isDisabled={isLoading} page={page} total={Math.max(totalPages, 1)} onChange={setPage} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── View Modal ── */}
      <Modal
        backdrop="blur"
        isOpen={isViewModalOpen}
        size="full"
        classNames={{
          base: "sm:max-w-2xl",
          body: "overflow-y-auto scrollbar-hide max-h-[90vh]",
        }}
        onOpenChange={onViewOpenChange}
      >
        <ModalContent>
          <ModalHeader className="text-sm sm:text-base font-semibold">
            Color Story
          </ModalHeader>

          <ModalBody className="pb-4 px-3 sm:px-5">
            {isViewLoading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <Spinner label="Loading story..." />
              </div>
            ) : selectedStory ? (
              <div className="space-y-4">

                {/* Title */}
                <Input
                  isReadOnly
                  label="Title"
                  value={selectedStory.title || "-"}
                  variant="flat"
                />

                {/* Excerpt */}
                <Textarea
                  isReadOnly
                  label="Excerpt"
                  minRows={3}
                  value={selectedStory.excerpt || "-"}
                  variant="flat"
                />

                {/* Grid 1 */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    isReadOnly
                    label="Category"
                    value={selectedStory.category || "-"}
                    variant="flat"
                  />
                  <Input
                    isReadOnly
                    label="Status"
                    value={getStatusLabel(selectedStory.status)}
                    variant="flat"
                  />
                </div>

                {/* Grid 2 */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    isReadOnly
                    label="Published At"
                    value={formatDateTime(selectedStory.published_at)}
                    variant="flat"
                  />
                  <Input
                    isReadOnly
                    label="Updated At"
                    value={formatDateTime(
                      selectedStory.updated_at || selectedStory.created_at,
                    )}
                    variant="flat"
                  />
                </div>

                {/* Author */}
                <div className="rounded-2xl border border-default-200 bg-default-50 p-3 sm:p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar
                      className="bg-primary text-white font-semibold"
                      name={getAuthorInitials(selectedStory.author.name)}
                      radius="full"
                      src={selectedStory.author.avatar}
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedStory.author.name || "-"}
                      </p>
                      <p className="text-xs text-default-500">
                        {selectedStory.author.readTime || "Read time not set"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      isReadOnly
                      label="Author Avatar"
                      value={selectedStory.author.avatar || "-"}
                      variant="flat"
                    />
                    <Input
                      isReadOnly
                      label="Story Date Label"
                      value={
                        selectedStory.author.date ||
                        formatStoryDateLabel(selectedStory.published_at) ||
                        "-"
                      }
                      variant="flat"
                    />
                  </div>
                </div>

                {/* Palette */}
                <div className="rounded-2xl border border-default-200 bg-default-50 p-3 sm:p-4">
                  <p className="mb-3 text-sm font-semibold">Palette</p>

                  {selectedStory.palette.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedStory.palette.map((color) => (
                        <div
                          key={color}
                          className="flex items-center gap-2 rounded-full border border-default-200 bg-content1 px-3 py-1.5"
                        >
                          <span
                            className="h-5 w-5 rounded-full border border-default-200"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-mono text-default-600">
                            {color}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-default-500">
                      No palette colors set.
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="rounded-2xl border border-default-200 bg-default-50 p-3 sm:p-4">
                  <p className="mb-3 text-sm font-semibold">Tags</p>

                  {selectedStory.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedStory.tags.map((tag) => (
                        <Chip key={tag} size="sm" variant="flat">
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-default-500">
                      No tags added.
                    </p>
                  )}
                </div>

              </div>
            ) : (
              <p className="text-sm text-default-500">
                Story not found.
              </p>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ── Form Modal ── */}
      <Modal
        backdrop="blur"
        isOpen={isFormModalOpen}
        size="2xl"
        classNames={{ base: "h-[90dvh] mx-2 sm:mx-auto", body: "overflow-y-auto" }}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isSubmittingForm) resetForm();
          if (!isOpen) onFormClose();
        }}
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">
            {isEditMode ? "Edit Color Story" : "Create Color Story"}
          </ModalHeader>
          <ModalBody className="pb-2">
            {isFormLoading ? (
              <div className="flex min-h-[240px] items-center justify-center"><Spinner label="Loading story..." /></div>
            ) : (
              <div className="space-y-4">
                <Input isRequired errorMessage={formErrors.title} isInvalid={Boolean(formErrors.title)} label="Title" value={formState.title} onValueChange={(v) => handleFormValueChange("title", v)} />
                <Textarea isRequired errorMessage={formErrors.excerpt} isInvalid={Boolean(formErrors.excerpt)} label="Excerpt" minRows={3} placeholder="Short summary shown on the list and frontend surfaces" value={formState.excerpt} onValueChange={(v) => handleFormValueChange("excerpt", v)} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Dropdown placement="bottom-start">
                      <DropdownTrigger>
                        <Button className={`h-14 w-full justify-between border bg-transparent px-4 ${formErrors.category ? "border-danger" : "border-default-200"}`} variant="light">
                          <div className="flex flex-col items-start">
                            <span className="text-xs text-default-500">Category</span>
                            <span className={formState.category ? "text-sm text-foreground" : "text-sm text-default-500"}>
                              {formState.category || "Select a category"}
                            </span>
                          </div>
                          <Icon className="text-default-400" icon="mdi:chevron-down" width={18} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Category selection" items={categories} onAction={(key) => handleFormValueChange("category", String(key))}>
                        {(item) => (
                          <DropdownItem key={item.name} startContent={formState.category === item.name ? <Icon icon="mdi:check" width={16} /> : undefined}>
                            {item.name}
                          </DropdownItem>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                    {formErrors.category ? <p className="text-xs text-danger">{formErrors.category}</p> : null}
                  </div>

                  <Select
                    disallowEmptySelection isRequired label="Status" selectedKeys={[formState.status]} variant="bordered"
                    onSelectionChange={(keys) => {
                      if (keys === "all") return;
                      const [selectedKey] = Array.from(keys as Set<Key>);
                      handleFormValueChange("status", selectedKey === "1" ? "1" : "0");
                    }}
                  >
                    <SelectItem key="0">Draft</SelectItem>
                    <SelectItem key="1">Published</SelectItem>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input errorMessage={formErrors.publishedAt} isInvalid={Boolean(formErrors.publishedAt)} label="Published At" type="datetime-local" value={formState.publishedAt} onValueChange={(v) => handleFormValueChange("publishedAt", v)} />
                  <Input label="Story Date Label" placeholder="Mar 5, 2026" value={formState.authorDate} onValueChange={(v) => handleFormValueChange("authorDate", v)} />
                </div>

                <Textarea isRequired errorMessage={formErrors.palette} isInvalid={Boolean(formErrors.palette)} label="Palette" minRows={3} placeholder="#FF6B6B, #FFE66D, #4ECDC4" value={formState.palette} onValueChange={(v) => handleFormValueChange("palette", v)} />

                {normalizePaletteValues(formState.palette).length > 0 && (
                  <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-foreground">Palette Preview</p>
                    <div className="flex flex-wrap gap-2">
                      {normalizePaletteValues(formState.palette).map((color) => (
                        <div key={color} className="flex items-center gap-2 rounded-full border border-default-200 bg-content1 px-3 py-1.5">
                          <span className="h-5 w-5 rounded-full border border-default-200" style={{ backgroundColor: color }} />
                          <span className="text-xs font-mono text-default-600">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                  <p className="mb-4 text-sm font-semibold text-foreground">Author</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input isRequired errorMessage={formErrors.authorName} isInvalid={Boolean(formErrors.authorName)} label="Author Name" value={formState.authorName} onValueChange={(v) => handleFormValueChange("authorName", v)} />
                    <Input isRequired errorMessage={formErrors.authorReadTime} isInvalid={Boolean(formErrors.authorReadTime)} label="Read Time" placeholder="6 min read" value={formState.authorReadTime} onValueChange={(v) => handleFormValueChange("authorReadTime", v)} />
                  </div>
                  <Input className="mt-4" errorMessage={formErrors.authorAvatar} isInvalid={Boolean(formErrors.authorAvatar)} label="Author Avatar URL" placeholder="https://example.com/avatar.jpg" value={formState.authorAvatar} onValueChange={(v) => handleFormValueChange("authorAvatar", v)} />
                </div>

                <Input label="Tags" placeholder="Research, UX, Conversion" value={formState.tags} onValueChange={(v) => handleFormValueChange("tags", v)} />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button isDisabled={isSubmittingForm} variant="flat" onPress={() => { onFormClose(); resetForm(); }}>Cancel</Button>
            <Button color="primary" isLoading={isSubmittingForm} onPress={handleSaveStory}>
              {isEditMode ? "Update Story" : "Create Story"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Categories Modal ── */}
      <Modal
        backdrop="blur"
        isOpen={isCategoriesModalOpen}
        size="2xl"
        classNames={{ base: "mx-2 sm:mx-auto" }}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isSubmittingCategory) { resetCategoryForm(); setCategorySearch(""); }
          if (!isOpen) onCategoriesClose();
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-base font-semibold">Category Management</span>
            <span className="text-sm font-normal text-default-500">Create, edit, and delete the category list connected to Color Stories.</span>
          </ModalHeader>
          <ModalBody className="pb-2">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input isClearable label={isEditingCategory ? "Edit Category" : "New Category"} placeholder="Editorial" value={categoryDraftName} variant="bordered" onClear={resetCategoryForm} onValueChange={setCategoryDraftName} />
              <Button className="sm:self-end w-full sm:w-auto" color="primary" isLoading={isSubmittingCategory} onPress={handleSaveCategory}>
                {isEditingCategory ? "Update Category" : "Add Category"}
              </Button>
            </div>

            <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Input isClearable className="w-full sm:max-w-sm" label="Search Categories" placeholder="Search category names"
                  startContent={<Icon className="text-default-400" height={18} icon="mdi:magnify" width={18} />}
                  value={categorySearch} variant="bordered" onClear={() => setCategorySearch("")} onValueChange={setCategorySearch}
                />
                <Chip color="primary" size="sm" variant="flat">{categories.length} total</Chip>
              </div>

              {isCategoriesLoading ? (
                <div className="flex min-h-[180px] items-center justify-center"><Spinner label="Loading categories..." /></div>
              ) : visibleCategories.length > 0 ? (
                <div className="space-y-3">
                  {visibleCategories.map((category) => (
                    <div key={category.id} className="flex flex-col gap-3 rounded-2xl border border-default-200 bg-content1 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{category.name}</p>
                          <Chip size="sm" variant="flat">{getCategoryStoriesLabel(category.stories_count)}</Chip>
                        </div>
                        <p className="text-xs text-default-500">Updated {formatDateTime(category.updated_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button color="secondary" size="sm" startContent={<Icon icon="mdi:pencil-outline" width={16} />} variant="flat" onPress={() => startCategoryEdit(category)}>Edit</Button>
                        <Button color="danger" isDisabled={deletingCategoryId !== null || isSubmittingCategory} isLoading={deletingCategoryId === category.id} size="sm" startContent={deletingCategoryId !== category.id ? <Icon icon="mdi:delete-outline" width={16} /> : undefined} variant="flat" onPress={() => handleDeleteCategory(category)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-medium text-foreground">{categorySearch.trim() ? "No categories match this search." : "No categories created yet."}</p>
                  <p className="text-sm text-default-500">{categorySearch.trim() ? "Try another keyword or add a new category above." : "Add your first category to power the story dropdowns."}</p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button isDisabled={isSubmittingCategory || deletingCategoryId !== null} variant="flat" onPress={() => { onCategoriesClose(); resetCategoryForm(); setCategorySearch(""); }}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal backdrop="blur" hideCloseButton={deletingStoryId !== null} isDismissable={deletingStoryId === null} isOpen={isDeleteModalOpen} classNames={{ base: "mx-2 sm:mx-auto" }} onOpenChange={onDeleteOpenChange}>
        <ModalContent>
          <ModalHeader className="text-base font-semibold">Delete Story</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{pendingDeleteStory?.title ?? "this story"}</span>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button isDisabled={deletingStoryId !== null} variant="flat" onPress={onDeleteClose}>Cancel</Button>
            <Button color="danger" isLoading={deletingStoryId === pendingDeleteStory?.id} onPress={handleDeleteStory}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
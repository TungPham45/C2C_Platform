import { FC, FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

const ADMIN_API_BASE_URL = '/api/admin';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  icon_url: string | null;
  children?: Category[];
}

interface Attribute {
  id: number;
  name: string;
  input_type: string;
  is_required: boolean;
  sort_order?: number;
  options?: { id: number; value_name: string; sort_order?: number }[];
}

interface CategoryFormState {
  name: string;
  slug: string;
  parent_id: string;
  sort_order: string;
  icon_url: string;
  is_active: boolean;
}

interface AttributeFormState {
  name: string;
  input_type: string;
  is_required: boolean;
  sort_order: string;
}

interface AttributeOptionDraft {
  id?: number;
  value_name: string;
  sort_order?: number;
}

const createDefaultCategoryForm = (selectedCategory: Category | null): CategoryFormState => ({
  name: '',
  slug: '',
  parent_id: selectedCategory ? String(selectedCategory.id) : '',
  sort_order: '',
  icon_url: '',
  is_active: true,
});

const createCategoryFormFromCategory = (category: Category): CategoryFormState => ({
  name: category.name,
  slug: category.slug,
  parent_id: category.parent_id ? String(category.parent_id) : '',
  sort_order: String(category.sort_order ?? 0),
  icon_url: category.icon_url ?? '',
  is_active: category.is_active,
});

const createDefaultAttributeForm = (): AttributeFormState => ({
  name: '',
  input_type: 'radio',
  is_required: false,
  sort_order: '',
});

const OPTION_INPUT_TYPES = new Set(['select', 'radio', 'checkbox', 'multiselect']);

const normalizeAttributeInputType = (inputType: string) => inputType.trim().toLowerCase();

const supportsAttributeOptions = (
  inputType: string,
  options?: { id: number; value_name: string; sort_order?: number }[] | AttributeOptionDraft[],
) => OPTION_INPUT_TYPES.has(normalizeAttributeInputType(inputType)) || Boolean(options?.length);

const createAttributeOptionDrafts = (
  inputType: string,
  options?: { id: number; value_name: string; sort_order?: number }[],
): AttributeOptionDraft[] => {
  if (options && options.length > 0) {
    return options.map((option) => ({
      id: option.id,
      value_name: option.value_name,
      sort_order: option.sort_order,
    }));
  }

  return supportsAttributeOptions(inputType, options) ? [{ value_name: '' }] : [];
};

const CategoryManagement: FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [submittingAttribute, setSubmittingAttribute] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(createDefaultCategoryForm(null));
  const [attributeForm, setAttributeForm] = useState<AttributeFormState>(createDefaultAttributeForm());
  const [attributeOptions, setAttributeOptions] = useState<AttributeOptionDraft[]>(createAttributeOptionDrafts('radio'));
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [parentSelectionPath, setParentSelectionPath] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const flattenedCategories = useMemo(() => {
    const flattened: Category[] = [];

    const walk = (nodes: Category[]) => {
      nodes.forEach((node) => {
        flattened.push(node);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };

    walk(categories);
    return flattened;
  }, [categories]);

  const categoryLookup = useMemo(
    () => new Map(flattenedCategories.map((category) => [category.id, category])),
    [flattenedCategories],
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, statsRes] = await Promise.all([
        fetch(`${ADMIN_API_BASE_URL}/categories`),
        fetch(`${ADMIN_API_BASE_URL}/dashboard`)
      ]);
      if (!catRes.ok) throw new Error(await getResponseError(catRes, 'Failed to fetch categories'));
      if (!statsRes.ok) throw new Error(await getResponseError(statsRes, 'Failed to fetch admin dashboard'));
      const catData = await catRes.json();
      const statsData = await statsRes.json();
      
      setCategories(buildTree(catData));
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch category data');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flat: Category[]) => {
    const tree: Category[] = [];
    const map = new Map<number, Category>();
    
    flat.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] });
    });
    
    flat.forEach(cat => {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });
    
    return tree;
  };

  const loadAttributes = async (catId: number) => {
    try {
      setError(null);
      const res = await fetch(`${ADMIN_API_BASE_URL}/categories/${catId}/attributes`);
      if (!res.ok) throw new Error(await getResponseError(res, 'Failed to fetch category attributes'));
      const data = await res.json();
      setAttributes(data);
    } catch (error) {
      console.error('Error loading attributes:', error);
      setAttributes([]);
      setError(error instanceof Error ? error.message : 'Failed to load category attributes');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    loadAttributes(cat.id);
  };

  const buildParentSelectionPath = (categoryId: number | null) => {
    if (!categoryId) return [];

    const path: number[] = [];
    let currentId: number | null = categoryId;

    while (currentId) {
      const currentCategory = categoryLookup.get(currentId);
      if (!currentCategory) break;

      path.unshift(currentCategory.id);
      currentId = currentCategory.parent_id;
    }

    return path;
  };

  const handleParentLevelChange = (levelIndex: number, value: string) => {
    const nextPath = parentSelectionPath.slice(0, levelIndex);

    if (value) {
      nextPath.push(Number(value));
    }

    setParentSelectionPath(nextPath);
    setCategoryForm((prev) => ({
      ...prev,
      parent_id: nextPath.length > 0 ? String(nextPath[nextPath.length - 1]) : '',
    }));
  };

  const parentSelectionLevels = useMemo(() => {
    const levels: Category[][] = [];
    let currentLevelCategories = categories;
    let depth = 0;

    while (currentLevelCategories.length > 0) {
      levels.push(currentLevelCategories);

      const selectedId = parentSelectionPath[depth];
      if (!selectedId) break;

      const selectedCategoryAtLevel = currentLevelCategories.find((category) => category.id === selectedId);
      if (!selectedCategoryAtLevel?.children?.length) break;

      currentLevelCategories = selectedCategoryAtLevel.children;
      depth += 1;
    }

    return levels;
  }, [categories, parentSelectionPath]);

  const selectedParentCategories = parentSelectionPath
    .map((categoryId) => categoryLookup.get(categoryId))
    .filter((category): category is Category => Boolean(category));

  const openCategoryModal = () => {
    setError(null);
    setSuccessMessage(null);
    setEditingCategory(null);
    setCategoryForm(createDefaultCategoryForm(selectedCategory));
    setParentSelectionPath(buildParentSelectionPath(selectedCategory?.id ?? null));
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setError(null);
    setSuccessMessage(null);
    setEditingCategory(category);
    setCategoryForm(createCategoryFormFromCategory(category));
    setParentSelectionPath(buildParentSelectionPath(category.parent_id));
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (submittingCategory) return;
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryForm(createDefaultCategoryForm(selectedCategory));
    setParentSelectionPath(buildParentSelectionPath(selectedCategory?.id ?? null));
  };

  const openAttributeModal = () => {
    if (!selectedCategory) return;
    setError(null);
    setSuccessMessage(null);
    setEditingAttribute(null);
    setAttributeForm(createDefaultAttributeForm());
    setAttributeOptions(createAttributeOptionDrafts('radio'));
    setIsAttributeModalOpen(true);
  };

  const openEditAttributeModal = (attribute: Attribute) => {
    setError(null);
    setSuccessMessage(null);
    setEditingAttribute(attribute);
    const normalizedInputType = normalizeAttributeInputType(attribute.input_type);
    setAttributeForm({
      name: attribute.name,
      input_type: normalizedInputType,
      is_required: attribute.is_required,
      sort_order: attribute.sort_order !== undefined ? String(attribute.sort_order) : '',
    });
    setAttributeOptions(createAttributeOptionDrafts(normalizedInputType, attribute.options));
    setIsAttributeModalOpen(true);
  };

  const closeAttributeModal = () => {
    if (submittingAttribute) return;
    setIsAttributeModalOpen(false);
    setEditingAttribute(null);
    setAttributeForm(createDefaultAttributeForm());
    setAttributeOptions(createAttributeOptionDrafts('radio'));
  };

  const handleAttributeTypeChange = (inputType: string) => {
    const normalizedInputType = normalizeAttributeInputType(inputType);
    setAttributeForm((prev) => ({ ...prev, input_type: normalizedInputType }));
    setAttributeOptions((prev) =>
      supportsAttributeOptions(normalizedInputType, prev) && prev.length > 0
        ? prev
        : createAttributeOptionDrafts(normalizedInputType),
    );
  };

  const handleAttributeOptionChange = (index: number, value: string) => {
    setAttributeOptions((prev) =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? { ...option, value_name: value } : option,
      ),
    );
  };

  const handleAddAttributeOptionField = () => {
    setAttributeOptions((prev) => [...prev, { value_name: '' }]);
  };

  const handleRemoveAttributeOptionField = (index: number) => {
    setAttributeOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = categoryForm.name.trim();
    if (!trimmedName) {
      setError('Category name is required.');
      return;
    }

    const isEditingCategory = Boolean(editingCategory);
    const parentId = isEditingCategory
      ? editingCategory?.parent_id ?? null
      : categoryForm.parent_id
        ? Number(categoryForm.parent_id)
        : null;
    const parentCategory = parentId
      ? flattenedCategories.find((category) => category.id === parentId) ?? null
      : null;

    try {
      setSubmittingCategory(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(isEditingCategory ? `${ADMIN_API_BASE_URL}/categories/${editingCategory!.id}` : `${ADMIN_API_BASE_URL}/categories`, {
        method: isEditingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          slug: categoryForm.slug.trim() || undefined,
          parent_id: parentId,
          sort_order: categoryForm.sort_order ? Number(categoryForm.sort_order) : 0,
          icon_url: categoryForm.icon_url.trim() || null,
          is_active: categoryForm.is_active,
          level: isEditingCategory ? editingCategory!.level : parentCategory ? parentCategory.level + 1 : 1,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, isEditingCategory ? 'Failed to update category' : 'Failed to create category'),
        );
      }

      const savedCategory = await response.json();

      await fetchData();
      setSelectedCategory(savedCategory);
      await loadAttributes(savedCategory.id);
      if (!isEditingCategory && parentId) {
        setExpandedIds((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
      }
      setSuccessMessage(
        isEditingCategory
          ? `Updated category "${savedCategory.name}".`
          : `Created category "${savedCategory.name}".`,
      );
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm(createDefaultCategoryForm(savedCategory));
      setParentSelectionPath(buildParentSelectionPath(savedCategory.id));
    } catch (submitError) {
      console.error('Error saving category:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditingCategory
            ? 'Failed to update category'
            : 'Failed to create category',
      );
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleAttributeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCategory) {
      setError('Select a category before adding an attribute.');
      return;
    }

    const trimmedName = attributeForm.name.trim();
    if (!trimmedName) {
      setError('Attribute name is required.');
      return;
    }

    const normalizedInputType = normalizeAttributeInputType(attributeForm.input_type);
    const normalizedOptions = supportsAttributeOptions(normalizedInputType, attributeOptions)
      ? attributeOptions
          .map((option, index) => ({
            id: option.id,
            value_name: option.value_name.trim(),
            sort_order: index,
          }))
          .filter((option) => option.value_name.length > 0)
      : [];

    if (supportsAttributeOptions(normalizedInputType, attributeOptions) && normalizedOptions.length === 0) {
      setError('At least one option is required for this input type.');
      return;
    }

    try {
      setSubmittingAttribute(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        name: trimmedName,
        input_type: normalizedInputType,
        is_required: attributeForm.is_required,
        sort_order: attributeForm.sort_order ? Number(attributeForm.sort_order) : 0,
      };

      const attributeResponse = await fetch(
        editingAttribute
          ? `${ADMIN_API_BASE_URL}/attributes/${editingAttribute.id}`
          : `${ADMIN_API_BASE_URL}/categories/${selectedCategory.id}/attributes`,
        {
          method: editingAttribute ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!attributeResponse.ok) {
        throw new Error(
          await getResponseError(
            attributeResponse,
            editingAttribute ? 'Failed to update attribute' : 'Failed to create attribute',
          ),
        );
      }

      const savedAttribute = await attributeResponse.json();

      const existingOptions = editingAttribute?.options ?? [];
      const keptOptionIds = new Set(
        normalizedOptions
          .map((option) => option.id)
          .filter((optionId): optionId is number => optionId !== undefined),
      );

      await Promise.all(
        existingOptions
          .filter((option) => !keptOptionIds.has(option.id))
          .map(async (option) => {
            const deleteResponse = await fetch(`${ADMIN_API_BASE_URL}/attribute-options/${option.id}`, {
              method: 'DELETE',
            });

            if (!deleteResponse.ok) {
              throw new Error(await getResponseError(deleteResponse, 'Failed to delete attribute option'));
            }
          }),
      );

      await Promise.all(
        normalizedOptions.map(async (option) => {
          const optionResponse = await fetch(
            option.id
              ? `${ADMIN_API_BASE_URL}/attribute-options/${option.id}`
              : `${ADMIN_API_BASE_URL}/attributes/${savedAttribute.id}/options`,
            {
              method: option.id ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                value_name: option.value_name,
                sort_order: option.sort_order,
              }),
            },
          );

          if (!optionResponse.ok) {
            throw new Error(
              await getResponseError(
                optionResponse,
                option.id ? 'Failed to update attribute option' : 'Failed to create attribute option',
              ),
            );
          }
        }),
      );

      await loadAttributes(selectedCategory.id);
      await fetchData();
      setSuccessMessage(
        editingAttribute
          ? `Updated attribute "${savedAttribute.name}".`
          : `Added attribute "${savedAttribute.name}" to "${selectedCategory.name}".`,
      );
      setIsAttributeModalOpen(false);
      setEditingAttribute(null);
      setAttributeForm(createDefaultAttributeForm());
      setAttributeOptions(createAttributeOptionDrafts('radio'));
    } catch (submitError) {
      console.error('Error creating attribute:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : editingAttribute
            ? 'Failed to update attribute'
            : 'Failed to create attribute',
      );
    } finally {
      setSubmittingAttribute(false);
    }
  };

  const handleDeleteAttribute = async (attribute: Attribute) => {
    if (!selectedCategory) return;
    if (!window.confirm(`Delete attribute "${attribute.name}"?`)) return;

    try {
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`${ADMIN_API_BASE_URL}/attributes/${attribute.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response, 'Failed to delete attribute'));
      }

      await loadAttributes(selectedCategory.id);
      await fetchData();
      setSuccessMessage(`Deleted attribute "${attribute.name}".`);
    } catch (deleteError) {
      console.error('Error deleting attribute:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete attribute');
    }
  };

  const renderCategoryNode = (node: Category) => {
    const isExpanded = expandedIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedCategory?.id === node.id;

    return (
      <div key={node.id} className="ml-4">
        <div 
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-[#00629d] text-white' : 'hover:bg-[#e9f5ff]'
          }`}
          onClick={() => handleSelectCategory(node)}
        >
          {hasChildren ? (
            <span 
              className="material-symbols-outlined text-sm select-none"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          ) : (
            <span className="w-4"></span>
          )}
          <span className="material-symbols-outlined text-sm">
            {isSelected ? 'folder_open' : 'folder'}
          </span>
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {isExpanded && hasChildren && (
          <div className="border-l border-[#e1f0fb] ml-2">
            {node.children!.map(child => renderCategoryNode(child))}
          </div>
        )}
      </div>
    );
  };

  const isEditingAttribute = Boolean(editingAttribute);
  const showOptionSection = supportsAttributeOptions(attributeForm.input_type, attributeOptions);

  return (
    <AdminLayout pageTitle="Quản lý Danh mục">
      <div className="max-w-[1400px] mx-auto">
        {successMessage && (
          <div className="mb-6 rounded-2xl border border-[#cde7d3] bg-[#f4fff6] px-4 py-3 text-sm text-[#245b31]">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm text-[#ba1a1a]">
            {error}
          </div>
        )}
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Tổng danh mục', value: stats?.totalCategories || 0, icon: 'category', sub: '+5 tháng này', color: 'bg-blue-500' },
            { label: 'Danh mục chính', value: stats?.rootCategories || 0, icon: 'account_tree', sub: 'Phân khúc cao nhất', color: 'bg-indigo-500' },
            { label: 'Thuộc tính tối đa', value: stats?.maxAttributes || 0, icon: 'rule', sub: 'Danh mục: Điện tử', color: 'bg-purple-500' },
            { label: 'Cập nhật cuối', value: '14:20', icon: 'update', sub: 'Bởi Admin-02', color: 'bg-emerald-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[24px] border border-[#e1f0fb] shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${stat.color.replace('bg-', 'text-')}`}>
                  {stat.icon}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#707882] uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-[#0f1d25]">{stat.value}</h3>
                  <span className="text-[10px] text-[#707882]">{stat.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-8 h-[calc(100vh-320px)]">
          {/* Left Panel: Tree View */}
          <div className="w-[400px] bg-white rounded-[32px] border border-[#e1f0fb] shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e1f0fb] flex items-center justify-between">
              <h4 className="font-bold text-[#0f1d25]">Cau truc cay</h4>
              <button type="button" className="text-[#00629d] text-xs font-bold hover:underline" onClick={() => setExpandedIds([])}>
                Thu gon tat ca
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-[#f5faff] rounded-xl"></div>)}
                </div>
              ) : (
                categories.map(cat => renderCategoryNode(cat))
              )}
            </div>
            <div className="p-4 bg-[#f5faff]">
              <button type="button" className="w-full py-3 bg-[#00629d] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00629d20] hover:bg-[#005183] transition-all" onClick={openCategoryModal}>
                <span className="material-symbols-outlined">add_circle</span>
                Thêm danh mục mới
              </button>
            </div>
          </div>

          {/* Right Panel: Attributes */}
          <div className="flex-1 bg-white rounded-[32px] border border-[#e1f0fb] shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e1f0fb] flex items-center justify-between bg-gradient-to-r from-white to-[#f5faff]">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-[#0f1d25]">Bộ thuộc tính (Attribute Rules)</h4>
                {selectedCategory && (
                  <span className="px-3 py-1 bg-[#00629d] bg-opacity-10 text-[#00629d] text-[10px] font-bold rounded-full uppercase tracking-widest">
                    {selectedCategory.name}
                  </span>
                )}
              </div>
              <button type="button" className="flex items-center gap-2 text-[#00629d] text-sm font-bold bg-[#e9f5ff] px-4 py-2 rounded-xl hover:bg-[#d0e9ff] transition-all disabled:cursor-not-allowed disabled:opacity-50" onClick={openAttributeModal} disabled={!selectedCategory}>
                <span className="material-symbols-outlined text-sm">add</span> Thêm quy tắc
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {!selectedCategory ? (
                <div className="h-full flex flex-col items-center justify-center text-[#707882]">
                  <span className="material-symbols-outlined text-6xl opacity-20 mb-4">account_tree</span>
                  <p className="font-medium">Chọn một danh mục để xem thuộc tính</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-2xl border border-[#e1f0fb] bg-[#f8fbff] px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#707882]">Selected category</p>
                      <p className="mt-1 text-sm font-bold text-[#0f1d25]">{selectedCategory.name}</p>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-xl border border-[#d6e7f6] bg-white px-4 py-2 text-sm font-semibold text-[#00629d] transition-all hover:bg-[#f5faff]"
                      onClick={() => openEditCategoryModal(selectedCategory)}
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit category
                    </button>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-4 gap-4 px-4 py-2 text-[10px] font-bold text-[#707882] uppercase tracking-widest bg-[#f5faff] rounded-lg">
                    <span>Tên thuộc tính</span>
                    <span>Kiểu dữ liệu</span>
                    <span>Bắt buộc</span>
                    <span className="text-right">Thao tác</span>
                  </div>

                  {attributes.map(attr => (
                    <div key={attr.id} className="rounded-2xl border border-[#edf5fb] px-4 py-4 transition-colors hover:bg-[#fcfdfe]">
                      <div className="grid grid-cols-4 gap-4 items-start">
                      <div>
                        <p className="font-bold text-[#0f1d25]">{attr.name}</p>
                        {attr.options && attr.options.length > 0 && (
                          <p className="text-[10px] text-[#707882] mt-1">{attr.options.length} tùy chọn khả dụng</p>
                        )}
                      </div>
                      <div>
                        <span className="px-3 py-1 bg-[#e9f5ff] text-[#00629d] text-[10px] font-black rounded-lg uppercase">
                          {attr.input_type}
                        </span>
                      </div>
                      <div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${attr.is_required ? 'bg-[#00629d] text-white' : 'border-2 border-[#e1f0fb] text-[#707882]'}`}>
                          <span className="material-symbols-outlined text-[10px] font-bold">
                            {attr.is_required ? 'check' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button type="button" className="rounded-lg bg-[#f5faff] px-3 py-2 text-xs font-semibold text-[#00629d] transition-all hover:bg-[#00629d] hover:text-white" onClick={() => openEditAttributeModal(attr)}>
                          Edit
                        </button>
                        <button type="button" className="rounded-lg bg-[#fff5f5] px-3 py-2 text-xs font-semibold text-[#ba1a1a] transition-all hover:bg-[#ba1a1a] hover:text-white" onClick={() => handleDeleteAttribute(attr)}>
                          Remove
                        </button>
                      </div>
                      </div>

                      <div className="mt-4 border-t border-[#edf5fb] pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#707882]">Attribute options</p>
                        {attr.options && attr.options.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attr.options.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center gap-2 rounded-full border border-[#d6e7f6] bg-[#f8fbff] px-3 py-2 text-xs text-[#0f1d25]"
                              >
                                <span>{option.value_name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-[#707882]">
                            {supportsAttributeOptions(attr.input_type, attr.options)
                              ? 'No options yet. Open Edit to manage values in the dialog.'
                              : 'This input type does not use attribute options.'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Attribute Placeholder */}
                  <button
                    type="button"
                    className="w-full border-2 border-dashed border-[#e1f0fb] rounded-[24px] p-6 flex flex-col items-center justify-center text-[#707882] hover:border-[#00629d] hover:bg-[#e9f5ff]/20 transition-all cursor-pointer group"
                    onClick={openAttributeModal}
                  >
                    <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">post_add</span>
                    <p className="text-sm font-semibold">Tao them thuoc tinh moi cho {selectedCategory.name}</p>
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-[#f5faff] border-t border-[#e1f0fb]">
              <div className="bg-[#00629d] bg-opacity-5 rounded-2xl p-4 flex gap-4 items-center border border-[#00629d] border-opacity-10">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#00629d] shadow-sm">
                  <span className="material-symbols-outlined">lightbulb</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#00629d]">Mẹo Quản lý</p>
                  <p className="text-[10px] text-[#707882]">Kế thừa thuộc tính: Các danh mục con sẽ tự động kế thừa bộ thuộc tính của danh mục cha. Bạn có thể thêm các thuộc tính đặc thù riêng cho từng cấp con.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl shadow-[#0f1d25]/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#0f1d25]">{editingCategory ? 'Edit category' : 'Create category'}</h3>
                <p className="mt-1 text-sm text-[#707882]">
                  {editingCategory
                    ? 'Update the category name and settings here. Parent stays unchanged in edit mode.'
                    : 'This posts to the admin category endpoint and refreshes the tree after save.'}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5faff] text-[#707882]"
                onClick={closeCategoryModal}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleCategorySubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Name</span>
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Example: Electronics"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Slug (optional)</span>
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.slug}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="electronics"
                  />
                </label>

                {editingCategory ? (
                  <div className="rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] px-4 py-3 text-sm text-[#4b6472] md:col-span-2">
                    Parent category remains{' '}
                    <span className="font-semibold text-[#0f1d25]">
                      {selectedParentCategories.length > 0
                        ? selectedParentCategories.map((category) => category.name).join(' / ')
                        : 'Root level'}
                    </span>{' '}
                    while editing this category.
                  </div>
                ) : (
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#0f1d25]">Parent category</span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#00629d] hover:underline"
                        onClick={() => {
                          setParentSelectionPath([]);
                          setCategoryForm((prev) => ({ ...prev, parent_id: '' }));
                        }}
                      >
                        Set as root
                      </button>
                    </div>

                    <div className="rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#707882]">Choose level by level</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {parentSelectionLevels.map((levelCategories, levelIndex) => (
                          <label key={`parent-level-${levelIndex}`} className="space-y-2">
                            <span className="text-xs font-semibold text-[#4b6472]">
                              Level {levelIndex + 1}
                            </span>
                            <select
                              className="w-full rounded-2xl border border-[#d6e7f6] bg-white px-4 py-3 outline-none transition focus:border-[#00629d]"
                              value={parentSelectionPath[levelIndex]?.toString() ?? ''}
                              onChange={(event) => handleParentLevelChange(levelIndex, event.target.value)}
                            >
                              <option value="">
                                {levelIndex === 0 ? 'No parent (root category)' : `Stop at level ${levelIndex}`}
                              </option>
                              {levelCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[#4b6472]">
                        <span className="font-semibold text-[#0f1d25]">Selected parent:</span>{' '}
                        {selectedParentCategories.length > 0
                          ? selectedParentCategories.map((category) => category.name).join(' / ')
                          : 'Root level'}
                      </div>
                    </div>
                  </div>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Sort order</span>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.sort_order}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Icon URL (optional)</span>
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.icon_url}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, icon_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl bg-[#f5faff] px-4 py-3 text-sm text-[#0f1d25]">
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Active category
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-2xl border border-[#d6e7f6] px-5 py-3 font-semibold text-[#4b6472]"
                  onClick={closeCategoryModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#00629d] px-5 py-3 font-semibold text-white transition hover:bg-[#005183] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submittingCategory}
                >
                  {submittingCategory ? 'Saving...' : editingCategory ? 'Save changes' : 'Create category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAttributeModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl shadow-[#0f1d25]/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#0f1d25]">{isEditingAttribute ? 'Edit attribute' : 'Create attribute'}</h3>
                <p className="mt-1 text-sm text-[#707882]">
                  {isEditingAttribute
                    ? 'Update the attribute definition and its attached values in one dialog.'
                    : 'Create the attribute definition and add its values in one dialog.'}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5faff] text-[#707882]"
                onClick={closeAttributeModal}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleAttributeSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Name</span>
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={attributeForm.name}
                    onChange={(event) => setAttributeForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Example: Brand"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Input type</span>
                  <select
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={attributeForm.input_type}
                    onChange={(event) => handleAttributeTypeChange(event.target.value)}
                  >
                    <option value="radio">radio</option>
                    <option value="text">text</option>
                    <option value="textarea">textarea</option>
                    <option value="number">number</option>
                    <option value="select">select</option>
                    <option value="checkbox">checkbox</option>
                    <option value="multiselect">multiselect</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Sort order</span>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={attributeForm.sort_order}
                    onChange={(event) => setAttributeForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-[#f5faff] px-4 py-3 text-sm text-[#0f1d25] md:mt-8">
                  <input
                    type="checkbox"
                    checked={attributeForm.is_required}
                    onChange={(event) => setAttributeForm((prev) => ({ ...prev, is_required: event.target.checked }))}
                  />
                  Required field
                </label>

                {showOptionSection && (
                  <div className="space-y-3 rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] p-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0f1d25]">Value options</p>
                        <p className="text-xs text-[#707882]">Add the values buyers can pick for this attribute.</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#00629d] border border-[#d6e7f6] transition hover:bg-[#e9f5ff]"
                        onClick={handleAddAttributeOptionField}
                      >
                        Add value
                      </button>
                    </div>

                    <div className="space-y-3">
                      {attributeOptions.map((option, index) => (
                        <div key={option.id ?? `new-option-${index}`} className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#00629d] border border-[#d6e7f6]">
                            {index + 1}
                          </div>
                          <input
                            className="flex-1 rounded-2xl border border-[#d6e7f6] bg-white px-4 py-3 outline-none transition focus:border-[#00629d]"
                            value={option.value_name}
                            onChange={(event) => handleAttributeOptionChange(index, event.target.value)}
                            placeholder={`Value ${index + 1}`}
                          />
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ffd9d6] bg-white text-[#ba1a1a] transition hover:bg-[#fff0ef]"
                            onClick={() => handleRemoveAttributeOptionField(index)}
                            disabled={attributeOptions.length === 1}
                            title={attributeOptions.length === 1 ? 'At least one value is required' : 'Remove value'}
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-2xl border border-[#d6e7f6] px-5 py-3 font-semibold text-[#4b6472]"
                  onClick={closeAttributeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#00629d] px-5 py-3 font-semibold text-white transition hover:bg-[#005183] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submittingAttribute}
                >
                  {submittingAttribute ? 'Saving...' : isEditingAttribute ? 'Save changes' : 'Create attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e1f0fb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00629d;
        }
      `}</style>
    </AdminLayout>
  );
};

const getResponseError = async (response: Response, fallbackMessage: string) => {
  const clone = response.clone();

  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }
  } catch {
    // Ignore JSON parsing failures and fall back to plain text.
  }

  try {
    const text = await clone.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore text parsing failures and use the fallback message.
  }

  return fallbackMessage;
};

export default CategoryManagement;


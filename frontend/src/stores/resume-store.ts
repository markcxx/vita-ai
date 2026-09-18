import { toast } from 'sonner';
import { resumeAvatar } from '@/lib/resume/avatar-defaults';
import { create } from 'zustand';
import type { Resume, ResumeSection, SectionContent } from '@/types/resume';
import { AUTOSAVE_DELAY } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settings-store';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';

interface ResumeStore {
  currentResume: Resume | null;
  sections: ResumeSection[];
  isDirty: boolean;
  isSaving: boolean;
  _saveTimeout: ReturnType<typeof setTimeout> | null;

  setResume: (resume: Resume) => void;
  updateSection: (sectionId: string, content: Partial<SectionContent>) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  addSection: (section: ResumeSection) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sections: ResumeSection[]) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  setTemplate: (template: string) => void;
  setTitle: (title: string) => void;
  save: () => Promise<void>;
  _scheduleSave: () => void;
  reset: () => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  currentResume: null,
  sections: [],
  isDirty: false,
  isSaving: false,
  _saveTimeout: null,

  setResume: (resume) => {
    // Cancel any pending autosave to prevent stale data overwriting server changes (e.g., from AI tool calls)
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    // Normalize section content into the shape the renderers expect. Beyond adding
    // missing item/category ids, this coerces list fields (highlights/technologies/
    // skills) back into arrays so a resume that the AI corrupted (issue #87) can be
    // opened and repaired instead of crashing the editor on render.
    const sections = (resume.sections || []).map((s) => ({
      ...s,
      content: {
        ...normalizeSectionContent(s.type, s.content),
        ...(s.type === 'personal_info' ? { avatar: resumeAvatar(s.content?.avatar) } : {}),
      } as typeof s.content,
    }));

    set({
      currentResume: { ...resume, sections },
      sections,
      isDirty: false,
      _saveTimeout: null,
    });
  },

  updateSection: (sectionId, content) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, content: { ...s.content, ...content } as SectionContent } : s
      );
      return {
        sections,
        currentResume: state.currentResume ? { ...state.currentResume, sections } : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  updateSectionTitle: (sectionId, title) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, title } : s
      );
      return {
        sections,
        currentResume: state.currentResume ? { ...state.currentResume, sections } : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  addSection: (section) => {
    set((state) => {
      const sections = [...state.sections, section];
      return {
        sections,
        currentResume: state.currentResume ? { ...state.currentResume, sections } : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  removeSection: (sectionId) => {
    set((state) => {
      const sections = state.sections.filter((s) => s.id !== sectionId);
      return {
        sections,
        currentResume: state.currentResume ? { ...state.currentResume, sections } : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  reorderSections: (sections) => {
    set((state) => ({
      sections,
      currentResume: state.currentResume ? { ...state.currentResume, sections } : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  toggleSectionVisibility: (sectionId) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      );
      return {
        sections,
        currentResume: state.currentResume ? { ...state.currentResume, sections } : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  setTemplate: (template) => {
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, template }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  setTitle: (title) => {
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, title }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  save: async () => {
    const { currentResume, sections, isDirty } = get();
    if (!currentResume || !isDirty || get().isSaving) return;
    let saved = false;

    set({ isSaving: true });
    try {


      const response = await fetch(`/api/resume/${currentResume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          expectedVersion: currentResume.version,
          title: currentResume.title,
          template: currentResume.template,
          themeConfig: currentResume.themeConfig,
          sections: sections.map((s, i) => ({
            id: s.id,
            type: s.type,
            title: s.title,
            sortOrder: i,
            visible: s.visible,
            content: s.content,
          })),
        }),
      });

      if (!response.ok) throw new Error(response.status === 409 ? '简历已在其他页面更新，请刷新后重试，避免覆盖修改' : '简历保存失败，请检查网络后重试');
      const result = await response.json();
      saved = true;
      if (get().currentResume?.id === currentResume.id) {
        set(state => ({
          isDirty: state.currentResume !== currentResume || state.sections !== sections,
          currentResume: state.currentResume ? { ...state.currentResume, version: result.version } : null,
        }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '简历保存失败，请重试');
    } finally {
      set({ isSaving: false });
      if (saved && get().isDirty && get().currentResume?.id === currentResume.id) get()._scheduleSave();
    }
  },

  _scheduleSave: () => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    const { autoSave, autoSaveInterval, _hydrated } = useSettingsStore.getState();

    // If settings are hydrated and autoSave is off, only mark dirty, don't auto-save
    if (_hydrated && !autoSave) {
      set({ _saveTimeout: null });
      return;
    }

    const delay = _hydrated ? autoSaveInterval : AUTOSAVE_DELAY;
    const timeout = setTimeout(() => {
      get().save();
    }, delay);

    set({ _saveTimeout: timeout });
  },

  reset: () => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);
    set({
      currentResume: null,
      sections: [],
      isDirty: false,
      isSaving: false,
      _saveTimeout: null,
    });
  },
}));

'use client';

import { CredentialsSettings } from './credentials-settings';
import { useEffect } from 'react';
import { getCopy } from '@/lib/copy';
import { useTheme } from 'next-themes';
import { Settings, Paintbrush, PenTool, Sun, Moon, Monitor } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { setPreference } from '@/lib/user-preferences';

export function SettingsDialog() {
  const t = getCopy('settings');
  const { theme: currentTheme, setTheme } = useTheme();
  const { activeModal, closeModal, settingsTab, setSettingsTab } = useUIStore();
  const {
    autoSave,
    autoSaveInterval,
    setAutoSave,
    setAutoSaveInterval,
    hydrate,
    _hydrated,
  } = useSettingsStore();

  const isOpen = activeModal === 'settings';

  useEffect(() => {
    if (isOpen && !_hydrated) {
      hydrate();
    }
  }, [isOpen, _hydrated, hydrate]);

  const handleThemeChange = (theme: string) => {
    setTheme(theme);
    setPreference('theme', theme);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-500" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="mt-4">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="appearance" className="flex-1 gap-1.5 cursor-pointer">
                <Paintbrush className="h-3.5 w-3.5" />
                {t('appearance.title')}
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex-1 gap-1.5 cursor-pointer">
                <PenTool className="h-3.5 w-3.5" />
                {t('editorTab.title')}
              </TabsTrigger>
              <TabsTrigger value="credentials" className="flex-1 cursor-pointer">模型与语音</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="credentials" className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4"><CredentialsSettings /></TabsContent>
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="px-6 pb-6 pt-4 space-y-5">
            {/* Theme */}
            <div className="space-y-3">
              <Label>{t('appearance.theme')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', icon: Sun, label: t('appearance.themeLight') },
                  { value: 'dark', icon: Moon, label: t('appearance.themeDark') },
                  { value: 'system', icon: Monitor, label: t('appearance.themeSystem') },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleThemeChange(value)}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                      currentTheme === value
                        ? 'border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="px-6 pb-6 pt-4 space-y-5">
            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('editorTab.autoSave')}</Label>
                <p className="text-xs text-zinc-400">{t('editorTab.autoSaveDescription')}</p>
              </div>
              <Switch
                checked={autoSave}
                onCheckedChange={setAutoSave}
              />
            </div>

            <Separator />

            {/* Auto Save Interval */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('editorTab.autoSaveInterval')}</Label>
                <span className="text-sm text-zinc-500">
                  {(autoSaveInterval / 1000).toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[autoSaveInterval]}
                onValueChange={([v]) => setAutoSaveInterval(v)}
                min={300}
                max={5000}
                step={100}
                disabled={!autoSave}
              />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>0.3s</span>
                <span>5.0s</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

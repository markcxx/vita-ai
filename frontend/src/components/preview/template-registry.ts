import { ReferenceTemplate } from './templates/reference';
import { isReferenceTemplate } from '@/lib/reference-templates';
import { createElement, type ComponentType } from 'react';
import type { Resume } from '@/types/resume';
import { AcademicTemplate } from './templates/academic';
import { ArchitectTemplate } from './templates/architect';
import { ArtisticTemplate } from './templates/artistic';
import { AtsTemplate } from './templates/ats';
import { BerlinTemplate } from './templates/berlin';
import { BlocksTemplate } from './templates/blocks';
import { BoldTemplate } from './templates/bold';
import { CardTemplate } from './templates/card';
import { ClassicTemplate } from './templates/classic';
import { CleanTemplate } from './templates/clean';
import { CoderTemplate } from './templates/coder';
import { CompactTemplate } from './templates/compact';
import { ConsultantTemplate } from './templates/consultant';
import { CorporateTemplate } from './templates/corporate';
import { CreativeTemplate } from './templates/creative';
import { DesignerTemplate } from './templates/designer';
import { DeveloperTemplate } from './templates/developer';
import { ElegantTemplate } from './templates/elegant';
import { EngineerTemplate } from './templates/engineer';
import { EuroTemplate } from './templates/euro';
import { ExecutiveTemplate } from './templates/executive';
import { FinanceTemplate } from './templates/finance';
import { FormalTemplate } from './templates/formal';
import { GradientTemplate } from './templates/gradient';
import { InfographicTemplate } from './templates/infographic';
import { JapaneseTemplate } from './templates/japanese';
import { LegalTemplate } from './templates/legal';
import { LuxeTemplate } from './templates/luxe';
import { MagazineTemplate } from './templates/magazine';
import { MaterialTemplate } from './templates/material';
import { MedicalTemplate } from './templates/medical';
import { MetroTemplate } from './templates/metro';
import { MinimalTemplate } from './templates/minimal';
import { ModernTemplate } from './templates/modern';
import { MosaicTemplate } from './templates/mosaic';
import { NeonTemplate } from './templates/neon';
import { NordicTemplate } from './templates/nordic';
import { ProfessionalTemplate } from './templates/professional';
import { RetroTemplate } from './templates/retro';
import { RibbonTemplate } from './templates/ribbon';
import { RoseTemplate } from './templates/rose';
import { ScientistTemplate } from './templates/scientist';
import { SidebarTemplate } from './templates/sidebar';
import { StartupTemplate } from './templates/startup';
import { SwissTemplate } from './templates/swiss';
import { TeacherTemplate } from './templates/teacher';
import { TimelineTemplate } from './templates/timeline';
import { TwoColumnTemplate } from './templates/two-column';
import { WatercolorTemplate } from './templates/watercolor';
import { ZigzagTemplate } from './templates/zigzag';

type PreviewTemplate = ComponentType<{ resume: Resume }>;

const previewTemplates: Record<string, PreviewTemplate> = {
  academic: AcademicTemplate,
  architect: ArchitectTemplate,
  artistic: ArtisticTemplate,
  ats: AtsTemplate,
  berlin: BerlinTemplate,
  blocks: BlocksTemplate,
  bold: BoldTemplate,
  card: CardTemplate,
  classic: ClassicTemplate,
  clean: CleanTemplate,
  coder: CoderTemplate,
  compact: CompactTemplate,
  consultant: ConsultantTemplate,
  corporate: CorporateTemplate,
  creative: CreativeTemplate,
  designer: DesignerTemplate,
  developer: DeveloperTemplate,
  elegant: ElegantTemplate,
  engineer: EngineerTemplate,
  euro: EuroTemplate,
  executive: ExecutiveTemplate,
  finance: FinanceTemplate,
  formal: FormalTemplate,
  gradient: GradientTemplate,
  infographic: InfographicTemplate,
  japanese: JapaneseTemplate,
  legal: LegalTemplate,
  luxe: LuxeTemplate,
  magazine: MagazineTemplate,
  material: MaterialTemplate,
  medical: MedicalTemplate,
  metro: MetroTemplate,
  minimal: MinimalTemplate,
  modern: ModernTemplate,
  mosaic: MosaicTemplate,
  neon: NeonTemplate,
  nordic: NordicTemplate,
  professional: ProfessionalTemplate,
  retro: RetroTemplate,
  ribbon: RibbonTemplate,
  rose: RoseTemplate,
  scientist: ScientistTemplate,
  sidebar: SidebarTemplate,
  startup: StartupTemplate,
  swiss: SwissTemplate,
  teacher: TeacherTemplate,
  timeline: TimelineTemplate,
  'two-column': TwoColumnTemplate,
  watercolor: WatercolorTemplate,
  zigzag: ZigzagTemplate,
};

export function renderPreviewTemplate(template: string, resume: Resume) {
  if (isReferenceTemplate(template)) return createElement(ReferenceTemplate, { resume });
  return createElement(previewTemplates[template] || ClassicTemplate, { resume });
}

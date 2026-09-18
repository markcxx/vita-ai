type FieldConstraint = {
  label: string;
  options: readonly string[];
};

export const resumeFieldConstraints = {
  personal_info: {
    gender: { label: '性别', options: ['男', '女'] },
    politicalStatus: {
      label: '政治面貌',
      options: ['群众', '共青团员', '中共预备党员', '中共党员', '民主党派'],
    },
    ethnicity: {
      label: '民族',
      options: [
        '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
        '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
        '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族',
        '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族',
        '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族',
        '保安族', '裕固族', '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族',
        '基诺族',
      ],
    },
    maritalStatus: { label: '婚姻状态', options: ['未婚', '已婚', '离异'] },
    educationLevel: {
      label: '最高学历',
      options: ['初中', '高中', '中专', '大专', '本科', '硕士', '博士', '博士后'],
    },
  },
} as const satisfies Record<string, Record<string, FieldConstraint>>;

export type PersonalInfoConstrainedField = keyof typeof resumeFieldConstraints.personal_info;

function getConstraint(sectionType: string, field: string): FieldConstraint | undefined {
  const sectionConstraints = resumeFieldConstraints[
    sectionType as keyof typeof resumeFieldConstraints
  ] as Record<string, FieldConstraint> | undefined;
  return sectionConstraints?.[field];
}

export function getResumeFieldOptions(
  sectionType: 'personal_info',
  field: PersonalInfoConstrainedField,
): readonly string[] {
  return resumeFieldConstraints[sectionType][field].options;
}

export function isValidResumeFieldValue(sectionType: string, field: string, value: unknown) {
  const constraint = getConstraint(sectionType, field);
  if (!constraint) return true;
  return typeof value === 'string' && constraint.options.includes(value);
}

export function getResumeFieldConstraintsPrompt() {
  return Object.entries(resumeFieldConstraints)
    .flatMap(([sectionType, fields]) => Object.entries(fields).map(([field, constraint]) => (
      `- ${sectionType}.${field}（${constraint.label}）：${constraint.options.join('、')}`
    )))
    .join('\n');
}

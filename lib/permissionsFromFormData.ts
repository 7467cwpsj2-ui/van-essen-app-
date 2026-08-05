import { MODULE_KEYS, type Permissions } from "@/types/database";

// Leest de perm_<module>-checkboxes uit een uitnodigingsformulier. Een
// afwezige checkbox in FormData betekent "uitgevinkt".
export function permissionsFromFormData(formData: FormData): Permissions {
  return Object.fromEntries(MODULE_KEYS.map((key) => [key, formData.get(`perm_${key}`) === "on"])) as Permissions;
}

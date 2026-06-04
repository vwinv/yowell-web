<script setup lang="ts">
import type { AppModulePermission } from "@yowell/shared";
import { MODULE_PERMISSION_OPTIONS } from "@yowell/shared";

const model = defineModel<AppModulePermission[]>({ required: true });

function isChecked(value: AppModulePermission) {
  return model.value.includes(value);
}

function toggle(value: AppModulePermission, checked: boolean) {
  if (checked) {
    if (!model.value.includes(value)) {
      model.value = [...model.value, value];
    }
    return;
  }
  model.value = model.value.filter((entry) => entry !== value);
}
</script>

<template>
  <fieldset class="permission-checkboxes">
    <legend class="permission-checkboxes__legend">Droits par module</legend>
    <p class="permission-checkboxes__hint">
      Cumul possible — sans case cochée, l'utilisateur consulte tout en lecture seule.
    </p>
    <label
      v-for="option in MODULE_PERMISSION_OPTIONS"
      :key="option.value"
      class="permission-checkboxes__item"
    >
      <input
        type="checkbox"
        :checked="isChecked(option.value)"
        @change="toggle(option.value, ($event.target as HTMLInputElement).checked)"
      />
      <span>
        <strong>{{ option.label }}</strong>
        <span class="permission-checkboxes__desc">{{ option.description }}</span>
      </span>
    </label>
  </fieldset>
</template>

<style scoped>
.permission-checkboxes {
  margin: 0;
  padding: 0;
  border: none;
  display: grid;
  gap: 0.65rem;
}

.permission-checkboxes__legend {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.permission-checkboxes__hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted, #71717a);
}

.permission-checkboxes__item {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  cursor: pointer;
}

.permission-checkboxes__item strong {
  display: block;
}

.permission-checkboxes__desc {
  display: block;
  font-size: 0.82rem;
  color: var(--muted, #71717a);
  font-weight: 400;
}
</style>

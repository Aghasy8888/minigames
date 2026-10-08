import { setTextFieldDisabled } from '../components/text-field';

export type FieldValues = Readonly<Record<string, string>>;

export type FieldValidator = (value: string, values: FieldValues) => string | undefined;

export interface ValidatedField {
  input: HTMLInputElement;
  validate: FieldValidator;
  /** Other fields whose result depends on this one, re-validated whenever it changes. */
  revalidates?: readonly string[];
}

export interface FormValidationOptions {
  form: HTMLFormElement;
  fields: Readonly<Record<string, ValidatedField>>;
  submit: HTMLButtonElement;
  onFieldError: (input: HTMLInputElement, message?: string) => void;
  onValid?: (values: FieldValues) => void;
}

export interface FormValidation {
  reset: () => void;
  setBusy: (busy: boolean) => void;
}

const FIELD_EVENTS = ['input', 'change', 'blur'] as const;

/**
 * Validates on input / change / blur. Errors show once a field is touched; the submit button
 * stays disabled until every field is valid, touched or not.
 */
export function useFormValidation(options: FormValidationOptions): FormValidation {
  const { form, fields, submit, onFieldError, onValid } = options;
  const entries = Object.entries(fields);
  const touched = new Set<string>();
  let busy = false;

  function readValues(): FieldValues {
    return Object.fromEntries(entries.map(([name, { input }]) => [name, input.value]));
  }

  function errorFor(name: string, values: FieldValues): string | undefined {
    const field = fields[name];
    return field?.validate(values[name] ?? '', values);
  }

  function showError(name: string, values: FieldValues): void {
    const field = fields[name];

    if (field && touched.has(name)) {
      onFieldError(field.input, errorFor(name, values));
    }
  }

  function updateSubmit(values: FieldValues): void {
    if (busy) {
      submit.disabled = true;
      return;
    }

    submit.disabled = entries.some(([name]) => errorFor(name, values) !== undefined);
  }

  function handleFieldEvent(name: string, revalidates: readonly string[]): void {
    if (busy) {
      return;
    }

    touched.add(name);
    const values = readValues();

    showError(name, values);

    for (const dependent of revalidates) {
      showError(dependent, values);
    }

    updateSubmit(values);
  }

  for (const [name, { input, revalidates = [] }] of entries) {
    for (const type of FIELD_EVENTS) {
      input.addEventListener(type, () => {
        handleFieldEvent(name, revalidates);
      });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    const values = readValues();

    if (entries.some(([name]) => errorFor(name, values) !== undefined)) {
      return;
    }

    onValid?.(values);
  });

  function reset(): void {
    form.reset();
    touched.clear();

    for (const [, { input }] of entries) {
      onFieldError(input);
    }

    updateSubmit(readValues());
  }

  function setBusy(next: boolean): void {
    busy = next;
    form.setAttribute('aria-busy', String(next));

    for (const [, { input }] of entries) {
      setTextFieldDisabled(input, next);
    }

    updateSubmit(readValues());
  }

  submit.disabled = true;

  return { reset, setBusy };
}

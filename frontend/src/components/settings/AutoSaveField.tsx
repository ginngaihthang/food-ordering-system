import {  useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface AutoSaveFieldProps {
  id: string;
  value: string;
  /** Resolves to true if the value was saved */
  onSave: (value: string) => Promise<boolean>;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  required?: boolean;
}

// Saves when you click away (or press Enter), and only if the value changed
export function AutoSaveField({
  id,
  value,
  onSave,
  placeholder,
  maxLength,
  multiline = false,
  required = false,
}: AutoSaveFieldProps) {
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  async function commit() {
    const trimmed = draft.trim();

    if (trimmed === value) {
      setDraft(trimmed);
      return;
    }
    if (required && !trimmed) {
      setDraft(value); // can't be empty, so put the old value back
      return;
    }

    const saved = await onSave(trimmed);
    if (!saved) setDraft(value); // roll back if the server refused
  }

  if (multiline) {
    return (
      <Textarea
        id={id}
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="resize-none"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    );
  }

  return (
    <Input
      id={id}
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
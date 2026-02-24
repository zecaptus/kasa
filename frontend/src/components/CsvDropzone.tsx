import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';

interface CsvDropzoneProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  error?: string | null;
}

export function CsvDropzone({ onUpload, isUploading = false, error }: CsvDropzoneProps) {
  const intl = useIntl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    onUpload(file);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="w-full">
      <button
        type="button"
        aria-label={intl.formatMessage({ id: 'import.dropzone.label' })}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
          {
            'border-kasa-accent/60 bg-kasa-accent/5 dark:bg-kasa-accent/10': isDragging,
            'border-slate-300 bg-slate-50 hover:border-kasa-accent/40 hover:bg-kasa-accent/5 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-kasa-accent/40 dark:hover:bg-kasa-accent/10':
              !isDragging && !isUploading,
            'border-slate-200 bg-slate-100 cursor-not-allowed opacity-60 dark:border-slate-700 dark:bg-slate-800':
              isUploading,
            'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40': !!error,
          },
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        disabled={isUploading}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          className="sr-only"
          onChange={handleChange}
          disabled={isUploading}
          tabIndex={-1}
        />

        {isUploading ? (
          <>
            <div className="size-8 animate-spin rounded-full border-2 border-kasa-accent border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {intl.formatMessage({ id: 'import.dropzone.uploading' })}
            </p>
          </>
        ) : (
          <>
            <svg
              className="size-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-200 sm:text-base">
              {intl.formatMessage({ id: 'import.dropzone.label' })}
            </p>
            <p className="text-xs text-slate-400">
              {intl.formatMessage({ id: 'import.dropzone.hint' })}
            </p>
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

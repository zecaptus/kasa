import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { CsvDropzone } from '../../../src/components/CsvDropzone';
import enMessages from '../../../src/i18n/en.json';

function renderDropzone(props: Parameters<typeof CsvDropzone>[0]) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <CsvDropzone {...props} />
    </IntlProvider>,
  );
}

describe('CsvDropzone', () => {
  it('renders drop zone with label', () => {
    renderDropzone({ onUpload: vi.fn() });
    expect(screen.getByRole('button', { name: /drag and drop/i })).toBeDefined();
  });

  it('shows uploading state when isUploading=true', () => {
    renderDropzone({ onUpload: vi.fn(), isUploading: true });
    expect(screen.getByText(/uploading/i)).toBeDefined();
  });

  it('shows error message when error prop provided', () => {
    renderDropzone({ onUpload: vi.fn(), error: 'File too large' });
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('File too large')).toBeDefined();
  });

  it('calls onUpload when a file is selected via input', () => {
    const onUpload = vi.fn();
    renderDropzone({ onUpload });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Date;Libellé;Montant;Devise'], 'export.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('does not call onUpload when isUploading=true and zone is clicked', () => {
    const onUpload = vi.fn();
    renderDropzone({ onUpload, isUploading: true });
    const zone = screen.getByRole('button');
    fireEvent.click(zone);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('handles drag over event', () => {
    const onUpload = vi.fn();
    renderDropzone({ onUpload });
    const zone = screen.getByRole('button');

    fireEvent.dragOver(zone, { preventDefault: () => {} });
    expect(zone.className).toContain('border-kasa-accent/60');
  });

  it('handles drag leave event', () => {
    const onUpload = vi.fn();
    renderDropzone({ onUpload });
    const zone = screen.getByRole('button');

    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain('border-kasa-accent/60');
  });

  it('handles drop event with file', () => {
    const onUpload = vi.fn();
    renderDropzone({ onUpload });
    const zone = screen.getByRole('button');

    const file = new File(['Date;Libellé;Montant;Devise'], 'export.csv', { type: 'text/csv' });
    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(zone, { dataTransfer, preventDefault: () => {} });
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('handles input change with undefined file', () => {
    const onUpload = vi.fn();
    renderDropzone({ onUpload });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [] });
    fireEvent.change(input);

    expect(onUpload).not.toHaveBeenCalled();
  });
});

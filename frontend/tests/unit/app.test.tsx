import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app';

describe('App', () => {
  it('renders the Kasa heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Kasa' })).toBeDefined();
  });
});

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

// Test component that consumes the LanguageContext
function TestConsumer() {
  const { language, toggleLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="translated">{t('nav.signIn')}</span>
      <span data-testid="translated-common">{t('common.submit')}</span>
      <button onClick={toggleLanguage}>Toggle</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <TestConsumer />
    </LanguageProvider>
  );
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to English language', () => {
    renderWithProvider();

    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('translated')).toHaveTextContent('Sign In');
  });

  it('translates keys correctly in English', () => {
    renderWithProvider();

    expect(screen.getByTestId('translated-common')).toHaveTextContent('Submit');
  });

  it('toggles language from English to Hindi', () => {
    renderWithProvider();

    const toggleBtn = screen.getByRole('button', { name: /toggle/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('language')).toHaveTextContent('hi');
  });

  it('toggles language back from Hindi to English', () => {
    renderWithProvider();

    const toggleBtn = screen.getByRole('button', { name: /toggle/i });
    fireEvent.click(toggleBtn); // en -> hi
    fireEvent.click(toggleBtn); // hi -> en

    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('translated')).toHaveTextContent('Sign In');
  });

  it('persists language choice in localStorage', () => {
    renderWithProvider();

    const toggleBtn = screen.getByRole('button', { name: /toggle/i });
    fireEvent.click(toggleBtn);

    expect(localStorage.getItem('clinic-language')).toBe('hi');
  });

  it('restores language from localStorage', () => {
    localStorage.setItem('clinic-language', 'hi');

    renderWithProvider();

    expect(screen.getByTestId('language')).toHaveTextContent('hi');
  });

  it('falls back to key when translation is missing', () => {
    function MissingKeyConsumer() {
      const { t } = useLanguage();
      return <span data-testid="missing">{t('nonexistent.key')}</span>;
    }

    render(
      <LanguageProvider>
        <MissingKeyConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('missing')).toHaveTextContent('nonexistent.key');
  });

  it('throws error when useLanguage is used outside LanguageProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useLanguage must be used inside LanguageProvider');

    consoleSpy.mockRestore();
  });
});

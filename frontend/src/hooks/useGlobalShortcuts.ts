import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useGlobalShortcuts(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA';

      if (isInputFocused) return;

      // Tab navigation: 1-6 keys jump to tabs
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') { navigate('/editor');   return; }
        if (e.key === '2') { navigate('/practice'); return; }
        if (e.key === '3') { navigate('/flow');     return; }
        if (e.key === '4') { navigate('/recall');   return; }
        if (e.key === '5') { navigate('/stats');    return; }
        if (e.key === '6') { navigate('/import');   return; }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}

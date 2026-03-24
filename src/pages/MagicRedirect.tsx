import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function MagicRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Intet token fundet i linket.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-magic-token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          }
        );
        const result = await res.json();
        if (result.error) throw new Error(result.error);

        // Use verifyOtp to establish session directly — no redirect needed
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: result.type || 'magiclink',
        });
        if (otpError) throw otpError;

        navigate('/', { replace: true });
      } catch (e: any) {
        setError(e.message || 'Linket er ugyldigt eller udløbet.');
      }
    };

    verify();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-sm text-primary underline"
        >
          Gå til login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Logger ind…</p>
    </div>
  );
}
